/**
 * Centralised, typed access to environment variables.
 * Storage (R2) variables are validated lazily so the app can boot and render
 * the gallery/admin UI even before R2 credentials are provided.
 */

function optional(key: string): string | undefined {
  const v = process.env[key]
  return v && v.length > 0 ? v : undefined
}

function required(key: string): string {
  const v = optional(key)
  if (!v) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return v
}

export const env = {
  databaseUrl: optional("DATABASE_URL"),
  betterAuthSecret: optional("BETTER_AUTH_SECRET"),
  betterAuthUrl: optional("BETTER_AUTH_URL") ?? optional("NEXT_PUBLIC_APP_URL"),
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
}

export const r2Env = {
  get accountId() {
    return required("R2_ACCOUNT_ID")
  },
  get accessKeyId() {
    return required("R2_ACCESS_KEY_ID")
  },
  get secretAccessKey() {
    return required("R2_SECRET_ACCESS_KEY")
  },
  get bucket() {
    return required("R2_BUCKET")
  },
  get publicUrl() {
    return optional("R2_PUBLIC_URL")
  },
  get endpoint() {
    return `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
  },
}

/** True when all R2 credentials are configured. */
export function isStorageConfigured(): boolean {
  return Boolean(
    optional("R2_ACCOUNT_ID") &&
      optional("R2_ACCESS_KEY_ID") &&
      optional("R2_SECRET_ACCESS_KEY") &&
      optional("R2_BUCKET"),
  )
}
