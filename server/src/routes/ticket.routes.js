import { Router } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { createTicketSchema, updateTicketStatusSchema } from '../schemas/ticket.schema.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { handleOptionalAttachment } from '../middleware/upload.middleware.js';

export const ticketRouter = Router();

// Create new ticket (customer only)
ticketRouter.post(
  '/',
  requireAuth,
  requireRole('customer'),
  handleOptionalAttachment('attachment'),
  validateBody(createTicketSchema),
  async (req, res, next) => {
    try {
      const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const attachmentName = req.file ? req.file.originalname : null;

      const ticket = await TicketService.createTicket({
        customerId: req.user.id,
        subject: req.body.subject,
        description: req.body.description,
        attachmentUrl,
        attachmentName,
      });

      // Customers must never receive ai_* fields
      const { ai_category, ai_draft_reply, ai_status, ...safeTicket } = ticket;

      res.status(201).json({
        message: 'Ticket created successfully',
        ticket: safeTicket,
      });
    } catch (err) {
      next(err);
    }
  }
);

// List tickets (customers see their own; agents see all)
ticketRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const tickets = await TicketService.getTickets({
      user: req.user,
      status: req.query.status,
    });
    res.status(200).json({ tickets });
  } catch (err) {
    next(err);
  }
});

// Get single ticket details
ticketRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const ticket = await TicketService.getTicketById({
      ticketId,
      user: req.user,
    });

    res.status(200).json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Update ticket status
ticketRouter.patch(
  '/:id/status',
  requireAuth,
  validateBody(updateTicketStatusSchema),
  async (req, res, next) => {
    try {
      const ticketId = parseInt(req.params.id, 10);
      if (isNaN(ticketId)) {
        return res.status(400).json({ error: 'Invalid ticket ID' });
      }

      const ticket = await TicketService.updateStatus({
        ticketId,
        status: req.body.status,
        user: req.user,
      });

      res.status(200).json({
        message: 'Ticket status updated successfully',
        ticket,
      });
    } catch (err) {
      next(err);
    }
  }
);
