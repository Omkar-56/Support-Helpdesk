import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  console.log('--- Starting Support Helpdesk Database Seed ---');

  try {
    // 1. Reset tables with schema.sql
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('✓ Clean database schema initialized');

    // 2. Hash password for all demo users
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('password123', saltRounds);

    // 3. Create Agents
    const agents = [
      { name: 'Sarah Connor', email: 'agent1@demo.com' },
      { name: 'John Doe', email: 'agent2@demo.com' },
      { name: 'Elena Rostova', email: 'agent3@demo.com' },
    ];

    const agentIds = [];
    for (const a of agents) {
      const res = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'agent')
         RETURNING id`,
        [a.name, a.email, passwordHash]
      );
      agentIds.push(res.rows[0].id);
    }
    console.log(`✓ Created 3 support agents (IDs: ${agentIds.join(', ')})`);

    // 4. Create Customers
    const customers = [
      { name: 'Alex Martin', email: 'customer@demo.com' },
      { name: 'David Miller', email: 'david@demo.com' },
    ];

    const customerIds = [];
    for (const c of customers) {
      const res = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'customer')
         RETURNING id`,
        [c.name, c.email, passwordHash]
      );
      customerIds.push(res.rows[0].id);
    }
    console.log(`✓ Created demo customers (IDs: ${customerIds.join(', ')})`);

    // Ensure a dummy attachment file exists for demonstration
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const sampleAttachmentFilename = 'sample_invoice_error.png';
    const sampleAttachmentPath = path.join(uploadsDir, sampleAttachmentFilename);
    if (!fs.existsSync(sampleAttachmentPath)) {
      // 1x1 transparent PNG binary bytes
      const samplePng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64'
      );
      fs.writeFileSync(sampleAttachmentPath, samplePng);
    }

    // 5. Seed Sample Tickets
    // Ticket 1: Active Open ticket with AI draft and active SLA (due in ~3.5 hours)
    const t1 = await query(
      `INSERT INTO tickets (
        customer_id, assigned_agent_id, subject, description, status,
        first_response_due_at, ai_category, ai_draft_reply, ai_status, created_at, updated_at
      ) VALUES (
        $1, $2,
        'Cannot access billing invoice download',
        'Whenever I navigate to Settings > Billing and click Download Invoice, the page spins indefinitely and shows error 504 gateway timeout.',
        'open',
        NOW() + INTERVAL '3 hours 30 minutes',
        'Billing Issue',
        'Dear Alex,\n\nThank you for reaching out to support. We apologize for the trouble accessing your invoice download.\n\nOur billing engineering team is investigating the 504 Gateway Timeout on that endpoint. Could you please confirm which invoice month you are trying to download so we can manually generate and email it to you in the meantime?\n\nBest regards,\nSarah Connor',
        'completed',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '30 minutes'
      ) RETURNING id`,
      [customerIds[0], agentIds[0]]
    );

    // Ticket 2: OVERDUE SLA ticket (created 5 hours ago, due 1 hour ago, no public agent reply yet)
    // -> UI will show red flashing badge "SLA Overdue"
    const t2 = await query(
      `INSERT INTO tickets (
        customer_id, assigned_agent_id, subject, description, status,
        attachment_url, attachment_name,
        first_response_due_at, ai_category, ai_draft_reply, ai_status, created_at, updated_at
      ) VALUES (
        $1, $2,
        'Critical API rate limit triggered unexpectedly',
        'Our production webhook service received 429 Too Many Requests errors starting this morning despite our enterprise tier agreement. Attached error screenshot.',
        'open',
        '/uploads/sample_invoice_error.png',
        'rate_limit_error.png',
        NOW() - INTERVAL '1 hour',
        'Technical Issue',
        'Dear Alex,\n\nThank you for reporting this critical issue. We understand this impacts your production service.\n\nI am escalating this directly to our infrastructure team to review your tier quota limits and adjust your threshold immediately.\n\nSincerely,\nJohn Doe',
        'completed',
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '5 hours'
      ) RETURNING id`,
      [customerIds[0], agentIds[1]]
    );

    // Ticket 3: In-Progress ticket with an INTERNAL NOTE and a PUBLIC REPLY
    const t3 = await query(
      `INSERT INTO tickets (
        customer_id, assigned_agent_id, subject, description, status,
        first_response_due_at, ai_category, ai_draft_reply, ai_status, created_at, updated_at
      ) VALUES (
        $1, $2,
        'SSO login failing for team members with Okta',
        'Users logging in via SAML 2.0 receive "Invalid assertion signature" error code SEC_401.',
        'in_progress',
        NOW() + INTERVAL '2 hours',
        'Security / Authentication',
        'Hello Alex,\n\nWe are looking into the Okta certificate expiration.',
        'completed',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour'
      ) RETURNING id`,
      [customerIds[0], agentIds[2]]
    );

    // Messages for Ticket 3:
    // Message 1 (Internal Note - only agents see this!)
    await query(
      `INSERT INTO messages (ticket_id, sender_id, message, is_internal, created_at)
       VALUES ($1, $2, $3, TRUE, NOW() - INTERVAL '90 minutes')`,
      [
        t3.rows[0].id,
        agentIds[2],
        'Internal note for teammates: Okta certificate expired on their tenant. I verified the certificate fingerprint against our IdP config.',
      ]
    );

    // Message 2 (Public Reply - customer sees this)
    await query(
      `INSERT INTO messages (ticket_id, sender_id, message, is_internal, created_at)
       VALUES ($1, $2, $3, FALSE, NOW() - INTERVAL '60 minutes')`,
      [
        t3.rows[0].id,
        agentIds[2],
        'Hello Alex, we inspected the SAML metadata and noticed the X.509 certificate on your Okta application configuration expired yesterday. Could you please regenerate the certificate in your Okta Admin dashboard and upload the new metadata XML?',
      ]
    );

    // Message 3 (Customer response)
    await query(
      `INSERT INTO messages (ticket_id, sender_id, message, is_internal, created_at)
       VALUES ($1, $2, $3, FALSE, NOW() - INTERVAL '30 minutes')`,
      [
        t3.rows[0].id,
        customerIds[0],
        'Thank you Elena! Our IT administrator is updating the Okta certificate right now.',
      ]
    );

    // Ticket 4: Resolved ticket
    const t4 = await query(
      `INSERT INTO tickets (
        customer_id, assigned_agent_id, subject, description, status,
        first_response_due_at, ai_category, ai_draft_reply, ai_status, created_at, updated_at
      ) VALUES (
        $1, $2,
        'Password reset link not arriving in email',
        'I requested a password reset three times but never received the email in my inbox or spam folder.',
        'resolved',
        NOW() - INTERVAL '20 hours',
        'Account Access',
        'Hello, we unblocked your email address.',
        'completed',
        NOW() - INTERVAL '24 hours',
        NOW() - INTERVAL '18 hours'
      ) RETURNING id`,
      [customerIds[1], agentIds[0]]
    );

    // Message for Ticket 4
    await query(
      `INSERT INTO messages (ticket_id, sender_id, message, is_internal, created_at)
       VALUES ($1, $2, $3, FALSE, NOW() - INTERVAL '22 hours')`,
      [
        t4.rows[0].id,
        agentIds[0],
        'Hi David, your corporate mail server was temporarily rejecting transactional emails. We cleared the bounce flag and resent your password reset link. Please check your inbox now!',
      ]
    );

    // 6. Update assignment_state so next ticket goes to agent 2 (ID: agentIds[1])
    await query('UPDATE assignment_state SET last_assigned_agent_id = $1, updated_at = NOW() WHERE id = 1', [
      agentIds[0],
    ]);

    console.log('✓ Seeded 4 sample tickets across different states:');
    console.log('   - Ticket #1: Open with active SLA (due in ~3.5h) & AI draft reply');
    console.log('   - Ticket #2: Open with OVERDUE SLA (due 1h ago) & sample file attachment');
    console.log('   - Ticket #3: In Progress with Internal Note (staff-only) and Public Reply thread');
    console.log('   - Ticket #4: Resolved ticket with fulfilled SLA');
    console.log('\n--- Seed complete! Demo credentials: ---');
    console.log('Customer: customer@demo.com  / password123');
    console.log('Customer: david@demo.com     / password123');
    console.log('Agent 1:  agent1@demo.com    / password123 (Sarah Connor)');
    console.log('Agent 2:  agent2@demo.com    / password123 (John Doe)');
    console.log('Agent 3:  agent3@demo.com    / password123 (Elena Rostova)');
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
