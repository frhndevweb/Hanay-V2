const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages from the channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check if user has permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You don\'t have permission to manage messages!',
                ephemeral: true
            });
        }

        // Check if bot has permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ I don\'t have permission to manage messages in this channel!',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');
        const target = interaction.options.getUser('target');

        // Defer reply since this might take some time
        await interaction.deferReply({ ephemeral: true });

        try {
            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ 
                limit: target ? 100 : amount 
            });

            let messagesToDelete;
            
            if (target) {
                // Filter messages by target user
                messagesToDelete = messages.filter(msg => 
                    msg.author.id === target.id && 
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000 // Less than 14 days old
                ).first(amount);
            } else {
                // Filter out messages older than 14 days (Discord limitation)
                messagesToDelete = messages.filter(msg => 
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                ).first(amount);
            }

            if (messagesToDelete.size === 0) {
                return await interaction.editReply({
                    content: '❌ No messages found to delete! Messages must be less than 14 days old.'
                });
            }

            // Delete messages
            if (messagesToDelete.size === 1) {
                // Delete single message
                await messagesToDelete.first().delete();
            } else {
                // Bulk delete multiple messages
                await interaction.channel.bulkDelete(messagesToDelete, true);
            }

            const deletedCount = messagesToDelete.size;
            const targetText = target ? ` from **${target.tag}**` : '';
            
            await interaction.editReply({
                content: `✅ Successfully deleted **${deletedCount}** message${deletedCount === 1 ? '' : 's'}${targetText}!`
            });

            // Log the action
            console.log(`${interaction.user.tag} purged ${deletedCount} messages in #${interaction.channel.name} (${interaction.guild.name})`);

        } catch (error) {
            console.error('Error purging messages:', error);
            
            let errorMessage = '❌ Failed to purge messages. ';
            if (error.code === 50034) {
                errorMessage += 'Cannot delete messages older than 14 days.';
            } else if (error.code === 50013) {
                errorMessage += 'Missing permissions to delete messages.';
            } else {
                errorMessage += 'Please try again.';
            }

            await interaction.editReply({
                content: errorMessage
            });
        }
    },

    // For prefix commands (when MessageContent intent is enabled)
    async executePrefix(message, args) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ You don\'t have permission to manage messages!');
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('❌ I don\'t have permission to manage messages in this channel!');
        }

        if (args.length === 0) {
            return message.reply('❌ Please specify the number of messages to delete! Usage: `!purge <amount> [@user]`');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            return message.reply('❌ Please provide a valid number between 1 and 100!');
        }

        const target = message.mentions.users.first();

        try {
            // Fetch messages
            const messages = await message.channel.messages.fetch({ 
                limit: target ? 100 : amount + 1 // +1 to include the command message
            });

            let messagesToDelete;
            
            if (target) {
                // Filter messages by target user, exclude the command message
                messagesToDelete = messages.filter(msg => 
                    msg.author.id === target.id && 
                    msg.id !== message.id &&
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                ).first(amount);
            } else {
                // Filter out messages older than 14 days, include command message
                messagesToDelete = messages.filter(msg => 
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                ).first(amount + 1);
            }

            if (messagesToDelete.size === 0) {
                return message.reply('❌ No messages found to delete! Messages must be less than 14 days old.');
            }

            // Delete messages
            if (messagesToDelete.size === 1) {
                await messagesToDelete.first().delete();
            } else {
                await message.channel.bulkDelete(messagesToDelete, true);
            }

            const deletedCount = target ? messagesToDelete.size : messagesToDelete.size - 1; // Subtract command message
            const targetText = target ? ` from **${target.tag}**` : '';
            
            const confirmMsg = await message.channel.send(
                `✅ Successfully deleted **${deletedCount}** message${deletedCount === 1 ? '' : 's'}${targetText}!`
            );

            // Delete confirmation message after 5 seconds
            setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);

            console.log(`${message.author.tag} purged ${deletedCount} messages in #${message.channel.name} (${message.guild.name})`);

        } catch (error) {
            console.error('Error purging messages:', error);
            
            let errorMessage = '❌ Failed to purge messages. ';
            if (error.code === 50034) {
                errorMessage += 'Cannot delete messages older than 14 days.';
            } else if (error.code === 50013) {
                errorMessage += 'Missing permissions to delete messages.';
            } else {
                errorMessage += 'Please try again.';
            }

            message.reply(errorMessage);
        }
    }
};