import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("channel sync and resolution", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("caches public and private channels across paginated sync", async () => {
    const dir = await makeTempDir("slack-shoot-sync-")
    try {
      const sync = await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "channels_ok"
        }
      })
      const setDefault = await runCli(["config", "set-default", "slack-shoot"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })
      const show = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(sync.exitCode).toBe(0)
      expect(sync.stdout).toContain("Cached 2 channels")
      expect(setDefault.exitCode).toBe(0)
      expect(show.stdout).toContain("Default channel: slack-shoot")
    } finally {
      await removeDir(dir)
    }
  })

  it("lists cached public and private channels", async () => {
    const dir = await makeTempDir("slack-shoot-channels-")
    try {
      await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "channels_ok"
        }
      })
      const result = await runCli(["channels"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("slack-shoot\tC123\tpublic")
      expect(result.stdout).toContain("private-shoot\tG234\tprivate")
      expect(result.stdout).not.toContain("archived")
    } finally {
      await removeDir(dir)
    }
  })

  it("explains how to populate the channel list when the cache is empty", async () => {
    const dir = await makeTempDir("slack-shoot-channels-empty-")
    try {
      const result = await runCli(["channels"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("No cached channels")
      expect(result.stdout).toContain("slack-shoot sync")
    } finally {
      await removeDir(dir)
    }
  })

  it("requires an explicit ID for duplicate channel names", async () => {
    const dir = await makeTempDir("slack-shoot-sync-dup-")
    try {
      await runCli(["sync"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_MOCK: "channels_duplicate"
        }
      })
      const result = await runCli(["config", "set-default", "slack-shoot"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("duplicate channel name")
    } finally {
      await removeDir(dir)
    }
  })

  it("allows explicit channel IDs without a cache", async () => {
    const dir = await makeTempDir("slack-shoot-id-")
    try {
      const result = await runCli(["config", "set-default", "C123"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(result.exitCode).toBe(0)
    } finally {
      await removeDir(dir)
    }
  })
})
