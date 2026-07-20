const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ... (Restante do seu arquivo index.js)

// ---------------------------------------------------------
// 4. COMANDO /VERIFICAR (COM CÓDIGO ALEATÓRIO E LINK DO ROBLOX)
// ---------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');
        const discordUserId = interaction.user.id;

        try {
            // A. Busca ID no Roblox
            const userResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
                usernames: [robloxNick],
                excludeBannedUsers: true
            });

            if (!userResponse.data.data || userResponse.data.data.length === 0) {
                return await interaction.editReply(`❌ Usuário **${robloxNick}** não foi encontrado no Roblox.`);
            }

            const robloxUser = userResponse.data.data[0];
            const robloxUserId = robloxUser.id;
            const robloxRealName = robloxUser.name;

            // B. Busca Bio para checar código
            const profileResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxUserId}`);
            const userBio = profileResponse.data.description || '';

            let codigoEsperado = codigosVerificacao.get(discordUserId);

            if (!codigoEsperado || !userBio.includes(codigoEsperado)) {
                const novoCodigo = `EB-${Math.floor(1000 + Math.random() * 9000)}`;
                codigosVerificacao.set(discordUserId, novoCodigo);

                return await interaction.editReply(
                    `🔒 **Segurança do Servidor (Confirmação de Conta)**\n\n` +
                    `Para comprovar que a conta **${robloxRealName}** realmente pertence a você:\n\n` +
                    `1. Vá no seu Perfil do Roblox e edite a sua **Bio / Sobre**.\n` +
                    `2. Adicione este código exato no texto: \`${novoCodigo}\`\n` +
                    `3. Salve no Roblox e aperte o comando \`/verificar ${robloxRealName}\` no Discord novamente!`
                );
            }

            codigosVerificacao.delete(discordUserId);

            // C. Checa o grupo do Roblox
            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            // SE NÃO ESTIVER NO GRUPO DO ROBLOX:
            if (!groupData) {
                const botaoGrupo = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Entrar no Grupo do Roblox')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://www.roblox.com/share/g/559892225')
                );

                return await interaction.editReply({
                    content: '❌ **Você não está no grupo da nossa comunidade!**\n\nEntre no grupo através do link abaixo e tente se verificar novamente:',
                    components: [botaoGrupo]
                });
            }

            const groupRolesResponse = await axios.get(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/roles`);
            const todosOsCargosRoblox = groupRolesResponse.data.roles.map(r => r.name.toLowerCase());

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';

            const cargosProtegidos = ['Dono', 'Fundador', 'Criador'];
            if (cargosProtegidos.includes(cargoNome)) {
                return await interaction.editReply('⚠️ Este cargo de alta administração exige verificação manual.');
            }

            // D. Atualiza apelido
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;
            await interaction.member.setNickname(apelidoFinal);

            // E. Remove cargos antigos de patente
            const membro = interaction.member;
            const cargosParaRemover = membro.roles.cache.filter(role => 
                todosOsCargosRoblox.includes(role.name.toLowerCase()) && role.name.toLowerCase() !== cargoNome.toLowerCase()
            );

            if (cargosParaRemover.size > 0) {
                await membro.roles.remove(cargosParaRemover);
            }

            // F. Adiciona o cargo correto
            const cargoDiscord = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === cargoNome.toLowerCase());

            let mensagemCargo = '';
            if (cargoDiscord) {
                await membro.roles.add(cargoDiscord);
                mensagemCargo = `\n🎖️ Cargo **${cargoDiscord.name}** atualizado!`;
            } else {
                mensagemCargo = `\n⚠️ Apelido alterado, mas não encontrei um cargo chamado \`${cargoNome}\` no Discord.`;
            }

            await interaction.editReply(`✅ **Verificado com sucesso!**\nSeu apelido foi alterado para: \`${apelidoFinal}\`${mensagemCargo}`);

        } catch (error) {
            console.error(error);
            if (error.code === 50013) {
                await interaction.editReply('❌ Permissão negada! Certifique-se de arrastar o cargo do Bot para o **topo da lista** nas Configurações de Cargos do Discord!');
            } else {
                await interaction.editReply('❌ Ocorreu um erro ao tentar verificar sua conta no Roblox.');
            }
        }
    }
});
