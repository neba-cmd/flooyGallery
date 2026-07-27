import "server-only"
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { r2Env, isStorageConfigured } from "@/lib/env"

/**
 * Cloudflare R2 storage service (S3-compatible).
 *
 * Folder convention:
 *   events/<eventId>/previews/<file>    -> watermarked, compressed, public-safe
 *   events/<eventId>/originals/<file>   -> full-resolution, strictly private
 *
 * Customers never receive original object keys. Downloads of originals are only
 * ever exposed via short-lived presigned URLs generated after payment.
 */

let _client: S3Client | null = null

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: r2Env.endpoint,
      credentials: {
        accessKeyId: r2Env.accessKeyId,
        secretAccessKey: r2Env.secretAccessKey,
      },
    })
  }
  return _client
}

// ---- Key builders -----------------------------------------------------------

export function previewKey(eventId: string, filename: string): string {
  return `events/${eventId}/previews/${filename}`
}

export function originalKey(eventId: string, filename: string): string {
  return `events/${eventId}/originals/${filename}`
}

// ---- URL resolution ---------------------------------------------------------

/**
 * Public URL for a preview object. When R2_PUBLIC_URL (a public bucket domain
 * or custom domain fronted by Cloudflare's CDN) is configured we serve straight
 * from the CDN. Otherwise we fall back to the app's caching proxy route.
 */
export function resolvePreviewUrl(key: string): string {
  const base = r2Env.publicUrl
  if (base) {
    return `${base.replace(/\/$/, "")}/${key}`
  }
  return `/api/preview/${key}`
}

// ---- Presigned URLs ---------------------------------------------------------

/** Short-lived PUT URL so the browser can upload directly to R2. */
export async function createUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: r2Env.bucket,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds })
}

/** Short-lived GET URL for downloading a private original after payment. */
export async function createDownloadUrl(
  key: string,
  downloadFilename: string,
  expiresInSeconds = 60 * 60, // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: r2Env.bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(/"/g, "")}"`,
  })
  return getSignedUrl(client(), command, { expiresIn: expiresInSeconds })
}

/** Stream a preview object (used by the caching proxy fallback). */
export async function getObjectStream(key: string) {
  const command = new GetObjectCommand({ Bucket: r2Env.bucket, Key: key })
  return client().send(command)
}

export async function deleteObject(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: r2Env.bucket, Key: key }))
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  // R2/S3 allows up to 1000 keys per batch.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await client().send(
      new DeleteObjectsCommand({
        Bucket: r2Env.bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    )
  }
}

export { isStorageConfigured }
