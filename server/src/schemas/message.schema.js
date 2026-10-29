import { z } from 'zod';

export const createMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(5000, 'Message cannot exceed 5000 characters'),
  is_internal: z.boolean().optional().default(false),
});
