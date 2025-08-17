const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The member to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration (e.g., 1h, 7d, permanent)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return await interaction.reply({
                content: '❌ You need Ban Members permission to ban users!',
                flags: 64
            });
        }

        const target = interaction.options.getUser('user');
        const durationStr = interaction.options.getString('duration') || 'permanent';
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;

        // Get member object (might be null if user not in server)
        const member = interaction.guild.members.cache.get(target.id);

        // Check if user can be banned (if they're in the server)
        if (member && !member.bannable) {
            return await interaction.reply({
                content: '❌ I cannot ban this member! They may have higher permissions.',
                flags: 64
            });
        }

        // Check if target is the command user
        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot ban yourself!',
                flags: 64
            });
        }

        // Check if target is the bot
        if (target.id === interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ I cannot ban myself!',
                flags: 64
            });
        }

        // Parse duration for temporary bans
        let duration = null;
        let isPermanent = true;
        
        if (durationStr !== 'permanent') {
            duration = this.parseDuration(durationStr);
            if (!duration) {
                return await interaction.reply({
                    content: '❌ Invalid duration format! Use formats like: 1h, 7d, or "permanent"',
                    flags: 64
                });
            }
            isPermanent = false;
        }

        try {
            // Try to DM the user before banning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#dc3545')
                    .setTitle('🔨 You have been banned')
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Duration', value: isPermanent ? 'Permanent' : durationStr, inline: true },
                        { name: 'Reason', value: reason, inline: false }
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('Could not DM user before ban:', error.message);
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                deleteMessageDays: deleteDays,
                reason: `${reason} | Banned by: ${interaction.user.tag}`
            });

            // Create log embed
            const embed = new EmbedBuilder()
                .setColor('#dc3545')
                .setTitle('🔨 Member Banned')
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Duration', value: isPermanent ? 'Permanent' : durationStr, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Messages Deleted', value: `${deleteDays} day(s)`, inline: true }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Send to log channel if configured
            await this.sendToLogChannel(interaction.guild, embed);

            // Schedule unban for temporary bans
            if (!isPermanent) {
                setTimeout(async () => {
                    try {
                        await interaction.guild.members.unban(target.id, 'Temporary ban expired');
                        
                        const unbanEmbed = new EmbedBuilder()
                            .setColor('#28a745')
                            .setTitle('🔓 Temporary Ban Expired')
                            .addFields([
                                { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                                { name: 'Original Duration', value: durationStr, inline: true }
                            ])
                            .setTimestamp();

                        await this.sendToLogChannel(interaction.guild, unbanEmbed);
                    } catch (error) {
                        console.error('Error auto-unbanning user:', error);
                    }
                }, duration);
            }

        } catch (error) {
            console.error('Error banning member:', error);
            await interaction.reply({
                content: '❌ Failed to ban the member. Please try again.',
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