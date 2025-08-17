const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        // Check if user has permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return await interaction.reply({
                content: '❌ You don\'t have permission to kick members!',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Get the member object
        const member = interaction.guild.members.cache.get(target.id);
        
        if (!member) {
            return await interaction.reply({
                content: '❌ User not found in this server!',
                ephemeral: true
            });
        }

        // Check if target is kickable
        if (!member.kickable) {
            return await interaction.reply({
                content: '❌ I cannot kick this member! They may have higher permissions.',
                ephemeral: true
            });
        }

        // Check if target is the command user
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot kick yourself!',
                ephemeral: true
            });
        }

        // Check if target is the bot
        if (target.id === interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ I cannot kick myself!',
                ephemeral: true
            });
        }

        try {
            // Try to DM the user before kicking
            try {
                await target.send(`You have been kicked from **${interaction.guild.name}** by **${interaction.user.tag}**\nReason: ${reason}`);
            } catch (error) {
                console.log('Could not DM user before kick:', error.message);
            }

            // Kick the member
            await member.kick(reason);

            await interaction.reply({
                content: `✅ **${target.tag}** has been kicked!\n**Reason:** ${reason}`,
                ephemeral: false
            });

        } catch (error) {
            console.error('Error kicking member:', error);
            await interaction.reply({
                content: '❌ Failed to kick the member. Please try again.',
                ephemeral: true
            });
        }
    },

    // For prefix commands
    async executePrefix(message, args) {
        // Check permissions
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ You don\'t have permission to kick members!');
        }

        if (args.length === 0) {
            return message.reply('❌ Please mention a user to kick! Usage: `!kick @user [reason]`');
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply('❌ Please mention a valid user to kick!');
        }

        const reason = args.slice(1).join(' ') || 'No reason provided';
        const member = message.guild.members.cache.get(target.id);

        if (!member) {
            return message.reply('❌ User not found in this server!');
        }

        if (!member.kickable) {
            return message.reply('❌ I cannot kick this member! They may have higher permissions.');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ You cannot kick yourself!');
        }

        if (target.id === message.client.user.id) {
            return message.reply('❌ I cannot kick myself!');
        }

        try {
            // Try to DM the user before kicking
            try {
                await target.send(`You have been kicked from **${message.guild.name}** by **${message.author.tag}**\nReason: ${reason}`);
            } catch (error) {
                console.log('Could not DM user before kick:', error.message);
            }

            await member.kick(reason);
            await message.reply(`✅ **${target.tag}** has been kicked!\n**Reason:** ${reason}`);

        } catch (error) {
            console.error('Error kicking member:', error);
            await message.reply('❌ Failed to kick the member. Please try again.');
        }
    }
};
