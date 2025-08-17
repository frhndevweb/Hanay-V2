const { createClient } = require('@libsql/client');
require('dotenv').config();

let db = null;

/**
 * Initialize database connection
 */
async function initDatabase() {
    try {
        // Check if environment variables are set
        if (!process.env.DATABASE_URL) {
            console.warn('⚠️  DATABASE_URL not set, database features will be disabled');
            return null;
        }

        // Create database client
        db = createClient({
            url: process.env.DATABASE_URL,
            authToken: process.env.DATABASE_AUTH_TOKEN
        });

        // Test connection
        await db.execute('SELECT 1');
        console.log('✅ Database connected successfully');

        // Initialize tables
        await initTables();

        return db;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        db = null;
        return null;
    }
}

/**
 * Initialize database tables
 */
async function initTables() {
    if (!db) return;

    try {
        // Guild settings table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                welcome_channel TEXT,
                welcome_title TEXT,
                welcome_description TEXT,
                welcome_color TEXT,
                welcome_image TEXT,
                goodbye_channel TEXT,
                goodbye_title TEXT,
                goodbye_description TEXT,
                goodbye_color TEXT,
                goodbye_image TEXT,
                log_channel TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // User data table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_data (
                user_id TEXT,
                guild_id TEXT,
                warnings INTEGER DEFAULT 0,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, guild_id)
            )
        `);

        // Bot statistics table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS bot_stats (
                id INTEGER PRIMARY KEY,
                guilds INTEGER DEFAULT 0,
                users INTEGER DEFAULT 0,
                commands_used INTEGER DEFAULT 0,
                uptime INTEGER DEFAULT 0,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Error initializing tables:', error);
    }
}

/**
 * Get guild settings
 * @param {string} guildId - Guild ID
 * @returns {Object|null} Guild settings or null
 */
async function getGuildSettings(guildId) {
    if (!db) return null;

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM guild_settings WHERE guild_id = ?',
            args: [guildId]
        });

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error fetching guild settings:', error);
        return null;
    }
}

/**
 * Update guild settings
 * @param {string} guildId - Guild ID
 * @param {Object} settings - Settings to update
 * @returns {boolean} Success status
 */
async function updateGuildSettings(guildId, settings) {
    if (!db) return false;

    try {
        const { prefix, welcome_channel, log_channel } = settings;

        await db.execute({
            sql: `INSERT OR REPLACE INTO guild_settings 
                  (guild_id, prefix, welcome_channel, log_channel, updated_at) 
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [guildId, prefix, welcome_channel, log_channel]
        });

        return true;
    } catch (error) {
        console.error('Error updating guild settings:', error);
        return false;
    }
}

/**
 * Get user data
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @returns {Object|null} User data or null
 */
async function getUserData(userId, guildId) {
    if (!db) return null;

    try {
        const result = await db.execute({
            sql: 'SELECT * FROM user_data WHERE user_id = ? AND guild_id = ?',
            args: [userId, guildId]
        });

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {string} guildId - Guild ID
 * @param {Object} data - Data to update
 * @returns {boolean} Success status
 */
async function updateUserData(userId, guildId, data) {
    if (!db) return false;

    try {
        const { warnings, xp, level } = data;

        await db.execute({
            sql: `INSERT OR REPLACE INTO user_data 
                  (user_id, guild_id, warnings, xp, level, updated_at) 
                  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [userId, guildId, warnings, xp, level]
        });

        return true;
    } catch (error) {
        console.error('Error updating user data:', error);
        return false;
    }
}

/**
 * Record bot statistics
 * @param {Object} stats - Statistics to record
 * @returns {boolean} Success status
 */
async function recordBotStats(stats) {
    if (!db) return false;

    try {
        const { guilds, users, commands_used, uptime } = stats;

        await db.execute({
            sql: `INSERT INTO bot_stats (guilds, users, commands_used, uptime) 
                  VALUES (?, ?, ?, ?)`,
            args: [guilds, users, commands_used, uptime]
        });

        return true;
    } catch (error) {
        console.error('Error recording bot stats:', error);
        return false;
    }
}

/**
 * Get database client
 * @returns {Object|null} Database client or null
 */
function getDatabase() {
    return db;
}

/**
 * Close database connection
 */
async function closeDatabase() {
    if (db) {
        try {
            await db.close();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database:', error);
        }
    }
}

module.exports = {
    initDatabase,
    getGuildSettings,
    updateGuildSettings,
    getUserData,
    updateUserData,
    recordBotStats,
    getDatabase,
    closeDatabase
};
