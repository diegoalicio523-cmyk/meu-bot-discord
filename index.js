// Evento do comando /verificar
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');

        try {
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

            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            // Busca o grupo específico do usuário
            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            // Se NÃO estiver no grupo, envia a mensagem personalizada
            if (!groupData) {
                return await interaction.editReply('❌ Você não está na comunidade. Entre e comece sua jornada!');
            }

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;

            await interaction.member.setNickname(apelidoFinal);
            await interaction.editReply(`✅ **Verificado com sucesso!** Seu apelido foi alterado para: \`${apelidoFinal}\``);

        } catch (error) {
            console.error(error);
            if (error.code === 50013) {
                await interaction.editReply('❌ O bot não tem permissão para mudar seu apelido. O cargo do Bot precisa estar no **topo da lista** nas configurações do Discord!');
            } else {
                await interaction.editReply('❌ Ocorreu um erro ao tentar verificar sua conta no Roblox.');
            }
        }
    }
});
