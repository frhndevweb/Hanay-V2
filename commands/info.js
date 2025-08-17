const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get information about server or user')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Get server information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Get user information')
                .addUserOption(option =>
                    option.setName('target')
                        .setDescription('The user to get info about')
                        .setRequired(false))),

    async execute(interaction) {
        // Defer the reply to prevent timeout
        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'server') {
            await this.serverInfo(interaction);
        } else if (subcommand === 'user') {
            await this.userInfo(interaction);
        }
    },

    async serverInfo(interaction) {
        const guild = interaction.guild;
        
        // Try to fetch members with timeout handling
        try {
            await guild.members.fetch({ time: 5000 });
        } catch (error) {
            console.log('Could not fetch all members, using cached data');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle(`${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '📊 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '🤖 Bots', value: `${guild.members.cache.filter(member => member.user.bot).size}`, inline: true },
                { name: '📝 Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: '😎 Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '🚀 Boost Level', value: `${guild.premiumTier}`, inline: true }
            )
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async userInfo(interaction) {
        const target = interaction.options.getUser('target') || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle(`${target.tag} User Information`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 User ID', value: target.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false }
            );

        if (member) {
            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '🎭 Nickname', value: member.nickname || 'None', inline: true },
                { name: '🎨 Roles', value: member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') || 'None', inline: false }
            );

            if (member.premiumSince) {
                embed.addFields({ name: '💎 Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`, inline: true });
            }
        }

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    // For prefix commands
    async executePrefix(message, args) {
        if (args.length === 0 || args[0] === 'server') {
            await this.serverInfoPrefix(message);
        } else if (args[0] === 'user') {
            await this.userInfoPrefix(message, args);
        } else {
            await message.reply('❌ Usage: `!info server` or `!info user [@user]`');
        }
    },

    async serverInfoPrefix(message) {
        const guild = message.guild;
        
        // Try to fetch members with timeout handling
        try {
            await guild.members.fetch({ time: 5000 });
        } catch (error) {
            console.log('Could not fetch all members, using cached data');
        }
        
        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle(`${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: '📊 Server ID', value: guild.id, inline: true },
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                { name: '🤖 Bots', value: `${guild.members.cache.filter(member => member.user.bot).size}`, inline: true },
                { name: '📝 Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: '😎 Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '🚀 Boost Level', value: `${guild.premiumTier}`, inline: true }
            )
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await message.reply({ embeds: [embed] });
    },

    async userInfoPrefix(message, args) {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);

        const embed = new EmbedBuilder()
            .setColor('#667eea')
            .setTitle(`${target.tag} User Information`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 User ID', value: target.id, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false }
            );

        if (member) {
            embed.addFields(
                { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '🎭 Nickname', value: member.nickname || 'None', inline: true },
                { name: '🎨 Roles', value: member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') || 'None', inline: false }
            );

            if (member.premiumSince) {
                embed.addFields({ name: '💎 Boosting Since', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:F>`, inline: true });
            }
        }

        embed.setTimestamp();
        await message.reply({ embeds: [embed] });
    }
};
