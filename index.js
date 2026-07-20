const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Configuração completa de permissões para garantir leitura de mensagens
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

client.once('ready', () => {
    console.log(`🤖 Bot online com sucesso como: ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignora mensagens enviadas por bots
    if (message.author.bot) return;

    // Testa se a mensagem é exatamente !ping (não importa se maiúscula ou minúscula)
    if (message.content.toLowerCase() === '!ping') {
        await message.reply('Pong! 🏓');
    }
});

client.login(process.env.DISCORD_TOKEN);
