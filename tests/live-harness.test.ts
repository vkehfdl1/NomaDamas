import { describe, expect, it } from "vitest"
import { buildCli, runCli } from "./helpers.js"

describe("live Slack QA harness", () => {
  it("skips safely when live env vars are absent", async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)

    const result = await runCli(["__qa-live"], {
      env: { SLACK_SHOOT_LIVE_TOKEN: "", SLACK_SHOOT_LIVE_CHANNEL: "" }
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("Skipping live Slack QA")
  })

  it("refuses partial live env without leaking token", async () => {
    const result = await runCli(["__qa-live"], {
      env: { SLACK_SHOOT_LIVE_TOKEN: "xoxb-test", SLACK_SHOOT_LIVE_CHANNEL: "" }
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("SLACK_SHOOT_LIVE_CHANNEL")
    expect(result.stderr).not.toContain("xoxb-test")
  })
})
