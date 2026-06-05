import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("send command", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("uses explicit channel before default channel", async () => {
    const dir = await makeTempDir("slack-shoot-send-")
    try {
      await runCli(["config", "set-default", "CDEFAULT"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })
      const result = await runCli(["send", "hello from qa", "--channel", "COVERRIDE"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "send_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Message sent to COVERRIDE")
    } finally {
      await removeDir(dir)
    }
  })

  it("uses stdin text and env channel", async () => {
    const dir = await makeTempDir("shoot-stdin-")
    try {
      const result = await runCli(["send"], {
        env: {
          SHOOT_CONFIG_DIR: dir,
          SHOOT_TOKEN: "xoxb-test",
          SHOOT_CHANNEL: "CENV",
          SHOOT_MOCK: "send_ok"
        },
        input: "hello from stdin"
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Message sent to CENV")
    } finally {
      await removeDir(dir)
    }
  })

  it("keeps Slack env compatibility for existing installations", async () => {
    const dir = await makeTempDir("shoot-slack-compat-")
    try {
      const result = await runCli(["send", "compat"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "COLD",
          SLACK_SHOOT_MOCK: "send_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Message sent to COLD")
    } finally {
      await removeDir(dir)
    }
  })

  it("fails before Slack call when channel is missing", async () => {
    const dir = await makeTempDir("slack-shoot-no-channel-")
    try {
      const result = await runCli(["send", "hello"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir, SLACK_SHOOT_TOKEN: "xoxb-test" }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("No channel provided")
    } finally {
      await removeDir(dir)
    }
  })

  it("normalizes bot-not-in-channel errors", async () => {
    const dir = await makeTempDir("slack-shoot-not-in-channel-")
    try {
      const result = await runCli(["send", "hello", "--channel", "C123"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "not_in_channel"
        }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("bot is not in channel")
    } finally {
      await removeDir(dir)
    }
  })
})
