const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ You need Ban Members permission to unban users!',
                flags: 64
            });
        }

        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Validate user ID format
        if (!/^\d{17,19}$/.test(userId)) {
            return await interaction.reply({
                content: '❌ Please provide a valid user ID (17-19 digits)!',
                flags: 64
            });
        }

        try {
            // Check if user is actually banned
            const bans = await interaction.guild.bans.fetch();
            const bannedUser = bans.get(userId);
            
            if (!bannedUser) {
                return await interaction.reply({
                    content: '❌ This user is not banned from this server!',
                    flags: 64
                });
            }

            // Unban the user
            await interaction.guild.members.unban(userId, `${reason} | Unbanned by: ${interaction.user.tag}`);

            // Create log embed
            const embed = new EmbedBuilder()
                .setColor('#28a745')
                .setTitle('🔓 Member Unbanned')
                .addFields([
                    { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Send to log channel if configured
            await this.sendToLogChannel(interaction.guild, embed);

            // Try to DM the user
            try {
                const user = await interaction.client.users.fetch(userId);
                const dmEmbed = new EmbedBuilder()
                    .setColor('#28a745')
                    .setTitle('🔓 You have been unbanned')
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ])
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not DM user about unban:', error.message);
            }

        } catch (error) {
            console.error('Error unbanning user:', error);
            
            if (error.code === 10026) {
                await interaction.reply({
                    content: '❌ User not found or not banned!',
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: '❌ Failed to unban the user. Please try again.',
                    flags: 64
                });
            }
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