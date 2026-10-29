# Support Helpdesk MVP

A minimal, robust support helpdesk web application built with JavaScript, Node.js + Express, PostgreSQL (plain SQL via `pg`), React + Vite, Tailwind CSS, and Google Gemini AI.

---

## Architecture & Tech Stack

- **Frontend**: React 19 + Vite, Tailwind CSS (mobile-first, responsive, reusable component primitives).
- **Backend**: Node.js + Express, thin routes, domain services, plain SQL queries via `pg` (no ORM).
- **Database**: PostgreSQL 18 with row-level locks (`SELECT ... FOR UPDATE`) in transactions for race-condition-free round-robin routing.
- **Authentication**: JWT stored in `httpOnly` cookies with `bcrypt` (10 salt rounds) and role middleware.
- **Validation**: Strict input schema validation via `zod` returning structured JSON error details.
- **File Uploads**: `multer` handling image (`jpeg`, `png`, `webp`, `gif`) and `pdf` attachments up to 5 MB.
- **AI Copilot**: Google Gemini API free-tier background invocation with an 8-second timeout (`AbortController`).
- **Tests**: Vitest + Supertest covering concurrency, SLA calculation, data privacy, and validation.

---

## Demo Accounts

Pre-seeded credentials ready to test:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@demo.com` | `password123` | Has 3 tickets (active, overdue, and in-progress) |
| **Customer** | `david@demo.com` | `password123` | Has 1 resolved ticket |
| **Agent 1** | `agent1@demo.com` | `password123` | Sarah Connor (Assigned: Ticket #1, Ticket #4) |
| **Agent 2** | `agent2@demo.com` | `password123` | John Doe (Assigned: Ticket #2 - Overdue SLA) |
| **Agent 3** | `agent3@demo.com` | `password123` | Elena Rostova (Assigned: Ticket #3 - In Progress) |

> **Tip**: The login page also includes 1-click **Quick Demo Presets** to quickly populate credentials.

---

## Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js** v18+ (tested on v24.13.0)
- **PostgreSQL** (running locally on port 5432)

### 2. Configure Environment Variables
Copy `.env.example` into `server/.env` and adjust your database connection or Gemini API key if needed:

```bash
cp .env.example server/.env
```

Default configuration in `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/support_helpdesk
JWT_SECRET=supersecretjwtkey_min_32_characters_long_for_security_12345
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Initialize Database & Seed Demo Data
Run these commands from the root directory:

```bash
# Apply clean schema.sql tables
npm run setup-db

# Seed demo users, agents, sample tickets with attachments & overdue SLA
npm run seed
```

### 4. Run Automated Backend Tests
Run the test suite covering all test scenarios:
```bash
npm test
```

### 5. Start Development Servers

Open two terminal windows:

**Terminal 1 (Backend Server)**:
```bash
npm run dev:server
# Server starts at http://localhost:5000
```

**Terminal 2 (Frontend Client)**:
```bash
npm run dev:client
# Client starts at http://localhost:5173
```

Now open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Data Model & Schema

All tables are defined in plain SQL in `server/src/db/schema.sql` (no migrations library):

```
+-----------------------------------------------------------------------------------+
| users                                                                             |
|  id (SERIAL PK) | name | email (UNIQUE) | password_hash | role ('customer'|'agent')|
+-----------------------------------------------------------------------------------+
                                         │ 1
                                         │
                                         ▼ *
+-----------------------------------------------------------------------------------+
| tickets                                                                           |
|  id (SERIAL PK)                                                                   |
|  customer_id (FK -> users)                                                        |
|  assigned_agent_id (FK -> users, NULLable)                                        |
|  subject (VARCHAR)                                                                |
|  description (TEXT)                                                               |
|  status ('open' | 'in_progress' | 'resolved' | 'closed')                          |
|  attachment_url (VARCHAR) | attachment_name (VARCHAR)                             |
|  first_response_due_at (TIMESTAMP WITH TIME ZONE)                                 |
|  ai_category (VARCHAR) | ai_draft_reply (TEXT) | ai_status ('pending'|'completed'|'failed') |
+-----------------------------------------------------------------------------------+
                                         │ 1
                                         │
                                         ▼ *
+-----------------------------------------------------------------------------------+
| messages                                                                          |
|  id (SERIAL PK)                                                                   |
|  ticket_id (FK -> tickets)                                                        |
|  sender_id (FK -> users)                                                          |
|  message (TEXT)                                                                   |
|  is_internal (BOOLEAN DEFAULT FALSE)                                              |
|  created_at (TIMESTAMP WITH TIME ZONE)                                            |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
| assignment_state (Singleton table, id = 1)                                        |
|  id (INT PK CHECK (id = 1))                                                       |
|  last_assigned_agent_id (INT REFERENCES users)                                    |
|  updated_at (TIMESTAMP WITH TIME ZONE)                                            |
+-----------------------------------------------------------------------------------+
```

---

## Key Design Decisions

1. **Deterministic, Concurrency-Safe Round Robin**:
   - Tickets are assigned across agents in a PostgreSQL transaction (`BEGIN ... COMMIT`).
   - The singleton row `assignment_state WHERE id = 1` is locked using `SELECT last_assigned_agent_id FROM assignment_state WHERE id = 1 FOR UPDATE`.
   - Concurrent ticket submissions wait for the lock sequentially, eliminating race conditions and ensuring perfectly distributed loads (`[1, 2, 3, 1, 2, 3]`).

2. **Strict SQL-Level Data Confidentiality & Scoping**:
   - **Agent Isolation**: Agents can see and access only the tickets assigned directly to them (`WHERE t.assigned_agent_id = $1`). Accessing tickets belonging to another agent returns a 404.
   - **Internal Notes**: Customer queries strictly enforce `AND m.is_internal = FALSE` directly in SQL. Internal notes never leak to customers.
   - **AI Field Privacy**: Customers never receive `ai_*` fields (`ai_category`, `ai_draft_reply`, `ai_status`) in ticket responses or message responses.
   - **Customer Isolation**: Customer endpoint queries include an ownership condition (`WHERE customer_id = $1`) so cross-tenant ticket inspection returns a 404.

3. **SLA Overdue Logic**:
   - `first_response_due_at` is set to `created_at + 4 hours`.
   - SQL dynamically computes `is_overdue`:
     ```sql
     t.status NOT IN ('resolved', 'closed')
     AND t.first_response_due_at < NOW()
     AND NOT EXISTS (
       SELECT 1 FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.ticket_id = t.id
         AND m.is_internal = FALSE
         AND u.role = 'agent'
     )
     ```
   - Adding an **internal note does NOT fulfill the SLA**. Only a **public agent reply** clears the overdue SLA state.

4. **Non-Blocking Gemini AI Integration with Resilient Fallback**:
   - Background call triggered immediately after ticket insertion; ticket creation responds in ~100ms without blocking.
   - 8-second hard timeout enforced via `AbortController`.
   - If Gemini is slow, unreachable, or rate-limited, `ai_status` is updated to `'failed'`. The agent interface gracefully displays `"AI unavailable, write manually"`.
   - When AI succeeds, the agent can inspect the suggested draft and click **"Insert Draft into Reply Box"** to edit before sending.

5. **Cookie-Based Auth & CSRF Protection**:
   - Authentication tokens are issued as JSON Web Tokens stored in `httpOnly`, `sameSite: 'lax'` cookies.
   - Vite development server proxies `/api` and `/uploads` directly to `http://localhost:5000` to prevent cookie drop across different ports.

---

## Test Verification

The test suite in `server/tests/helpdesk.test.js` covers 9 test cases across all core criteria:

```bash
npm test
```

- **Round-Robin Order**: Assigns sequential tickets across agents with wrap-around.
- **Concurrent Creates Under Load**: Validates `SELECT ... FOR UPDATE` distributes 9 simultaneous tickets evenly.
- **SLA Overdue Logic**: Verifies overdue badge triggers after deadline, internal notes do not clear SLA, and public replies fulfill SLA.
- **Confidentiality & Agent Scoping**: Verifies customers cannot view internal notes or `ai_*` attributes, and agents can only view tickets assigned to them.
- **AI Resilience**: Ticket creation still responds with HTTP 201 when the AI API fails.
- **Zod Validation**: Malformed payload rejection with field-specific errors.

---

## Finished vs. Future Scope

### What is Finished:
- Full customer workflow: registration/login, ticket creation with image/PDF attachments (Multer 5MB limit), ticket status tracking, response SLA countdown, public conversation thread.
- Full agent workflow: viewing assigned tickets, customer details, SLA countdown & overdue warnings, AI draft & category suggestions, editable draft composer, public reply vs internal note toggle, status update controls.
- Safe round-robin agent assignment with database transaction locking.
- Agent assignment isolation (agents only see tickets assigned to them).
- Background AI integration with Gemini free-tier REST endpoint and 8-second timeout.
- 100% automated test coverage for backend logic with Vitest + Supertest.
- Automated seed script with demo tickets showcasing all states.

### What I Would Do With More Time:
1. **Real-time WebSockets / SSE**: Use Server-Sent Events to push new customer messages and live AI draft completions to the agent view without page reloads.
2. **Email Notifications**: Dispatch transactional email notifications to customers on agent public replies.
3. **Advanced SLA Business Hours**: Calculate SLA based on business operating hours (e.g. 9 AM - 5 PM weekdays) rather than raw wall-clock time.
4. **Cloud Object Storage**: Transition from local disk storage (`uploads/`) to S3 / Google Cloud Storage with pre-signed URLs.
5. **Cross-Agent Ticket Visibility & Coverage Reassignment**: Allow agents to view tickets assigned to other teammates and implement an out-of-office / reassignment workflow so that if one agent is unavailable or on leave, another agent can step in and handle their tickets.

---

## AI Tools Used & Purpose

- **Gemini API (`gemini-2.5-flash`)**: Used directly inside the application backend service (`AiService`) to automatically analyze ticket descriptions, infer a standardized issue category, and draft an empathetic initial reply for support agents.
- **Coding Assistant**: Used for project scaffolding, transaction design with row-level locks, and formulating test cases.
