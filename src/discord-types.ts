export type PostedDiscordMessage = {
  readonly channel: string
  readonly id: string
}

export type UploadedDiscordFile = {
  readonly channel: string
  readonly filename: string
}

export type DiscordClient = {
  readonly authTest: (token: string) => Promise<void>
  readonly postMessage: (input: {
    readonly token: string
    readonly channel: string
    readonly text: string
  }) => Promise<PostedDiscordMessage>
  readonly uploadFile: (input: {
    readonly token: string
    readonly channel: string
    readonly filePath: string
    readonly message?: string
  }) => Promise<UploadedDiscordFile>
}
