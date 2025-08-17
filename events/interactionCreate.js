module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return await interaction.reply({
                    content: '❌ Unknown command!',
                    flags: 64 // ephemeral flag
                });
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing slash command ${interaction.commandName}:`, error);
                
                const errorMessage = '❌ There was an error while executing this command!';
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: errorMessage,
                        flags: 64 // ephemeral flag
                    });
                } else {
                    await interaction.reply({
                        content: errorMessage,
                        flags: 64 // ephemeral flag
                    });
                }
            }
        }

        // Handle button interactions (for future features)
        if (interaction.isButton()) {
            // Handle button interactions here
            console.log(`Button interaction: ${interaction.customId}`);
        }

        // Handle select menu interactions (for future features)
        if (interaction.isStringSelectMenu()) {
            // Handle select menu interactions here
            console.log(`Select menu interaction: ${interaction.customId}`);
        }
    },
};
