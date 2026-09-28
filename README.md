# Zoko Support Intelligence Tool

A pnpm monorepo containing a React support dashboard, an Express ingestion and metrics API, PostgreSQL storage, and PostHog analytics.

## Task 1 - Support Intelligence Tool

### Stack

- Client: React, TypeScript, Vite, Tailwind CSS, TanStack Query, and Recharts
- Server: Express, TypeScript, TypeORM, Zod, and PostgreSQL
- Integrations: Zoko REST APIs and webhooks

### Setup

Prerequisites: Node.js, pnpm 11, Docker, a Zoko API key, and a PostHog project.

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/client/.env.example apps/client/.env
```

Configure `apps/server/.env`:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zoko
DB_USER=postgres
DB_PASSWORD=<password>
DB_LOGGING=false

ZOKO_API_KEY=<zoko-api-key>
ZOKO_ALLOWED_RECIPIENT_PHONE=<test-number-without-plus-prefix>

POSTHOG_PROJECT_TOKEN=<posthog-project-token>
POSTHOG_HOST=https://us.i.posthog.com
```

Configure `apps/client/.env`:

```ini
API_BASE_URL=http://localhost:8000
```

Start PostgreSQL, build the server, and run the migrations:

```bash
pnpm db:up
pnpm build:server
pnpm --filter @zoko/server exec typeorm migration:run -d dist/database.js
```

Run the applications in separate terminals:

```bash
pnpm run:server
pnpm run:client
```

The client runs through Vite and proxies `/api` requests to the server at `http://localhost:8000`.

### Zoko ingestion

Synchronize agents once after setup:

```bash
curl -X POST http://localhost:8000/api/ingestion/sync/agents
```

The server runs a six-minute cron job that:

1. Fetches the next page of Zoko customers using a persisted database checkpoint.
2. Fetches message history for customers that have not been synchronized before.

The same operations can be triggered manually:

```bash
curl -X POST http://localhost:8000/api/ingestion/sync/customers
curl -X POST http://localhost:8000/api/ingestion/sync/customer-messages
```

For live ingestion, expose port `8000` through an HTTPS tunnel such as ngrok and register this URL in Zoko:

```text
https://<public-host>/webhooks/zoko
```

Supported webhook events:

- `message:user:in`
- `message:store:out`
- `message:delivery:update`
- `zoko:chat:assigned`
- `zoko:chat:closed`

Webhook writes use database transactions. Customer-row locks serialize concurrent conversation changes for the same customer.

### What the application provides

The overview dashboard shows:

- Total messages
- Paginated messages per customer
- Average and median human and bot first response time
- Average and median resolution time
- Per-agent conversations handled, FRT, resolution time, reassigned chats, and reassignment rate
- Automatic metric polling every 30 seconds and manual refresh

The conversation workspace provides:

- Open and closed conversations
- Customer name and phone number
- Current assigned agent
- Chronological message history and delivery status
- Message sending for eligible open conversations

Sending is restricted to `ZOKO_ALLOWED_RECIPIENT_PHONE`. The server rejects every other recipient.

### Metric definitions

| Metric | Calculation |
| --- | --- |
| Total messages | Count of all rows in `messages`. |
| Messages per customer | Message count grouped by `customer_id`. |
| Human FRT | Time from the first customer message in a conversation to the first subsequent store message with a non-null `sender_agent_id`. |
| Bot FRT | Time from the first customer message in a conversation to the first subsequent store message with a null `sender_agent_id`. |
| Resolution time | `closed_at - opened_at` for closed conversations. |
| Conversations handled | Distinct conversations assigned to an agent. |
| Agent FRT | Human FRT attributed to the agent who sent the first human response. |
| Agent resolution time | Resolution time attributed to the agent who closed the conversation. |
| Reassigned chats | Distinct conversations subsequently assigned away from an agent. |
| Reassignment rate | `reassigned chats / conversations handled`. This is the additional metric beyond the take-home requirements. |

Average is the arithmetic mean. Median is the middle sorted value, or the average of the two middle values for an even sample size.

### Metric assumptions and limitations

- Metrics are all-time; no date filtering is applied.
- An inbound customer message or assignment opens a conversation when that customer has no open conversation.
- An outgoing store message attaches to the current open conversation but does not create one.
- A close webhook closes the customer's current open conversation.
- The latest assignment is treated as the current assigned agent; assignment rows retain reassignment history.
- Duplicate adjacent assignments to the same agent are assumed not to occur in Zoko.
- A store message with `sender_agent_id = null` is classified as a bot response. An unmatched human agent email can therefore be misclassified as bot activity.
- Only responses occurring at or after the first customer message are eligible for FRT.
- Negative resolution durations are excluded independently from other metrics.
- Closed conversations without a closing agent contribute to global resolution time but not per-agent resolution time.
- Historical customer messages contribute to total messages and messages per customer. They have no local conversation linkage, so they are excluded from FRT and resolution calculations.
- Historical messages are currently stored without `sender_agent_id`; historical per-agent message counts are therefore incomplete. Live dashboard messages are attributed through the webhook's `agentEmail`.
- Reassigned chats count unique conversations, not the total number of assignment transitions.

### Client screenshots

#### Support overview

> Screenshot placeholder - to be added.

#### Conversation workspace

> Screenshot placeholder - to be added.

## Task 2 - PostHog Analytics

PostHog is integrated on the server with `posthog-node`. A single client instance is created at application startup, injected through `PostHogService`, and flushed during graceful shutdown. Analytics events are emitted only after the corresponding database transaction commits.

### Captured events

| Event | Trigger and identity |
| --- | --- |
| `conversation_opened` | A new conversation is persisted. Uses `conversation:<id>` as its PostHog distinct ID. |
| `conversation_closed` | An open conversation becomes closed. Uses the same conversation distinct ID. |
| `csat_asked` | `POST /api/conversations/:conversationId/csat/ask` is called for a closed conversation. |
| `csat_received` | `POST /api/conversations/:conversationId/csat/response` is called with a rating from 1 to 5. |
| `message_event` | A live or historically synchronized message is ingested. The original platform timestamp is preserved. |
| `agent_metrics_updated` | An agent's aggregate metrics are refreshed and linked to the PostHog `agent` group. |

The CSAT endpoints provide a controlled way to demonstrate the funnel while a production WhatsApp CSAT flow is unavailable. Conversation events use the conversation ID—not the customer ID—so separate conversations from the same customer remain separate funnel participants.

Each Zoko agent is modelled as a PostHog `agent` group with these properties:

- `name`
- `email`
- `messagesSent`
- `conversationsHandled`

Run the one-time backfills after the database has been populated:

```bash
pnpm posthog:sync-messages
pnpm posthog:sync-agent-groups
```

`messagesSent` only includes messages with an attributable `sender_agent_id`; historical agent counts are therefore partial.

### PostHog insights

1. [Support Conversation CSAT Funnel](https://us.posthog.com/shared/QdRw6doP6HIOdCMrUAnjBTdDrJHr1A) - conversation opened → closed → CSAT asked → CSAT received.
2. [Per Day Messages](https://us.posthog.com/shared/OE-TYSZ_pJ7ocgTRJCd1bWYZV0Z-Kw) - daily `message_event` volume using HogQL.
3. [Agents Message Count Graph](https://us.posthog.com/shared/LHTPupxxOc_XXA9LYHTxOm25DO8Lhw) - unique agent groups whose `messagesSent` property is greater than 10, built without SQL.

## Task 3 - Product Teardown

### Improvement 1

- **What:** To be added.
- **Why:** To be added.
- **Expected impact:** To be added.

### Improvement 2

- **What:** To be added.
- **Why:** To be added.
- **Expected impact:** To be added.

### Improvement 3

- **What:** To be added.
- **Why:** To be added.
- **Expected impact:** To be added.

### Improvement 4

- **What:** To be added.
- **Why:** To be added.
- **Expected impact:** To be added.

### Improvement 5

- **What:** To be added.
- **Why:** To be added.
- **Expected impact:** To be added.
