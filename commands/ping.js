const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! and shows bot latency'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Pinging...'
        }).then(() => interaction.fetchReply());
        
        const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = interaction.client.ws.ping;
        
        await interaction.editReply(
            `🏓 **Pong!**\n` +
            `📡 **Roundtrip Latency:** ${roundtripLatency}ms\n` +
            `💗 **Websocket Heartbeat:** ${wsLatency}ms`
        );
    },

    // For prefix commands
    async executePrefix(message) {
        const sent = await message.reply('Pinging...');
        const roundtripLatency = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = message.client.ws.ping;
        
        await sent.edit(
            `🏓 **Pong!**\n` +
            `📡 **Roundtrip Latency:** ${roundtripLatency}ms\n` +
            `💗 **Websocket Heartbeat:** ${wsLatency}ms`
        );
    }
};
