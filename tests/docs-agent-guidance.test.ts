import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("agent guidance", () => {
  it("documents the commands agents should use", async () => {
    const root = await readText("AGENTS.md")
    const skill = await readText("skills/shoot/SKILL.md")
    const combined = `${root}\n${skill}`

    expect(combined).toContain("shoot login")
    expect(combined).toContain("shoot sync")
    expect(combined).toContain("shoot config")
    expect(combined).toContain("shoot send")
    expect(combined).toContain("shoot upload")
    expect(combined).toContain("--provider discord")
  })

  it("forbids printing Slack secrets", async () => {
    const root = await readText("AGENTS.md")
    const skill = await readText("skills/shoot/SKILL.md")

    expect(`${root}\n${skill}`).toMatch(/Never print|Do not print|redact/)
    expect(`${root}\n${skill}`).toContain("Discord")
  })
})
