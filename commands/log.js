const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { updateGuildSettings, getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('log')
        .setDescription('Configure server activity logging')
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the log channel for server activities')
                .addChannelOption(option =>
                    option.setName('target')
                        .setDescription('The channel to send logs to')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable server activity logging'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current logging configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ You need Manage Server permission to configure logging!',
                flags: 64 // ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'channel') {
            await this.setLogChannel(interaction);
        } else if (subcommand === 'disable') {
            await this.disableLogging(interaction);
        } else if (subcommand === 'status') {
            await this.showStatus(interaction);
        }
    },

    async setLogChannel(interaction) {
        const channel = interaction.options.getChannel('target');
        
        // Check if it's a text channel
        if (channel.type !== 0) { // 0 = GUILD_TEXT
            return await interaction.reply({
                content: '❌ Please select a text channel for logging!',
                flags: 64
            });
        }

        // Check bot permissions in the channel
        const botMember = interaction.guild.members.me;
        const permissions = channel.permissionsFor(botMember);
        
        if (!permissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return await interaction.reply({
                content: '❌ I need Send Messages and Embed Links permissions in that channel!',
                flags: 64
            });
        }

        try {
            // Update database
            await updateGuildSettings(interaction.guild.id, {
                log_channel: channel.id
            });

            // Send test log message
            const embed = new EmbedBuilder()
                .setColor('#28a745')
                .setTitle('📋 Logging Configuration')
                .setDescription('Server activity logging has been enabled in this channel!')
                .addFields([
                    { name: 'Configured by', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Server', value: `${interaction.guild.name}`, inline: true }
                ])
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            await interaction.reply({
                content: `✅ Server logging configured! Activity logs will be sent to ${channel}`,
                flags: 64
            });

        } catch (error) {
            console.error('Error setting log channel:', error);
            await interaction.reply({
                content: '❌ Failed to configure logging. Please try again.',
                flags: 64
            });
        }
    },

    async disableLogging(interaction) {
        try {
            await updateGuildSettings(interaction.guild.id, {
                log_channel: null
            });

            await interaction.reply({
                content: '✅ Server activity logging has been disabled.',
                flags: 64
            });

        } catch (error) {
            console.error('Error disabling logging:', error);
            await interaction.reply({
                content: '❌ Failed to disable logging. Please try again.',
                flags: 64
            });
        }
    },

    async showStatus(interaction) {
        try {
            const settings = await getGuildSettings(interaction.guild.id);
            const logChannel = settings?.log_channel ? 
                interaction.guild.channels.cache.get(settings.log_channel) : null;

            const embed = new EmbedBuilder()
                .setColor('#667eea')
                .setTitle('📋 Logging Status')
                .addFields([
                    { 
                        name: 'Status', 
                        value: logChannel ? '✅ Enabled' : '❌ Disabled', 
                        inline: true 
                    },
                    { 
                        name: 'Log Channel', 
                        value: logChannel ? `${logChannel}` : 'Not configured', 
                        inline: true 
                    }
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 });

        } catch (error) {
            console.error('Error checking log status:', error);
            await interaction.reply({
                content: '❌ Failed to check logging status.',
                flags: 64
            });
        }
    }
};