# shoot

`shoot` is an agent-friendly CLI for sending messages and media from a shell to Slack or Discord.

## Install

```sh
npm install
npm run build
npm link
```

## Slack Setup

Create a Slack app from `docs/slack-app-manifest.yml`, install it to the workspace, copy the bot token, and invite the bot to the target channel.

Required bot scopes:
- `chat:write`
- `files:write`
- `channels:read`
- `groups:read`

Webhook-only setup is not enough for files or media. File, image, and video uploads require the Slack Web API.

## Discord Setup

Create or reuse a Discord application bot, invite it to the server with permission to post in the target channel, then use the bot token and channel ID.

## Configure

```sh
shoot login slack --token xoxb-your-token
shoot sync
shoot channels
shoot config set-default C123
shoot login discord --token your-discord-bot-token
shoot config set-default 987654321 --provider discord
shoot config show
```

Config uses `SHOOT_CONFIG_DIR` when set, otherwise the user config directory. Environment variables override disk config:

- `SHOOT_TOKEN`
- `SHOOT_CHANNEL`
- `SHOOT_CONFIG_DIR`
- `SHOOT_MOCK`
- `SHOOT_DISCORD_TOKEN`
- `SHOOT_DISCORD_CHANNEL`
- `SHOOT_DISCORD_MOCK`
- `SHOOT_LIVE_TOKEN`
- `SHOOT_LIVE_CHANNEL`

Existing Slack-only `SLACK_SHOOT_*` env vars remain supported as compatibility fallbacks.

## Send

```sh
shoot send "hello" --channel C123
shoot send "hello using the default Slack channel"
shoot upload ./image.png --message "image caption" --channel C123
shoot send "mixed media" --file ./image.png --file ./video.mp4 --channel C123
shoot send "hello discord" --provider discord --channel 987654321
shoot upload ./image.png --provider discord --message "discord image" --channel 987654321
```

## Live QA

Live Slack QA is opt-in and redacts tokens:

```sh
SHOOT_LIVE_TOKEN=xoxb-your-token SHOOT_LIVE_CHANNEL=C123 npm run qa:live
```

Troubleshooting:
- If you need to see available Slack channels, run `shoot sync` and then `shoot channels`.
- If you see `No channel provided`, pass `--channel` or run `shoot config set-default`.
- If you see `No Discord channel provided`, pass `--channel` or run `shoot config set-default --provider discord`.
- If authentication fails, rerun `shoot login slack --token <xoxb-token>` or `shoot login discord --token <bot-token>`.
- If Slack media upload fails, verify the Slack app has `files:write` and the bot is in the channel.
- If Discord posting fails, verify the bot is invited and can post in the target channel.
