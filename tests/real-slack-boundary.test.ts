import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("real Slack boundary", () => {
  it("uses Slack WebClient and the external upload methods outside mock mode", async () => {
    const source = await readText("src/slack-web.ts")

    expect(source).toContain("@slack/web-api")
    expect(source).toContain("new WebClient")
    expect(source).toContain("chat.postMessage")
    expect(source).toContain("files.getUploadURLExternal")
    expect(source).toContain("files.completeUploadExternal")
    expect(source).toContain('from "ky"')
  })
})
