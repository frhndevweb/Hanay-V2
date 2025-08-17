# Hanay V2

Bot Discord administrator yang menyediakan command moderation lengkap.

## 🚀 Quick Start

### Local Development
```bash
npm install
cp .env.example .env
# Edit .env dengan token dan konfigurasi yang sesuai
npm run dev
```

### Production Deployment

#### Railway
1. Connect repository ke Railway
2. Set environment variables
3. Deploy otomatis

#### Heroku
```bash
heroku create your-bot-name
heroku config:set BOT_TOKEN=your_token
heroku config:set CLIENT_ID=your_client_id
# Set env vars lainnya
git push heroku main
```

#### Docker
```bash
docker build -t discord-bot .
docker run -d --env-file .env discord-bot
```

## 🔧 Environment Variables

```env
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
DATABASE_URL=your_database_url
DATABASE_AUTH_TOKEN=your_database_auth_token
PREFIX=!
```

## 📋 Commands

- `/ping` - Test responsiveness
- `/info server|user` - Server/user information
- `/ban @user [reason]` - Ban member
- `/kick @user [reason]` - Kick member
- `/timeout @user duration` - Timeout member
- `/purge amount` - Delete messages
- `/log #channel` - Set log channel
- `/setwelcome #channel message` - Set welcome message

## 🔗 Connecting to Dashboard

Bot dapat terhubung dengan web dashboard melalui:
1. Shared database (Turso)
2. API endpoints untuk stats sharing