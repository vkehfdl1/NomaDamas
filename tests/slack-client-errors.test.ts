import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("Slack error normalization", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("maps invalid auth to an actionable message without leaking token", async () => {
    const dir = await makeTempDir("slack-shoot-auth-")
    try {
      const result = await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-invalid",
          SLACK_SHOOT_MOCK: "invalid_auth"
        }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("Slack authentication failed")
      expect(result.stderr).not.toContain("xoxb-invalid")
    } finally {
      await removeDir(dir)
    }
  })

  it("performs one bounded retry when Slack rate limits sync", async () => {
    const dir = await makeTempDir("slack-shoot-rate-")
    try {
      const result = await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "rate_limit_once"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toContain("retried after rate limit")
      expect(result.stdout).toContain("Cached 1 channel")
    } finally {
      await removeDir(dir)
    }
  })

  it("normalizes missing scope and network failures", async () => {
    const dir = await makeTempDir("slack-shoot-scope-")
    try {
      const scope = await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "missing_scope"
        }
      })
      const network = await runCli(["send", "hello", "--channel", "C123"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "network_error"
        }
      })

      expect(scope.stderr).toContain("Slack app is missing required scope")
      expect(network.stderr).toContain("Slack network request failed")
    } finally {
      await removeDir(dir)
    }
  })
})
