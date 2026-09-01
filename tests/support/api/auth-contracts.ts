import { z } from 'zod';

export const publicUserSchema = z.object({
  createdAt: z.string().datetime(),
  email: z.string().email(),
  id: z.string().uuid(),
  name: z.string(),
  updatedAt: z.string().datetime(),
});

export const registerResponseSchema = z.object({
  user: publicUserSchema,
});

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserSchema,
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
