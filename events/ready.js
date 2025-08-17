module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`🤖 Bot logged in as ${client.user.tag}!`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users`);
        
        // Set bot activity
        client.user.setActivity('Managing servers', { type: 'WATCHING' });
        
        // Log additional information
        console.log(`⚡ Bot is ready and operational!`);
        console.log(`🔗 Invite URL: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
    },
};
