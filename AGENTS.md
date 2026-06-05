# Agent Instructions

Use this repository to build and operate the `shoot` CLI.

Commands:
- Install dependencies with `npm install`.
- Build with `npm run build`.
- Run tests with `npm test`.
- Typecheck with `npm run typecheck`.
- Send Slack text with `shoot send "message" --channel C123`.
- Send Slack media with `shoot upload ./file.png --message "caption" --channel C123`.
- Send Discord text with `shoot send "message" --provider discord --channel 987654321`.
- Send Discord media with `shoot upload ./file.png --provider discord --message "caption" --channel 987654321`.
- Configure Slack with `shoot login slack --token <xoxb-token>`, `shoot sync`, and `shoot config set-default <channel>`.
- Configure Discord with `shoot login discord --token <bot-token>` and `shoot config set-default <channel-id> --provider discord`.
- List synced Slack channels with `shoot channels`.

Never print Slack tokens, Discord tokens, raw `SHOOT_TOKEN`, raw `SHOOT_DISCORD_TOKEN`, or compatibility `SLACK_SHOOT_*` values. Redact secrets in logs, evidence, and final reports.
