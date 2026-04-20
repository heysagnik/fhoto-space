import { z } from "zod"

export const createSpaceSchema = z.object({
  name: z.string().min(2, "Space name must be at least 2 characters"),
})

export const updateSpaceSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  welcomeMessage: z.string().max(200).optional().nullable(),
})

export const presignQuerySchema = z.object({
  spaceId: z.string().uuid("Invalid space ID"),
  filename: z.string().min(1, "Filename is required"),
})

export const confirmPhotoSchema = z.object({
  photoId: z.string().uuid("Invalid photo ID"),
})
