// Map temporário para guardar os códigos de verificação gerados
const codigosVerificacao = new Map();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');
        const discordUserId = interaction.user.id;

        try {
            // 1. Busca o ID do usuário no Roblox pelo Nick
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

            // 2. Busca os dados do Perfil do Roblox para checar a bio/descrição
            const profileResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxUserId}`);
            const userBio = profileResponse.data.description || '';

            // 3. Checa se o usuário já tem um código pendente de verificação
            let codigoEsperado = codigosVerificacao.get(discordUserId);

            if (!codigoEsperado || !userBio.includes(codigoEsperado)) {
                // Gera um novo código único de 4 dígitos
                const novoCodigo = `EB-${Math.floor(1000 + Math.random() * 9000)}`;
                codigosVerificacao.set(discordUserId, novoCodigo);

                return await interaction.editReply(
                    `🔒 **Segurança do Servidor**\n` +
                    `Para comprovar que a conta **${robloxRealName}** é realmente sua:\n\n` +
                    `1. Acesse seu perfil no Roblox e edite o campo **Sobre / Bio**.\n` +
                    `2. Cole o seguinte código exato no perfil: \`${novoCodigo}\`\n` +
                    `3. Salve a alteração no Roblox e use o comando \`/verificar ${robloxRealName}\` novamente!`
                );
            }

            // 4. Se o código bateu na bio, remove o código do Map
            codigosVerificacao.delete(discordUserId);

            // 5. Verifica os grupos e patentes do usuário
            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            if (!groupData) {
                return await interaction.editReply('❌ Você não está na comunidade. Entre no grupo do Roblox e comece sua jornada!');
            }

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';

            // ⚠️ TRAVA EXTRA DE SEGURANÇA: Bloqueia cargos críticos de liderança automática
            const cargosProtegidos = ['Dono', 'Fundador', 'Criador'];
            if (cargosProtegidos.includes(cargoNome)) {
                return await interaction.editReply('⚠️ Este cargo exige verificação manual com os administradores.');
            }

            // 6. Atualiza o apelido no Discord
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;
            await interaction.member.setNickname(apelidoFinal);

            // 7. Sincroniza o cargo no Discord
            const cargoDiscord = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === cargoNome.toLowerCase());

            let mensagemCargo = '';
            if (cargoDiscord) {
                await interaction.member.roles.add(cargoDiscord);
                mensagemCargo = `\n🎖️ Cargo **${cargoDiscord.name}** adicionado!`;
            } else {
                mensagemCargo = `\n⚠️ Apelido atualizado, mas não encontrei o cargo \`${cargoNome}\` criado no Discord.`;
            }

            await interaction.editReply(`✅ **Identidade Confirmada e Verificado com Sucesso!**\nSeu apelido foi alterado para: \`${apelidoFinal}\`${mensagemCargo}`);

        } catch (error) {
            console.error(error);
            if (error.code === 50013) {
                await interaction.editReply('❌ O bot não tem permissão para mudar seu apelido/cargo. Suba o cargo do Bot no topo das configurações do Discord!');
            } else {
                await interaction.editReply('❌ Ocorreu um erro ao tentar verificar sua conta no Roblox.');
            }
        }
    }
});
