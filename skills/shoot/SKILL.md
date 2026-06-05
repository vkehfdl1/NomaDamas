---
name: shoot
description: "Send Slack or Discord messages, files, images, and videos with the shoot CLI. Use when an agent needs to notify a channel or upload media through a messenger CLI."
---

# shoot

Use `shoot` to post text and upload files, images, or videos from the local CLI. The default provider is Slack; pass `--provider discord` for Discord.

## Safety

- Never print Slack tokens, Discord tokens, raw `SHOOT_TOKEN`, raw `SHOOT_DISCORD_TOKEN`, or raw compatibility `SLACK_SHOOT_*` values.
- Do not paste tokens into chat. Ask the user to run `shoot login slack --token <xoxb-token>` or `shoot login discord --token <bot-token>` locally if a token is missing.
- After important media uploads, verify delivery through CLI output and channel history when available.

## Setup

```sh
shoot login slack --token <xoxb-token>
shoot sync
shoot channels
shoot config set-default <channel>
shoot login discord --token <bot-token>
shoot config set-default <discord-channel-id> --provider discord
shoot config show
```

## Send

```sh
shoot send "message" --channel C123
shoot upload ./file.png --message "caption" --channel C123
shoot send "message" --provider discord --channel 987654321
shoot upload ./file.png --provider discord --message "caption" --channel 987654321
```

## Troubleshooting

- If `No channel provided` appears, pass `--channel <channel>` or run `shoot config set-default <channel>`.
- If `No Discord channel provided` appears, pass `--channel <channel-id>` or run `shoot config set-default <channel-id> --provider discord`.
- If a Slack channel name does not resolve, run `shoot sync` and then `shoot channels`.
- If upload fails, check provider-specific bot permissions and channel membership.
