const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { loadCommands } = require('./utils/commandLoader');
const { initDatabase } = require('./utils/database');
require('dotenv').config();

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// Create commands collection
client.commands = new Collection();

// Initialize application
async function initializeBot() {
    try {
        // Initialize database connection
        await initDatabase();
        console.log('✅ Database connected successfully');

        // Load commands
        const commands = await loadCommands(client);
        console.log(`✅ Loaded ${commands.length} commands`);

        // Register slash commands
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered successfully');

        // Load events
        const fs = require('fs');
        const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const event = require(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
        console.log(`✅ Loaded ${eventFiles.length} events`);

        // Login to Discord
        await client.login(process.env.BOT_TOKEN);
        
    } catch (error) {
        console.error('❌ Error initializing bot:', error);
        process.exit(1);
    }
}

// Start the bot
initializeBot();

// Export client for potential external use
module.exports = { client };