import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(255),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed'], {
    errorMap: () => ({ message: "Status must be 'open', 'in_progress', 'resolved', or 'closed'" }),
  }),
});
