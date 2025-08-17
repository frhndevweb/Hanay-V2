const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { updateGuildSettings, getGuildSettings } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setclose')
        .setDescription('Configure goodbye messages for leaving members')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up goodbye message with embed')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send goodbye messages')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Goodbye message title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Goodbye message description (use {user} for username, {server} for server name)')
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
                .setDescription('Disable goodbye messages'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Test the goodbye message'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({
                content: '❌ You need Manage Server permission to configure goodbye messages!',
                flags: 64
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            await this.setupGoodbye(interaction);
        } else if (subcommand === 'disable') {
            await this.disableGoodbye(interaction);
        } else if (subcommand === 'test') {
            await this.testGoodbye(interaction);
        }
    },

    async setupGoodbye(interaction) {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || '#dc3545';
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
            // Save goodbye settings to database
            const goodbyeSettings = {
                goodbye_channel: channel.id,
                goodbye_title: title,
                goodbye_description: description,
                goodbye_color: color,
                goodbye_image: imageUrl
            };

            await updateGuildSettings(interaction.guild.id, goodbyeSettings);

            // Create preview embed
            const previewEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description.replace('{user}', interaction.user.username).replace('{server}', interaction.guild.name))
                .setTimestamp();

            if (imageUrl) {
                previewEmbed.setImage(imageUrl);
            }

            await interaction.reply({
                content: `✅ Goodbye messages configured for ${channel}!\n\n**Preview:**`,
                embeds: [previewEmbed],
                flags: 64
            });

        } catch (error) {
            console.error('Error setting up goodbye:', error);
            await interaction.reply({
                content: '❌ Failed to configure goodbye messages. Please try again.',
                flags: 64
            });
        }
    },

    async disableGoodbye(interaction) {
        try {
            await updateGuildSettings(interaction.guild.id, {
                goodbye_channel: null
            });

            await interaction.reply({
                content: '✅ Goodbye messages have been disabled.',
                flags: 64
            });

        } catch (error) {
            console.error('Error disabling goodbye:', error);
            await interaction.reply({
                content: '❌ Failed to disable goodbye messages. Please try again.',
                flags: 64
            });
        }
    },

    async testGoodbye(interaction) {
        try {
            const settings = await getGuildSettings(interaction.guild.id);
            
            if (!settings?.goodbye_channel) {
                return await interaction.reply({
                    content: '❌ Goodbye messages are not configured! Use `/setclose setup` first.',
                    flags: 64
                });
            }

            const channel = interaction.guild.channels.cache.get(settings.goodbye_channel);
            if (!channel) {
                return await interaction.reply({
                    content: '❌ Goodbye channel not found! Please reconfigure with `/setclose setup`.',
                    flags: 64
                });
            }

            // Create test embed
            const embed = new EmbedBuilder()
                .setColor(settings.goodbye_color || '#dc3545')
                .setTitle(settings.goodbye_title || 'Goodbye!')
                .setDescription((settings.goodbye_description || 'Goodbye {user}, thanks for being part of {server}!')
                    .replace('{user}', interaction.user.username)
                    .replace('{server}', interaction.guild.name))
                .setFooter({ text: 'This is a test message' })
                .setTimestamp();

            if (settings.goodbye_image) {
                embed.setImage(settings.goodbye_image);
            }

            await channel.send({ embeds: [embed] });

            await interaction.reply({
                content: `✅ Test goodbye message sent to ${channel}!`,
                flags: 64
            });

        } catch (error) {
            console.error('Error testing goodbye:', error);
            await interaction.reply({
                content: '❌ Failed to send test goodbye message.',
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