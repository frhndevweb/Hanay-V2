module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        // Note: This event requires MessageContent intent to be enabled in Discord Developer Portal
        // For now, this will be disabled to avoid intent permission errors
        // Users can enable MessageContent intent in their Discord app settings to use prefix commands
        return;
    },
};
