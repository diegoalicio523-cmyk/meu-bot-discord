// Evento do comando /verificar
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');

        try {
            // 1. Busca o ID do usuário no Roblox
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

            // 2. Busca os grupos e patentes do usuário
            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            // Se NÃO estiver no grupo
            if (!groupData) {
                return await interaction.editReply('❌ Você não está na comunidade. Entre e comece sua jornada!');
            }

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';

            // 3. Altera o Apelido no Discord
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;
            await interaction.member.setNickname(apelidoFinal);

            // 4. Procura o Cargo no Discord com o mesmo nome da patente
            const cargoDiscord = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === cargoNome.toLowerCase());

            let mensagemCargo = '';
            if (cargoDiscord) {
                await interaction.member.roles.add(cargoDiscord);
                mensagemCargo = `\n🎖️ Cargo **${cargoDiscord.name}** adicionado!`;
            } else {
                mensagemCargo = `\n⚠️ Não encontrei um cargo no Discord com o nome exato \`${cargoNome}\`.`;
            }

            await interaction.editReply(`✅ **Verificado com sucesso!**\nSeu apelido foi alterado para: \`${apelidoFinal}\`${mensagemCargo}`);

        } catch (error) {
            console.error(error);
            if (error.code === 50013) {
                await interaction.editReply('❌ O bot não tem permissão para mudar seu apelido ou dar este cargo. O cargo do Bot precisa estar no **topo da lista** nas configurações de cargos do Discord!');
            } else {
                await interaction.editReply('❌ Ocorreu um erro ao tentar verificar sua conta no Roblox.');
            }
        }
    }
});
