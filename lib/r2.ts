import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
})

/**
 * Generate a presigned PUT URL for a Cloudflare R2 object.
 * @param key - Object key (e.g. `spaces/{spaceId}/originals/{photoId}.jpg`)
 * @param contentType - MIME type of the file being uploaded
 * @returns Presigned URL valid for 10 minutes
 */
export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn: 600 })
}

export const r2Client = r2

export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  const response = await r2.send(command)
  if (!response.Body) {
    throw new Error(`Object not found: ${key}`)
  }
  const chunks = await response.Body.transformToByteArray()
  return Buffer.from(chunks)
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: body,
    ContentType: contentType,
  })
  await r2.send(command)
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  await r2.send(command)
}

export function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL
  if (!base) {
    throw new Error("R2_PUBLIC_URL is not set")
  }
  return `${base.replace(/\/$/, "")}/${key}`
}
