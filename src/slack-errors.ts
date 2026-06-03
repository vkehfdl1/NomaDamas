import { ErrorCode } from "@slack/web-api/dist/errors.js"
import type { WebAPICallResult } from "@slack/web-api"
import { SlackError } from "./errors.js"

export function normalizeSlackError(error: unknown): SlackError {
  if (error instanceof SlackError) {
    return error
  }
  if (isRateLimitedError(error)) {
    return new SlackError("Slack rate limit persisted after retry")
  }
  if (isSlackPlatformError(error)) {
    return new SlackError(platformErrorMessage(error.data.error))
  }
  if (isSlackRequestError(error)) {
    return new SlackError("Slack network request failed")
  }
  if (isSlackHttpError(error)) {
    if (error.statusCode === 429) {
      return new SlackError("Slack rate limit persisted after retry")
    }
    return new SlackError(`Slack HTTP request failed with status ${error.statusCode}`)
  }
  if (error instanceof Error) {
    return new SlackError(error.message)
  }
  return new SlackError("Slack request failed")
}

export function isRateLimitedError(
  error: unknown
): error is Error & { readonly code: ErrorCode.RateLimitedError; readonly retryAfter: number } {
  return (
    isObject(error) &&
    error["code"] === ErrorCode.RateLimitedError &&
    typeof error["retryAfter"] === "number"
  )
}

function platformErrorMessage(code: string): string {
  switch (code) {
    case "invalid_auth":
    case "not_authed":
    case "account_inactive":
    case "token_revoked":
      return "Slack authentication failed"
    case "missing_scope":
      return "Slack app is missing required scope"
    case "channel_not_found":
      return "Slack channel was not found"
    case "not_in_channel":
      return "Slack bot is not in channel"
    default:
      return `Slack API error: ${code}`
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSlackPlatformError(
  error: unknown
): error is Error & { readonly code: ErrorCode.PlatformError; readonly data: WebAPICallResult & { readonly error: string } } {
  return (
    isObject(error) &&
    error["code"] === ErrorCode.PlatformError &&
    isObject(error["data"]) &&
    typeof error["data"]["error"] === "string"
  )
}

function isSlackRequestError(error: unknown): error is Error & { readonly code: ErrorCode.RequestError } {
  return isObject(error) && error["code"] === ErrorCode.RequestError
}

function isSlackHttpError(
  error: unknown
): error is Error & { readonly code: ErrorCode.HTTPError; readonly statusCode: number } {
  return (
    isObject(error) &&
    error["code"] === ErrorCode.HTTPError &&
    typeof error["statusCode"] === "number"
  )
}
