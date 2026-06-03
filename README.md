# slack-shoot

`slack-shoot` is a small CLI for sending Slack messages, files, images, and videos to a specific Slack channel from any working directory.

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

## Configure

```sh
slack-shoot login --token xoxb-your-token
slack-shoot sync
slack-shoot config set-default slack-shoot
slack-shoot config show
```

Config uses `SLACK_SHOOT_CONFIG_DIR` when set, otherwise the user config directory. Environment variables override disk config:

- `SLACK_SHOOT_TOKEN`
- `SLACK_SHOOT_CHANNEL`
- `SLACK_SHOOT_CONFIG_DIR`
- `SLACK_SHOOT_LIVE_TOKEN`
- `SLACK_SHOOT_LIVE_CHANNEL`

## Send

```sh
slack-shoot send "hello" --channel C123
slack-shoot send "hello using the default channel"
slack-shoot upload ./image.png --message "image caption" --channel C123
slack-shoot send "mixed media" --file ./image.png --file ./video.mp4 --channel C123
```

## Live QA

Live Slack QA is opt-in and redacts tokens:

```sh
SLACK_SHOOT_LIVE_TOKEN=xoxb-your-token SLACK_SHOOT_LIVE_CHANNEL=C123 npm run qa:live
```

Troubleshooting:
- If you see `No channel provided`, pass `--channel` or run `slack-shoot config set-default`.
- If authentication fails, rerun `slack-shoot login --token <xoxb-token>`.
- If media upload fails, verify the Slack app has `files:write` and the bot is in the channel.
