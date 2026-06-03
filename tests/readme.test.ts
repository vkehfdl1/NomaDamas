import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("README", () => {
  it("documents setup sequence, commands, scopes, and env vars", async () => {
    const readme = await readText("README.md")

    expect(readme).toContain("slack-shoot login")
    expect(readme).toContain("slack-shoot sync")
    expect(readme).toContain("slack-shoot config set-default")
    expect(readme).toContain("slack-shoot send")
    expect(readme).toContain("slack-shoot upload")
    expect(readme).toContain("chat:write")
    expect(readme).toContain("files:write")
    expect(readme).toContain("SLACK_SHOOT_TOKEN")
    expect(readme).toContain("SLACK_SHOOT_CHANNEL")
  })

  it("warns that webhook-only setup cannot send media", async () => {
    const readme = await readText("README.md")

    expect(readme).toMatch(/media.*Web API|files.*Web API|webhook.*file/i)
  })
})
