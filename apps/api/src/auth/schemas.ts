import { z } from 'zod';

const emailSchema = z.string().trim().email().max(254);

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
