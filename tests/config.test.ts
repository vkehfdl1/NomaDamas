import { chmod, mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, fileMode, makeTempDir, readText, removeDir, runCli } from "./helpers.js"

describe("config storage", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("persists the default channel and shows cache metadata", async () => {
    const dir = await makeTempDir("slack-shoot-config-")
    try {
      const setResult = await runCli(["config", "set-default", "C123"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })
      const showResult = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(setResult.exitCode).toBe(0)
      expect(showResult.exitCode).toBe(0)
      expect(showResult.stdout).toContain("Slack default channel: C123")
      expect(showResult.stdout).toContain("Cached channels: 0")
    } finally {
      await removeDir(dir)
    }
  })

  it("redacts token values from config output", async () => {
    const dir = await makeTempDir("slack-shoot-redact-")
    try {
      const result = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir, SLACK_SHOOT_TOKEN: "xoxb-secret" }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("xoxb-REDACTED")
      expect(result.stdout).not.toContain("xoxb-secret")
    } finally {
      await removeDir(dir)
    }
  })

  it("uses environment channel before disk config", async () => {
    const dir = await makeTempDir("slack-shoot-env-")
    try {
      await runCli(["config", "set-default", "CDISK"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })
      const result = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir, SLACK_SHOOT_CHANNEL: "CENV" }
      })

      expect(result.stdout).toContain("Slack effective channel: CENV")
    } finally {
      await removeDir(dir)
    }
  })

  it("reports malformed JSON instead of silently replacing it", async () => {
    const dir = await makeTempDir("slack-shoot-bad-json-")
    try {
      await mkdir(dir, { recursive: true })
      await writeFile(join(dir, "config.json"), "{bad", "utf8")

      const result = await runCli(["config", "show"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("Config file is malformed")
    } finally {
      await removeDir(dir)
    }
  })

  it("writes config files with owner-only permissions where supported", async () => {
    const dir = await makeTempDir("slack-shoot-mode-")
    try {
      await runCli(["config", "set-default", "C123"], {
        env: { SLACK_SHOOT_CONFIG_DIR: dir }
      })
      await chmod(join(dir, "config.json"), 0o600)

      expect(await fileMode(join(dir, "config.json"))).toBe(0o600)
      expect(await readText(join(dir, "config.json"))).toContain("C123")
    } finally {
      await removeDir(dir)
    }
  })
})
