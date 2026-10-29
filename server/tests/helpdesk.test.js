import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../src/app.js';
import { pool, query } from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const request = supertest(app);

describe('Support Helpdesk MVP Test Suite', () => {
  // Helper to re-initialize DB schema cleanly
  const resetDb = async () => {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf8');
    await pool.query(schemaSql);
  };

  beforeAll(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  // 1. Input validation rejects bad payloads
  describe('1. Input validation rejects bad payloads', () => {
    it('rejects registration with invalid email, short password, or invalid role', async () => {
      const res = await request.post('/api/auth/register').send({
        name: 'A', // too short (< 2 chars)
        email: 'not-an-email',
        password: '123', // too short (< 6 chars)
        role: 'superadmin', // invalid role enum
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(Array.isArray(res.body.details)).toBe(true);

      const fields = res.body.details.map((d) => d.field);
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('password');
      expect(fields).toContain('role');
    });

    it('rejects ticket creation with subject < 3 chars or description < 10 chars', async () => {
      // Register customer
      const custRes = await request.post('/api/auth/register').send({
        name: 'Test Customer',
        email: 'validation_cust@test.com',
        password: 'password123',
        role: 'customer',
      });
      const cookie = custRes.headers['set-cookie'];

      const res = await request.post('/api/tickets')
        .set('Cookie', cookie)
        .send({
          subject: 'Hi',
          description: 'Too short',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects empty message payloads', async () => {
      const custRes = await request.post('/api/auth/login').send({
        email: 'validation_cust@test.com',
        password: 'password123',
      });
      const cookie = custRes.headers['set-cookie'];

      const res = await request.post('/api/tickets/1/messages')
        .set('Cookie', cookie)
        .send({
          message: '   ',
        });

      expect(res.status).toBe(400);
    });
  });

  // 2. Round robin order across agents
  describe('2. Round robin order across agents', () => {
    beforeEach(async () => {
      await resetDb();
    });

    it('assigns tickets sequentially in round-robin order to agents', async () => {
      // Create 3 agents
      const a1 = await request.post('/api/auth/register').send({ name: 'Agent 1', email: 'agent1@test.com', password: 'password123', role: 'agent' });
      const a2 = await request.post('/api/auth/register').send({ name: 'Agent 2', email: 'agent2@test.com', password: 'password123', role: 'agent' });
      const a3 = await request.post('/api/auth/register').send({ name: 'Agent 3', email: 'agent3@test.com', password: 'password123', role: 'agent' });

      const agent1Id = a1.body.user.id;
      const agent2Id = a2.body.user.id;
      const agent3Id = a3.body.user.id;

      // Create 1 customer
      const cust = await request.post('/api/auth/register').send({ name: 'Cust', email: 'cust@test.com', password: 'password123', role: 'customer' });
      const cookie = cust.headers['set-cookie'];

      // Create 5 tickets sequentially
      const t1 = await request.post('/api/tickets').set('Cookie', cookie).send({ subject: 'Ticket 1', description: 'Description for ticket 1' });
      const t2 = await request.post('/api/tickets').set('Cookie', cookie).send({ subject: 'Ticket 2', description: 'Description for ticket 2' });
      const t3 = await request.post('/api/tickets').set('Cookie', cookie).send({ subject: 'Ticket 3', description: 'Description for ticket 3' });
      const t4 = await request.post('/api/tickets').set('Cookie', cookie).send({ subject: 'Ticket 4', description: 'Description for ticket 4' });
      const t5 = await request.post('/api/tickets').set('Cookie', cookie).send({ subject: 'Ticket 5', description: 'Description for ticket 5' });

      expect(t1.body.ticket.assigned_agent_id).toBe(agent1Id);
      expect(t2.body.ticket.assigned_agent_id).toBe(agent2Id);
      expect(t3.body.ticket.assigned_agent_id).toBe(agent3Id);
      expect(t4.body.ticket.assigned_agent_id).toBe(agent1Id); // wrapped around
      expect(t5.body.ticket.assigned_agent_id).toBe(agent2Id);
    });
  });

  // 3. Round robin under concurrent creates
  describe('3. Round robin under concurrent creates', () => {
    beforeEach(async () => {
      await resetDb();
    });

    it('safely distributes concurrent ticket creates using row-level locking (SELECT FOR UPDATE)', async () => {
      // Create 3 agents
      const a1 = await request.post('/api/auth/register').send({ name: 'Agent 1', email: 'a1@test.com', password: 'password123', role: 'agent' });
      const a2 = await request.post('/api/auth/register').send({ name: 'Agent 2', email: 'a2@test.com', password: 'password123', role: 'agent' });
      const a3 = await request.post('/api/auth/register').send({ name: 'Agent 3', email: 'a3@test.com', password: 'password123', role: 'agent' });

      const agentIds = [a1.body.user.id, a2.body.user.id, a3.body.user.id];

      // Create 1 customer
      const cust = await request.post('/api/auth/register').send({ name: 'Cust', email: 'cust@test.com', password: 'password123', role: 'customer' });
      const cookie = cust.headers['set-cookie'];

      // Send 9 ticket creations concurrently
      const concurrentRequests = Array.from({ length: 9 }, (_, i) =>
        request.post('/api/tickets')
          .set('Cookie', cookie)
          .send({
            subject: `Concurrent Ticket ${i + 1}`,
            description: `Description for ticket ${i + 1} with sufficient length`,
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // Verify all succeeded
      responses.forEach((res) => {
        expect(res.status).toBe(201);
      });

      const assignedAgentIds = responses.map((r) => r.body.ticket.assigned_agent_id);

      // Each of the 3 agents should receive exactly 3 tickets
      const counts = {};
      assignedAgentIds.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });

      agentIds.forEach((id) => {
        expect(counts[id]).toBe(3);
      });
    });
  });

  // 4. SLA overdue logic
  describe('4. SLA overdue logic', () => {
    beforeEach(async () => {
      await resetDb();
    });

    it('correctly marks tickets overdue when past due, and clears overdue only on public agent replies (not internal notes)', async () => {
      // Register agent and customer
      const aRes = await request.post('/api/auth/register').send({ name: 'Agent Sam', email: 'sam@test.com', password: 'password123', role: 'agent' });
      const agentCookie = aRes.headers['set-cookie'];

      const cRes = await request.post('/api/auth/register').send({ name: 'Cust Clara', email: 'clara@test.com', password: 'password123', role: 'customer' });
      const custCookie = cRes.headers['set-cookie'];

      // Customer creates ticket
      const tRes = await request.post('/api/tickets').set('Cookie', custCookie).send({
        subject: 'Overdue SLA Test',
        description: 'Testing overdue first response SLA calculation',
      });
      const ticketId = tRes.body.ticket.id;

      // Verify initial SLA status (not overdue yet, 4 hours in future)
      const initialView = await request.get(`/api/tickets/${ticketId}`).set('Cookie', agentCookie);
      expect(initialView.body.ticket.is_overdue).toBe(false);
      expect(initialView.body.ticket.has_public_agent_reply).toBe(false);

      // Artificially simulate that first_response_due_at is 1 hour in the past
      await query("UPDATE tickets SET first_response_due_at = NOW() - INTERVAL '1 hour' WHERE id = $1", [ticketId]);

      // Check overdue status -> should now be overdue
      const overdueView = await request.get(`/api/tickets/${ticketId}`).set('Cookie', agentCookie);
      expect(overdueView.body.ticket.is_overdue).toBe(true);

      // Agent posts an INTERNAL NOTE
      await request.post(`/api/tickets/${ticketId}/messages`)
        .set('Cookie', agentCookie)
        .send({
          message: 'Internal note: Looking at customer logs.',
          is_internal: true,
        });

      // Internal note must NOT satisfy the SLA: ticket must STILL be overdue!
      const afterInternalView = await request.get(`/api/tickets/${ticketId}`).set('Cookie', agentCookie);
      expect(afterInternalView.body.ticket.is_overdue).toBe(true);
      expect(afterInternalView.body.ticket.has_public_agent_reply).toBe(false);

      // Agent posts a PUBLIC REPLY
      await request.post(`/api/tickets/${ticketId}/messages`)
        .set('Cookie', agentCookie)
        .send({
          message: 'Hello Clara, we have resolved your issue.',
          is_internal: false,
        });

      // Public reply satisfies SLA: is_overdue is now false!
      const afterPublicView = await request.get(`/api/tickets/${ticketId}`).set('Cookie', agentCookie);
      expect(afterPublicView.body.ticket.is_overdue).toBe(false);
      expect(afterPublicView.body.ticket.has_public_agent_reply).toBe(true);
    });
  });

  // 5. Customers never receive internal notes & never receive ai_* fields
  describe('5. Customers never receive internal notes or ai_* fields', () => {
    beforeEach(async () => {
      await resetDb();
    });

    it('enforces in SQL that internal notes and ai_* fields are never returned to customers', async () => {
      const aRes = await request.post('/api/auth/register').send({ name: 'Agent Alex', email: 'alex@test.com', password: 'password123', role: 'agent' });
      const agentCookie = aRes.headers['set-cookie'];

      const cRes = await request.post('/api/auth/register').send({ name: 'Customer Maya', email: 'maya@test.com', password: 'password123', role: 'customer' });
      const custCookie = cRes.headers['set-cookie'];

      // Create ticket
      const tRes = await request.post('/api/tickets').set('Cookie', custCookie).send({
        subject: 'Security and Privacy Check',
        description: 'Ensuring customer isolation and note confidentiality.',
      });
      const ticketId = tRes.body.ticket.id;

      // Verify customer creation response does not contain ai_* fields
      expect(tRes.body.ticket.ai_category).toBeUndefined();
      expect(tRes.body.ticket.ai_draft_reply).toBeUndefined();
      expect(tRes.body.ticket.ai_status).toBeUndefined();

      // Agent posts internal note and public reply
      await request.post(`/api/tickets/${ticketId}/messages`).set('Cookie', agentCookie).send({
        message: 'CONFIDENTIAL: Internal diagnostics note for agent eyes only.',
        is_internal: true,
      });

      await request.post(`/api/tickets/${ticketId}/messages`).set('Cookie', agentCookie).send({
        message: 'Public answer visible to customer.',
        is_internal: false,
      });

      // Customer fetches messages
      const custMessages = await request.get(`/api/tickets/${ticketId}/messages`).set('Cookie', custCookie);
      expect(custMessages.status).toBe(200);

      // Customer must only see 1 message (the public one)
      expect(custMessages.body.messages.length).toBe(1);
      expect(custMessages.body.messages[0].message).toBe('Public answer visible to customer.');
      expect(custMessages.body.messages[0].is_internal).toBe(false);

      // Customer fetches ticket details -> must not contain ai_* fields
      const custTicket = await request.get(`/api/tickets/${ticketId}`).set('Cookie', custCookie);
      expect(custTicket.body.ticket.ai_category).toBeUndefined();
      expect(custTicket.body.ticket.ai_draft_reply).toBeUndefined();
      expect(custTicket.body.ticket.ai_status).toBeUndefined();

      // Agent fetches messages -> agent sees BOTH (2 messages)
      const agentMessages = await request.get(`/api/tickets/${ticketId}/messages`).set('Cookie', agentCookie);
      expect(agentMessages.body.messages.length).toBe(2);
    });
  });

  // 6. Ticket creation still succeeds when the AI call fails
  describe('6. Ticket creation still succeeds when the AI call fails', () => {
    beforeEach(async () => {
      await resetDb();
    });

    it('succeeds immediately with HTTP 201 when AI fails, and records ai_status = failed', async () => {
      // Temporarily set an invalid Gemini key to trigger immediate AI failure
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'invalid_key_for_testing_failure';

      const cRes = await request.post('/api/auth/register').send({
        name: 'AI Test Customer',
        email: 'aitest@test.com',
        password: 'password123',
        role: 'customer',
      });
      const custCookie = cRes.headers['set-cookie'];

      const aRes = await request.post('/api/auth/register').send({
        name: 'AI Test Agent',
        email: 'aiagent@test.com',
        password: 'password123',
        role: 'agent',
      });
      const agentCookie = aRes.headers['set-cookie'];

      const startTime = Date.now();
      const ticketRes = await request.post('/api/tickets')
        .set('Cookie', custCookie)
        .send({
          subject: 'AI Failure Resilience Test',
          description: 'Testing that ticket creation never blocks on AI failures or timeouts.',
        });

      const responseTime = Date.now() - startTime;

      // Creation succeeds immediately
      expect(ticketRes.status).toBe(201);
      expect(ticketRes.body.ticket.id).toBeDefined();
      expect(responseTime).toBeLessThan(1500); // Created in well under 1.5s, not blocked

      // Allow background failure handler to write to DB
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Agent checks ticket -> ai_status must be 'failed'
      const agentView = await request.get(`/api/tickets/${ticketRes.body.ticket.id}`).set('Cookie', agentCookie);
      expect(agentView.body.ticket.ai_status).toBe('failed');

      // Restore key
      process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
