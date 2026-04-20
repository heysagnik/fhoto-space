import { pgTable, text, uuid, boolean, timestamp, bigint, integer, index, bigserial } from "drizzle-orm/pg-core"
import { vector } from "drizzle-orm/pg-core"

// ─── Better Auth tables ───────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─── App tables ───────────────────────────────────────────────────────────────

export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  photographerId: text("photographer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("draft"),
  coverImageKey: text("cover_image_key"),
  coverImageUrl: text("cover_image_url"),
  welcomeMessage: text("welcome_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  spaceId: uuid("space_id")
    .notNull()
    .references(() => spaces.id, { onDelete: "cascade" }),
  originalKey: text("original_key").notNull(),
  thumbnailKey: text("thumbnail_key"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  width: integer("width"),
  height: integer("height"),
  faceIndexed: boolean("face_indexed").notNull().default(false),
  faceCount: integer("face_count").notNull().default(0),
  rekognitionFaceIds: text("rekognition_face_ids").array().default([]),
  faceBoundingBoxes: text("face_bounding_boxes"), // JSON: [{faceId,left,top,width,height}]
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const analyticsEvents = pgTable("analytics_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  meta: text("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const faceEmbeddings = pgTable("face_embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  photoId: uuid("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  spaceId: uuid("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  embedding: vector("embedding", { dimensions: 512 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("face_embeddings_space_idx").on(t.spaceId),
  index("face_embeddings_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
])
