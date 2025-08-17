const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to timeout')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 10m, 1h, 2d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({
                content: '❌ You need Moderate Members permission to timeout users!',
                flags: 64
            });
        }

        const target = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Get member object
        const member = interaction.guild.members.cache.get(target.id);
        if (!member) {
            return await interaction.reply({
                content: '❌ User not found in this server!',
                flags: 64
            });
        }

        // Check if user can be timed out
        if (!member.moderatable) {
            return await interaction.reply({
                content: '❌ I cannot timeout this member! They may have higher permissions.',
                flags: 64
            });
        }

        // Check if target is the command user
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot timeout yourself!',
                flags: 64
            });
        }

        // Parse duration
        const duration = this.parseDuration(durationStr);
        if (!duration) {
            return await interaction.reply({
                content: '❌ Invalid duration format! Use formats like: 10m, 1h, 2d, 1w',
                flags: 64
            });
        }

        if (duration > 28 * 24 * 60 * 60 * 1000) { // 28 days max
            return await interaction.reply({
                content: '❌ Timeout duration cannot exceed 28 days!',
                flags: 64
            });
        }

        try {
            // Apply timeout
            await member.timeout(duration, reason);

            // Create log embed
            const embed = new EmbedBuilder()
                .setColor('#ff9500')
                .setTitle('⏰ Member Timed Out')
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Send to log channel if configured
            await this.sendToLogChannel(interaction.guild, embed);

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#ff9500')
                    .setTitle('⏰ You have been timed out')
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Duration', value: durationStr, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not DM user about timeout:', error.message);
            }

        } catch (error) {
            console.error('Error timing out member:', error);
            await interaction.reply({
                content: '❌ Failed to timeout the member. Please try again.',
                flags: 64
            });
        }
    },

    parseDuration(durationStr) {
        const regex = /^(\d+)([smhdw])$/i;
        const match = durationStr.match(regex);
        
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        const multipliers = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000,
            'w': 7 * 24 * 60 * 60 * 1000
        };
        
        return value * multipliers[unit];
    },

    async sendToLogChannel(guild, embed) {
        try {
            const settings = await getGuildSettings(guild.id);
            if (!settings?.log_channel) return;

            const logChannel = guild.channels.cache.get(settings.log_channel);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error sending to log channel:', error);
        }
    }
};