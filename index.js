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

// REGISTRA O COMANDO /VERIFICAR QUANDO O BOT LIGA
client.once('ready', async () => {
    console.log(`🤖 Bot online com sucesso como: ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('verificar')
            .setDescription('Verifica sua conta do Roblox e atualiza seu nome e cargo no Discord')
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

// EVENTO DE BOAS-VINDAS (RODA QUANDO ALGUÉM ENTRA NO SERVIDOR)
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

// EVENTO DO COMANDO /VERIFICAR
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'verificar') {
        await interaction.deferReply({ ephemeral: true });

        const robloxNick = interaction.options.getString('nick');

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

            // 2. Busca os grupos e cargos do usuário
            const groupsResponse = await axios.get(`https://groups.roblox.com/v2/users/${robloxUserId}/groups/roles`);
            const userGroups = groupsResponse.data.data;

            // Encontra o seu grupo do Roblox
            const groupData = userGroups.find(g => g.group.id.toString() === ROBLOX_GROUP_ID.toString());

            // Se NÃO estiver no grupo, envia a mensagem personalizada
            if (!groupData) {
                return await interaction.editReply('❌ Você não está na comunidade. Entre e comece sua jornada!');
            }

            const cargoNome = groupData.role ? groupData.role.name : 'Membro';

            // 3. Altera o Apelido no Discord: [Cargo] Nick
            const novoApelido = `[${cargoNome}] ${robloxRealName}`;
            const apelidoFinal = novoApelido.length > 32 ? novoApelido.substring(0, 32) : novoApelido;
            await interaction.member.setNickname(apelidoFinal);

            // 4. Atribui o Cargo correspondente no Discord (se existir um cargo com nome idêntico)
            const cargoDiscord = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === cargoNome.toLowerCase());

            let mensagemCargo = '';
            if (cargoDiscord) {
                await interaction.member.roles.add(cargoDiscord);
                mensagemCargo = `\n🎖️ Cargo **${cargoDiscord.name}** adicionado!`;
            } else {
                mensagemCargo = `\n⚠️ Apelido atualizado, mas não encontrei o cargo \`${cargoNome}\` criado no Discord.`;
            }

            await interaction.editReply(`✅ **Verificado com sucesso!**\nSeu apelido foi alterado para: \`${apelidoFinal}\`${mensagemCargo}`);

        } catch (error) {
            console.error(error);
            if (error.code === 50013) {
                await interaction.editReply('❌ O bot não tem permissão para mudar seu apelido ou cargo. Verifique se o cargo do Bot está no **topo da lista** nas configurações de cargos do Discord!');
            } else {
                await interaction.editReply('❌ Ocorreu um erro ao tentar verificar sua conta no Roblox.');
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
