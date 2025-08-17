const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { updateGuildSettings, getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Configure welcome messages for new members')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up welcome message with embed')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send welcome messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Welcome message title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Welcome message description (use {user} for mention, {server} for server name)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code like #ff0000)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('Image URL for the embed')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable welcome messages'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the welcome message'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ You need Manage Server permission to configure welcome messages!',
                flags: 64
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await this.setupWelcome(interaction);
        } else if (subcommand === 'disable') {
            await this.disableWelcome(interaction);
        } else if (subcommand === 'test') {
            await this.testWelcome(interaction);
        }
    },

    async setupWelcome(interaction) {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#667eea';
        const imageUrl = interaction.options.getString('image');

        // Validate color format
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
            return await interaction.reply({
                content: '❌ Invalid color format! Use hex format like #ff0000',
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

        // Validate image URL if provided
        if (imageUrl && !this.isValidImageUrl(imageUrl)) {
            return await interaction.reply({
                content: '❌ Invalid image URL! Please provide a valid image URL.',
                flags: 64
            });
        }

        try {
            // Save welcome settings to database
            const welcomeSettings = {
                welcome_channel: channel.id,
                welcome_title: title,
                welcome_description: description,
                welcome_color: color,
                welcome_image: imageUrl
            };

            await updateGuildSettings(interaction.guild.id, welcomeSettings);

            // Create preview embed
            const previewEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description.replace('{user}', `${interaction.user}`).replace('{server}', interaction.guild.name))
                .setTimestamp();

            if (imageUrl) {
                previewEmbed.setImage(imageUrl);
            }

            await interaction.reply({
                content: `✅ Welcome messages configured for ${channel}!\n\n**Preview:**`,
                embeds: [previewEmbed],
                flags: 64
            });

        } catch (error) {
            console.error('Error setting up welcome:', error);
            await interaction.reply({
                content: '❌ Failed to configure welcome messages. Please try again.',
                flags: 64
            });
        }
    },

    async disableWelcome(interaction) {
        try {
            await updateGuildSettings(interaction.guild.id, {
                welcome_channel: null
            });

            await interaction.reply({
                content: '✅ Welcome messages have been disabled.',
                flags: 64
            });

        } catch (error) {
            console.error('Error disabling welcome:', error);
            await interaction.reply({
                content: '❌ Failed to disable welcome messages. Please try again.',
                flags: 64
            });
        }
    },

    async testWelcome(interaction) {
        try {
            const settings = await getGuildSettings(interaction.guild.id);
            
            if (!settings?.welcome_channel) {
                return await interaction.reply({
                    content: '❌ Welcome messages are not configured! Use `/setwelcome setup` first.',
                    flags: 64
                });
            }

            const channel = interaction.guild.channels.cache.get(settings.welcome_channel);
            if (!channel) {
                return await interaction.reply({
                    content: '❌ Welcome channel not found! Please reconfigure with `/setwelcome setup`.',
                    flags: 64
                });
            }

            // Create test embed
            const embed = new EmbedBuilder()
                .setColor(settings.welcome_color || '#667eea')
                .setTitle(settings.welcome_title || 'Welcome!')
                .setDescription((settings.welcome_description || 'Welcome {user} to {server}!')
                    .replace('{user}', `${interaction.user}`)
                    .replace('{server}', interaction.guild.name))
                .setFooter({ text: 'This is a test message' })
                .setTimestamp();

            if (settings.welcome_image) {
                embed.setImage(settings.welcome_image);
            }

            await channel.send({ embeds: [embed] });

            await interaction.reply({
                content: `✅ Test welcome message sent to ${channel}!`,
                flags: 64
            });

        } catch (error) {
            console.error('Error testing welcome:', error);
            await interaction.reply({
                content: '❌ Failed to send test welcome message.',
                flags: 64
            });
        }
    },

    isValidImageUrl(url) {
        try {
            new URL(url);
            return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        } catch {
            return false;
        }
    }
};