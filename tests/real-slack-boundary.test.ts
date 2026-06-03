import { describe, expect, it } from "vitest"
import { readText } from "./helpers.js"

describe("real Slack boundary", () => {
  it("uses Slack WebClient and Slack upload V2 outside mock mode", async () => {
    const source = await readText("src/slack-web.ts")

    expect(source).toContain("@slack/web-api")
    expect(source).toContain("new WebClient")
    expect(source).toContain("chat.postMessage")
    expect(source).toContain("filesUploadV2")
    expect(source).not.toContain("files.getUploadURLExternal")
    expect(source).not.toContain("files.completeUploadExternal")
    expect(source).not.toContain("new Blob([fileData])")
    expect(source).not.toContain('from "ky"')
  })
})
