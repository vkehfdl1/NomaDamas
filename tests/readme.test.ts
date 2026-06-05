import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("README", () => {
  it("documents setup sequence, commands, scopes, and env vars", async () => {
    const readme = await readText("README.md")

    expect(readme).toContain("shoot login")
    expect(readme).toContain("shoot sync")
    expect(readme).toContain("shoot config set-default")
    expect(readme).toContain("shoot send")
    expect(readme).toContain("shoot upload")
    expect(readme).toContain("--provider discord")
    expect(readme).toContain("chat:write")
    expect(readme).toContain("files:write")
    expect(readme).toContain("SHOOT_TOKEN")
    expect(readme).toContain("SHOOT_CHANNEL")
    expect(readme).toContain("SHOOT_DISCORD_TOKEN")
    expect(readme).toContain("SHOOT_DISCORD_CHANNEL")
  })

  it("warns that webhook-only setup cannot send media", async () => {
    const readme = await readText("README.md")

    expect(readme).toMatch(/media.*Web API|files.*Web API|webhook.*file/i)
  })
})
