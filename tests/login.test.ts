import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("login command", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("stores a validated token and prints next steps", async () => {
    const dir = await makeTempDir("slack-shoot-login-")
    try {
      const login = await runCli(["login", "--token", "xoxb-test-token"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir, SLACK_SHOOT_MOCK: "auth_ok" }
      })
      const show = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(login.exitCode).toBe(0)
      expect(login.stdout).toContain("Login verified")
      expect(login.stdout).toContain("slack-shoot sync")
      expect(show.stdout).toContain("xoxb-REDACTED")
      expect(show.stdout).not.toContain("xoxb-test-token")
    } finally {
      await removeDir(dir)
    }
  })

  it("rejects invalid tokens without storing them", async () => {
    const dir = await makeTempDir("slack-shoot-login-bad-")
    try {
      const result = await runCli(["login", "--token", "xoxb-bad"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir, SLACK_SHOOT_MOCK: "invalid_auth" }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("Slack authentication failed")
      expect(result.stderr).not.toContain("xoxb-bad")
    } finally {
      await removeDir(dir)
    }
  })
})
