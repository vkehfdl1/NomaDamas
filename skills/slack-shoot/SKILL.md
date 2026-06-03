---
name: slack-shoot
description: "Use when an agent needs to send a Slack message, file, image, or video through the slack-shoot CLI."
---

# slack-shoot

Use `slack-shoot` only after a Slack bot token and channel are configured.

Common commands:
- `slack-shoot login --token <xoxb-token>`
- `slack-shoot sync`
- `slack-shoot channels`
- `slack-shoot config set-default <channel>`
- `slack-shoot send "message" --channel <channel>`
- `slack-shoot upload ./file.png --message "caption" --channel <channel>`

Do not print Slack tokens. Always redact `SLACK_SHOOT_TOKEN`, `SLACK_SHOOT_LIVE_TOKEN`, and pasted `xoxb-` values in transcripts.
