import { getClient, query } from '../db/index.js';

export class TicketService {
  /**
   * Creates a new ticket assigned to an agent using safe round-robin in a DB transaction with SELECT FOR UPDATE.
   */
  static async createTicket({ customerId, subject, description, attachmentUrl = null, attachmentName = null }) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // 1. Fetch available agents ordered by ID
      const agentsRes = await client.query(
        "SELECT id FROM users WHERE role = 'agent' ORDER BY id ASC"
      );
      const agents = agentsRes.rows;

      let assignedAgentId = null;

      if (agents.length > 0) {
        // 2. Lock assignment_state singleton row with FOR UPDATE
        const stateRes = await client.query(
          'SELECT last_assigned_agent_id FROM assignment_state WHERE id = 1 FOR UPDATE'
        );

        const lastAssignedId = stateRes.rows[0]?.last_assigned_agent_id;
        let nextIndex = 0;

        if (lastAssignedId !== null && lastAssignedId !== undefined) {
          const currentIndex = agents.findIndex((a) => a.id === lastAssignedId);
          if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % agents.length;
          }
        }

        assignedAgentId = agents[nextIndex].id;

        // 3. Update assignment_state within the transaction
        await client.query(
          'UPDATE assignment_state SET last_assigned_agent_id = $1, updated_at = NOW() WHERE id = 1',
          [assignedAgentId]
        );
      }

      // 4. Insert ticket with first_response_due_at = NOW() + 4 hours
      const insertSql = `
        INSERT INTO tickets (
          customer_id,
          assigned_agent_id,
          subject,
          description,
          attachment_url,
          attachment_name,
          first_response_due_at,
          ai_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          NOW() + INTERVAL '4 hours',
          'pending'
        )
        RETURNING *;
      `;

      const ticketRes = await client.query(insertSql, [
        customerId,
        assignedAgentId,
        subject.trim(),
        description.trim(),
        attachmentUrl,
        attachmentName,
      ]);

      await client.query('COMMIT');
      return ticketRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves list of tickets filtered by user role and ownership.
   */
  static async getTickets({ user, status = null }) {
    const isCustomer = user.role === 'customer';

    // Base fields
    const customerFields = `
      t.id, t.customer_id, t.assigned_agent_id, t.subject, t.description,
      t.status, t.attachment_url, t.attachment_name, t.first_response_due_at,
      t.created_at, t.updated_at,
      u_cust.name AS customer_name,
      u_agent.name AS agent_name,
      (
        t.status NOT IN ('resolved', 'closed')
        AND t.first_response_due_at < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.ticket_id = t.id
            AND m.is_internal = FALSE
            AND u.role = 'agent'
        )
      ) AS is_overdue,
      EXISTS (
        SELECT 1 FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = t.id
          AND m.is_internal = FALSE
          AND u.role = 'agent'
      ) AS has_public_agent_reply
    `;

    // Agents also receive ai_* fields
    const agentFields = `${customerFields}, t.ai_category, t.ai_draft_reply, t.ai_status`;

    const selectedFields = isCustomer ? customerFields : agentFields;

    let sql = `
      SELECT ${selectedFields}
      FROM tickets t
      JOIN users u_cust ON t.customer_id = u_cust.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
    `;

    const conditions = [];
    const params = [];

    if (isCustomer) {
      params.push(user.id);
      conditions.push(`t.customer_id = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY t.created_at DESC';

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Retrieves a single ticket by ID, enforcing role/ownership and sanitizing AI fields for customers.
   */
  static async getTicketById({ ticketId, user }) {
    const isCustomer = user.role === 'customer';

    const customerFields = `
      t.id, t.customer_id, t.assigned_agent_id, t.subject, t.description,
      t.status, t.attachment_url, t.attachment_name, t.first_response_due_at,
      t.created_at, t.updated_at,
      u_cust.name AS customer_name,
      u_agent.name AS agent_name,
      (
        t.status NOT IN ('resolved', 'closed')
        AND t.first_response_due_at < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.ticket_id = t.id
            AND m.is_internal = FALSE
            AND u.role = 'agent'
        )
      ) AS is_overdue,
      EXISTS (
        SELECT 1 FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.ticket_id = t.id
          AND m.is_internal = FALSE
          AND u.role = 'agent'
      ) AS has_public_agent_reply
    `;

    const agentFields = `${customerFields}, t.ai_category, t.ai_draft_reply, t.ai_status`;
    const selectedFields = isCustomer ? customerFields : agentFields;

    let sql = `
      SELECT ${selectedFields}
      FROM tickets t
      JOIN users u_cust ON t.customer_id = u_cust.id
      LEFT JOIN users u_agent ON t.assigned_agent_id = u_agent.id
      WHERE t.id = $1
    `;

    const params = [ticketId];

    if (isCustomer) {
      sql += ' AND t.customer_id = $2';
      params.push(user.id);
    }

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }

    return result.rows[0];
  }

  /**
   * Updates ticket status (e.g. open -> in_progress -> resolved -> closed).
   */
  static async updateStatus({ ticketId, status, user }) {
    // Agents can update any ticket, customers can close their own tickets
    const ticket = await this.getTicketById({ ticketId, user });

    const result = await query(
      `UPDATE tickets
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, status, updated_at`,
      [status, ticket.id]
    );

    return result.rows[0];
  }
}
