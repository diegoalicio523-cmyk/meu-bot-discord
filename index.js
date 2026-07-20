const { Client, GatewayIntentBits, Partials, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// IDs DOS CANAIS DO DISCORD
const CANAL_BOAS_VINDAS_ID = '1528712355884695585';
const CANAL_SUPORTE_ID = '1528712356438212621';
const CANAL_INFORMACAO_ID = '1528712356438212624';

// ID DO GRUPO DO ROBLOX
const ROBLOX_GROUP_ID = '559892225';

// Map em memória para guardar os códigos gerados (ID do Discord -> Código)
const codigosVerificacao = new Map();

// 1. REGISTRA O COMANDO /VERIFICAR
client.once('ready', async () => {
    console.log(`🤖 Bot online com sucesso como: ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('verificar')
            .setDescription('Verifica sua conta do Roblox com código de segurança e atualiza seu nome/cargo')
            .addStringOption(option =>
                option.setName('nick')
                    .setDescription('Seu nome de usuário (nick) no Roblox')
                    .setRequired(true)
            )
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Registrando comando /verificar...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('✅ Comando /verificar registrado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comando Slash:', error);
    }
});

// 2. MENSAGEM DE BOAS-VINDAS
client.on('guildMemberAdd', async (member) => {
    const canal = member.guild.channels.cache.get(CANAL_BOAS_VINDAS_ID);
    if (!canal) return;

    const embedBoasVindas = new EmbedBuilder()
        .setColor('#0099ff')
        .setDescription(
            `Olá ${member}, seja muito bem-vindo(a)!\n\n` +
            `🛠️ **Precisa de suporte?**\n` +
            `Se você precisa de ajuda, temos um servidor exclusivo. Acesse o canal <#${CANAL_SUPORTE_ID}>, entre no servidor e selecione o suporte adequado à sua necessidade.\n\n` +
            `📚 **Quer acessar as informações do EB?**\n` +
            `Todas as informações essenciais estão disponíveis no canal <#${CANAL_INFORMACAO_ID}>. Não se esqueça de ler as regras para evitar possíveis penalizações.`
        )
        .setImage('https://media.discordapp.net/attachments/1481519817860190319/1509314330649428048/202605251830.gif?ex=6a5f4242&is=6a5df0c2&hm=ee657acc2ba4811956625bd1ae99a0dbfc496dab5e2905a32042fcfb028a1f18&=');

    canal.send({ content: `Boas-vindas, ${member}!`, embeds: [embedBoasVindas] });
});

// 3. COMANDO /VERIFICAR (COM CÓDIGO ALEATÓRIO E SISTEMA ANTI-BURLAR)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');
        const discordUserId = interaction.user.id;

        try {
            // A. Busca o ID do usuário no Roblox pelo Nick
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

            // B. Busca a Bio (Sobre) do perfil do Roblox
            const profileResponse = await axios.get(`https://users.roblox.com/v1/users/${robloxUserId}`);
            const userBio = profileResponse.data.description || '';

            // C. Checa o código aleatório
            let codigoEsperado = codigosVerificacao.get(discordUserId);

            if (!codigoEsperado || !userBio.includes(codigoEsperado)) {
                // Gera um novo código aleatório de 4 dígitos (ex: EB-7392)
                const novoCodigo = `EB-${Math.floor(1000 + Math.random() * 9000)}`;
                codigosVerificacao.set(discordUserId, novoCodigo);

                return await interaction.editReply(
                    `🔒 **Segurança do Servidor (Confirmação de Conta)**\n\n` +
                    `Para comprovar que a conta **${robloxRealName}** realmente pertence a você:\n\n` +
                    `1. Vá no seu Perfil do Roblox e edite a sua **Bio / Sobre**.\n` +
                    `2. Adicione este código exato no texto: \`${novoCodigo}\`\n` +
                    `3. Salve no Roblox e aperte no chat o comando \`/verificar ${robloxRealName}\` novamente!`
                );
            }

            // Se o código foi encontrado na Bio do Roblox, remove da memória e continua
            codigosVerificacao.delete(discordUserId);

            // D. Busca os cargos do usuário no seu Grupo do Roblox
            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            // Se a pessoa NÃO faz parte do grupo no Roblox
            if (!groupData) {
                return await interaction.editReply('❌ Você não está na comunidade. Entre no grupo do Roblox e comece sua jornada!');
            }

            // Pega a lista com todos os cargos cadastrados no Grupo do Roblox
            const groupRolesResponse = await axios.get(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/roles`);
            const todosOsCargosRoblox = groupRolesResponse.data.roles.map(r => r.name.toLowerCase());

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';

            // Trava opcional para proibir setar dono automático
            const cargosProtegidos = ['Dono', 'Fundador', 'Criador'];
            if (cargosProtegidos.includes(cargoNome)) {
                return await interaction.editReply('⚠️ Este cargo de alta administração exige verificação manual.');
            }

            // E. Altera o Apelido no Discord no formato [Patente] Nick
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;
            await interaction.member.setNickname(apelidoFinal);

            // F. Remove cargos antigos de patentes para não acumular
            const membro = interaction.member;
            const cargosParaRemover = membro.roles.cache.filter(role => 
                todosOsCargosRoblox.includes(role.name.toLowerCase()) && role.name.toLowerCase() !== cargoNome.toLowerCase()
            );

            if (cargosParaRemover.size > 0) {
                await membro.roles.remove(cargosParaRemover);
            }

            // G. Adiciona o cargo correto atual do Discord
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

client.login(process.env.DISCORD_TOKEN);
