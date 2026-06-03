# Agent Instructions

Use this repository to build and operate the `slack-shoot` CLI.

Commands:
- Install dependencies with `npm install`.
- Build with `npm run build`.
- Run tests with `npm test`.
- Typecheck with `npm run typecheck`.
- Send text with `slack-shoot send "message" --channel C123`.
- Send media with `slack-shoot upload ./file.png --message "caption" --channel C123`.
- Configure once with `slack-shoot login --token <xoxb-token>`, `slack-shoot sync`, and `slack-shoot config set-default <channel>`.

Never print Slack tokens or raw `SLACK_SHOOT_TOKEN` values. Redact secrets in logs, evidence, and final reports.
