const fs = require('fs');
const path = require('path');

/**
 * Load all commands from the commands directory
 * @param {Client} client - Discord.js client instance
 * @returns {Array} Array of command data for slash command registration
 */
async function loadCommands(client) {
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    try {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            // Validate command structure
            if (!command.data || !command.execute) {
                console.warn(`⚠️  Command ${file} is missing required 'data' or 'execute' property`);
                continue;
            }
            
            // Set command in collection
            client.commands.set(command.data.name, command);
            
            // Add to commands array for slash command registration
            commands.push(command.data.toJSON());
            
            console.log(`✅ Loaded command: ${command.data.name}`);
        }
        
        console.log(`📦 Successfully loaded ${commands.length} commands`);
        return commands;
        
    } catch (error) {
        console.error('❌ Error loading commands:', error);
        return [];
    }
}

/**
 * Reload a specific command
 * @param {Client} client - Discord.js client instance
 * @param {string} commandName - Name of the command to reload
 * @returns {boolean} Success status
 */
function reloadCommand(client, commandName) {
    try {
        // Remove from require cache
        const commandPath = path.join(__dirname, '..', 'commands', `${commandName}.js`);
        delete require.cache[require.resolve(commandPath)];
        
        // Reload command
        const command = require(commandPath);
        
        if (!command.data || !command.execute) {
            console.warn(`⚠️  Command ${commandName} is missing required 'data' or 'execute' property`);
            return false;
        }
        
        client.commands.set(command.data.name, command);
        console.log(`🔄 Reloaded command: ${commandName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error reloading command ${commandName}:`, error);
        return false;
    }
}

module.exports = {
    loadCommands,
    reloadCommand
};
