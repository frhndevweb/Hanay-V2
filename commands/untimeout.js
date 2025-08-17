const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to remove timeout from')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await interaction.reply({
                content: '❌ You need Moderate Members permission to remove timeouts!',
                flags: 64
            });
        }

        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Get member object
        const member = interaction.guild.members.cache.get(target.id);
        if (!member) {
            return await interaction.reply({
                content: '❌ User not found in this server!',
                flags: 64
            });
        }

        // Check if user is actually timed out
        if (!member.isCommunicationDisabled()) {
            return await interaction.reply({
                content: '❌ This member is not currently timed out!',
                flags: 64
            });
        }

        // Check if user can be moderated
        if (!member.moderatable) {
            return await interaction.reply({
                content: '❌ I cannot moderate this member! They may have higher permissions.',
                flags: 64
            });
        }

        try {
            // Remove timeout
            await member.timeout(null, reason);

            // Create log embed
            const embed = new EmbedBuilder()
                .setColor('#28a745')
                .setTitle('✅ Timeout Removed')
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
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
                    .setColor('#28a745')
                    .setTitle('✅ Your timeout has been removed')
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not DM user about timeout removal:', error.message);
            }

        } catch (error) {
            console.error('Error removing timeout:', error);
            await interaction.reply({
                content: '❌ Failed to remove timeout. Please try again.',
                flags: 64
            });
        }
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