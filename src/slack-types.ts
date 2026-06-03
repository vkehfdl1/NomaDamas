import type { CachedChannel } from "./config.js"

export type PostedMessage = {
  readonly channel: string
  readonly ts: string
}

export type UploadedFile = {
  readonly channel: string
  readonly filename: string
  readonly order: string
}

export type SlackClient = {
  readonly authTest: (token: string) => Promise<void>
  readonly listChannels: (token: string) => Promise<readonly CachedChannel[]>
  readonly postMessage: (input: {
    readonly token: string
    readonly channel: string
    readonly text: string
  }) => Promise<PostedMessage>
  readonly uploadFile: (input: {
    readonly token: string
    readonly channel: string
    readonly filePath: string
    readonly message?: string
    readonly uploadIndex: number
  }) => Promise<UploadedFile>
}
