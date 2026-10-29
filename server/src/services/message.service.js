import { query } from '../db/index.js';
import { TicketService } from './ticket.service.js';

export class MessageService {
  /**
   * Adds a reply or internal note to a ticket.
   */
  static async addMessage({ ticketId, user, message, isInternal = false }) {
    // 1. Verify access to ticket
    const ticket = await TicketService.getTicketById({ ticketId, user });

    // 2. Customers can NEVER create internal notes
    const effectiveIsInternal = user.role === 'agent' ? Boolean(isInternal) : false;

    // 3. Insert message
    const insertRes = await query(
      `INSERT INTO messages (ticket_id, sender_id, message, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING id, ticket_id, sender_id, message, is_internal, created_at`,
      [ticket.id, user.id, message.trim(), effectiveIsInternal]
    );

    const newMessage = insertRes.rows[0];

    // 4. If agent posted a public response and status is 'open', advance to 'in_progress'
    if (user.role === 'agent' && !effectiveIsInternal && ticket.status === 'open') {
      await query(
        `UPDATE tickets
         SET status = 'in_progress', updated_at = NOW()
         WHERE id = $1`,
        [ticket.id]
      );
    } else {
      await query(
        `UPDATE tickets
         SET updated_at = NOW()
         WHERE id = $1`,
        [ticket.id]
      );
    }

    return {
      ...newMessage,
      sender_name: user.name,
      sender_role: user.role,
    };
  }

  /**
   * Retrieves messages for a ticket.
   * STRICT ENFORCEMENT: Customer queries contain 'AND m.is_internal = FALSE' in the SQL itself.
   */
  static async getMessagesByTicketId({ ticketId, user }) {
    // Verify access to ticket first
    await TicketService.getTicketById({ ticketId, user });

    let sql = `
      SELECT
        m.id,
        m.ticket_id,
        m.sender_id,
        m.message,
        m.is_internal,
        m.created_at,
        u.name AS sender_name,
        u.role AS sender_role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = $1
    `;

    const params = [ticketId];

    if (user.role === 'customer') {
      // Enforce at SQL level that customers never receive internal notes
      sql += ' AND m.is_internal = FALSE';
    }

    sql += ' ORDER BY m.created_at ASC';

    const result = await query(sql, params);
    return result.rows;
  }
}
