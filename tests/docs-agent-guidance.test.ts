import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("agent guidance", () => {
  it("documents the commands agents should use", async () => {
    const root = await readText("AGENTS.md")
    const skill = await readText("skills/slack-shoot/SKILL.md")
    const combined = `${root}\n${skill}`

    expect(combined).toContain("slack-shoot login")
    expect(combined).toContain("slack-shoot sync")
    expect(combined).toContain("slack-shoot config")
    expect(combined).toContain("slack-shoot send")
    expect(combined).toContain("slack-shoot upload")
  })

  it("forbids printing Slack secrets", async () => {
    const root = await readText("AGENTS.md")
    const skill = await readText("skills/slack-shoot/SKILL.md")

    expect(`${root}\n${skill}`).toMatch(/Never print|Do not print|redact/)
  })
})
