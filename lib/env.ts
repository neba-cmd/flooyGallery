/**
 * Centralised, typed access to environment variables.
 * Storage (R2) variables are validated lazily so the app can boot and render
 * the gallery/admin UI even before R2 credentials are provided.
 */

function optional(key: string): string | undefined {
  const v = process.env[key]
  return v && v.length > 0 ? v : undefined
}

export function requiredEnv(key: string): string {
  const v = optional(key)
  if (!v) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return v
}

export const env = {
  get databaseUrl() {
    return requiredEnv("DATABASE_URL")
  },
  get betterAuthSecret() {
    const secret = requiredEnv("BETTER_AUTH_SECRET")
    if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters")
    return secret
  },
  get betterAuthUrl() {
    const value = optional("BETTER_AUTH_URL") ?? optional("NEXT_PUBLIC_APP_URL")
    if (!value && process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL is required in production")
    }
    return value ?? "http://localhost:3000"
  },
  appUrl: optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
}

export const r2Env = {
  get accountId() {
    return requiredEnv("R2_ACCOUNT_ID")
  },
  get accessKeyId() {
    return requiredEnv("R2_ACCESS_KEY_ID")
  },
  get secretAccessKey() {
    return requiredEnv("R2_SECRET_ACCESS_KEY")
  },
  get bucket() {
    return requiredEnv("R2_BUCKET")
  },
  get publicUrl() {
    return optional("R2_PUBLIC_URL")
  },
  get endpoint() {
    return `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`
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
