const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('../utils/database');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        // Note: This event requires GuildMembers intent to be enabled in Discord Developer Portal
        // Without this intent, welcome messages will not work automatically
        // Users can enable this intent in their Discord app settings to activate welcome messages
        console.log('guildMemberAdd event triggered, but requires GuildMembers intent to function');
        return;
    },
};