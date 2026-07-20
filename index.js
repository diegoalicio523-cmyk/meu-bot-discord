const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]       
}); 

// ID do seu canal de boas-vindas:
const CANAL_BOAS_VINDAS_ID = '1528712355884695585';

// IDs dos canais mencionados na mensagem:
const CANAL_SUPORTE_ID = '1528712356438212621';
const CANAL_INFORMACAO_ID = '1528712356438212624';

// Token do seu bot:
const TOKEN_DO_BOT = 'MTUxOTMyNjcyMDc0OTA4MDcxNw.G_Gy0i.vMtpn5j28e51-4xn65-UO-85OjYlKW1pHo4C_Q';

client.once('ready', () => {
    console.log(`🤖 Bot online com sucesso como ${client.user.tag}!`);
});

client.on('guildMemberAdd', async (member) => {
    const canal = member.guild.channels.cache.get(CANAL_BOAS_VINDAS_ID);

    if (!canal) {
        console.log("❌ Canal de boas-vindas não encontrado. Verifique o ID!");
        return;
    }

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

client.login(TOKEN_DO_BOT);
