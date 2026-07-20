const { Client, GatewayIntentBits } = require('discord.js');

// Cria a instância do bot com as permissões (intents) básicas
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Evento que roda assim que o bot fica online
client.once('ready', () => {
    console.log(`🤖 Bot online com sucesso como: ${client.user.tag}!`);
});

// Exemplo simples de resposta a mensagens
client.on('messageCreate', (message) => {
    // Evita responder a outros bots
    if (message.author.bot) return;

    // Responde ao comando !ping
    if (message.content === '!ping') {
        message.reply('Pong! 🏓');
    }
});

// Conecta o bot usando a Variável de Ambiente configurada no Render
client.login(process.env.DISCORD_TOKEN);
