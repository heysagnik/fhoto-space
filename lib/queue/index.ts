import { PgBoss } from "pg-boss"

declare global {
  // eslint-disable-next-line no-var
  var __pgboss: PgBoss | undefined
}

export const FACE_INDEX_QUEUE = "face-index"

export interface FaceIndexJob {
  photoId: string
  spaceId: string
  thumbnailKey: string
}

export async function getQueue(): Promise<PgBoss> {
  if (global.__pgboss) return global.__pgboss

  const boss = new PgBoss(process.env.DATABASE_URL!)
  await boss.start()
  global.__pgboss = boss
  return boss
}

export async function enqueueFaceIndex(job: FaceIndexJob): Promise<void> {
  const boss = await getQueue()
  await boss.send(FACE_INDEX_QUEUE, job, { retryLimit: 3, retryDelay: 30 })
}
