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
API_BASE_URL=<server-base-url>
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

Set `API_BASE_URL` to the URL where the Express server is running. The client uses it as the proxy target for `/api` requests.

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

| Metric                | Calculation                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Total messages        | Count of all rows in `messages`.                                                                                                |
| Messages per customer | Message count grouped by `customer_id`.                                                                                         |
| Human FRT             | Time from the first customer message in a conversation to the first subsequent store message with a non-null `sender_agent_id`. |
| Bot FRT               | Time from the first customer message in a conversation to the first subsequent store message with a null `sender_agent_id`.     |
| Resolution time       | `closed_at - opened_at` for closed conversations.                                                                               |
| Conversations handled | Distinct conversations assigned to an agent.                                                                                    |
| Agent FRT             | Human FRT attributed to the agent who sent the first human response.                                                            |
| Agent resolution time | Resolution time attributed to the agent who closed the conversation.                                                            |
| Reassigned chats      | Distinct conversations subsequently assigned away from an agent.                                                                |
| Reassignment rate     | `reassigned chats / conversations handled`. This is the additional metric beyond the take-home requirements.                    |

Average is the arithmetic mean. Median is the middle sorted value, or the average of the two middle values for an even sample size.

### Metric assumptions and limitations

- Metrics are all-time; no date filtering is applied.
- An inbound customer message or assignment opens a conversation when that customer has no open conversation.
- An outgoing store message attaches to the current open conversation but does not create one.
- A close webhook closes the customer's current open conversation.
- The latest assignment is treated as the current assigned agent; assignment rows retain reassignment history.
- Repeated assignment events for the currently assigned agent are treated as no-ops and do not create additional assignment-history rows.
- A store message with `sender_agent_id = null` is classified as a bot response. An unmatched human agent email can therefore be misclassified as bot activity.
- Only responses occurring at or after the first customer message are eligible for FRT.
- Negative resolution durations are excluded independently from other metrics.
- Closed conversations without a closing agent contribute to global resolution time but not per-agent resolution time.
- Historical customer messages contribute to total messages and messages per customer. They have no local conversation linkage, so they are excluded from FRT and resolution calculations.
- Historical messages are stored without `sender_agent_id` because none of the available fields establishes a reliable per-message link to a human agent. `zokoAgent` and `sourceDetails.agent_email` can be empty, inconsistent, or represent automation; the customer API's `assignment` is only the current assignee and cannot identify who authored older messages after reassignments; and `platformId`, `platformSenderId`, and `platformMessageId` identify the shared WhatsApp channel, customer, or message rather than an individual Zoko agent. The implementation therefore prefers missing attribution over incorrect attribution. Live dashboard webhooks provide `agentEmail`, which can be matched safely to a synchronized agent.
- Reassigned chats count unique conversations, not the total number of assignment transitions.

### Client screenshots

#### Support overview

> Screenshot placeholder - to be added.

#### Conversation workspace

> Screenshot placeholder - to be added.

## Task 2 - PostHog Analytics

PostHog is integrated on the server with `posthog-node`. A single client instance is created at application startup, injected through `PostHogService`, and flushed during graceful shutdown. Analytics events are emitted only after the corresponding database transaction commits.

### Captured events

| Event                   | Trigger and identity                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `conversation_opened`   | A new conversation is persisted. Uses `conversation:<id>` as its PostHog distinct ID.                  |
| `conversation_closed`   | An open conversation becomes closed. Uses the same conversation distinct ID.                           |
| `csat_asked`            | `POST /api/conversations/:conversationId/csat/ask` is called for a closed conversation.                |
| `csat_received`         | `POST /api/conversations/:conversationId/csat/response` is called with a rating from 1 to 5.           |
| `message_event`         | A live or historically synchronized message is ingested. The original platform timestamp is preserved. |
| `agent_metrics_updated` | An agent's aggregate metrics are refreshed and linked to the PostHog `agent` group.                    |

The initial CSAT design used `zoko:chat:closed` to invoke a FlowHippo webhook trigger, start a Zoko flow, send a WhatsApp CSAT template, and capture the customer's reply. During implementation, FlowHippo did not provide a dedicated CSAT collection step, the available templates and flow configuration were unreliable for this use case, and creating a suitable WhatsApp template required external approval that could take several business days. Given the take-home timeline, the production delivery flow was not pursued further.

Instead, the application simulates the final two stages through `POST /api/conversations/:conversationId/csat/ask` and `POST /api/conversations/:conversationId/csat/response`. These endpoints emit the same `csat_asked` and `csat_received` events needed to validate the PostHog funnel, but they do not send or collect a real WhatsApp survey. Conversation events use the conversation ID—not the customer ID—so separate conversations from the same customer remain separate funnel participants.

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

The agent graph currently shows one qualifying agent because only one agent has more than 10 messages with a reliably resolved `sender_agent_id`. Historical outgoing messages are excluded from per-agent counts when their sender cannot be linked safely, so this insight represents attributable live agent activity rather than the store's complete historical agent activity.

## Task 3 - Product Teardown

The improvements below are ordered by expected product and business impact.

### 1. Agentic FlowHippo builder

- **What:** Let merchants describe an automation in plain language. Generate the flow, ask only for missing inputs, and present a testable draft before publishing.
- **Why:** Merchants care about the outcome, not learning workflow-builder semantics. The current learning curve suppresses adoption and shifts setup work to Zoko's team.
- **Expected impact:** Faster activation, more published and paid flows, lower onboarding effort, and stronger retention.

### 2. First-class integrations beyond Shopify

- **What:** Validate demand and launch a first-class integration for the highest-priority platform, starting with a WooCommerce pilot and a reusable commerce connector model.
- **Why:** The current product, setup documentation, and roadmap are strongly Shopify-first. Older Zoko content mentions WooCommerce, but an equivalent current setup path is not readily discoverable.
- **Expected impact:** A larger addressable market, less platform concentration, and new agency and merchant acquisition channels.

### 3. Consistent, versioned webhook contracts

- **What:** Use clear, consistent fields for text, media URLs, and captions across message types. Right now, I came across some inconsistencies in the webhook payloads for different type
  pf messages.
- **Why:** In the observed text webhook, `text` contains the message body. In the image webhook, `text` contains the media URL while the human-written text moves to `fileCaption`, and `fileUrl` duplicates the URL. Consumers must infer undocumented semantics from `type`.
- **Expected impact:** Faster integrations, fewer ingestion bugs and support tickets, and greater developer trust.

<details>
<summary>Observed text message webhook</summary>

```json
{
  "agentEmail": "mziyadc@gmail.com",
  "appType": "webapp",
  "bsuid": null,
  "chatType": "individual",
  "customer": {
    "id": "68eea2fc-b867-11f1-a511-7159177937b7",
    "name": "Ziyad"
  },
  "customerName": "Ziyad",
  "deliveryStatus": "sent",
  "direction": "FROM_STORE",
  "event": "message:store:out",
  "id": "3a080b70-ba03-11f1-b82c-a9325a7592a9",
  "phone": "+918590656155",
  "platform": "WHATSAPP",
  "platformSenderId": "+918590656155",
  "platformTimestamp": "2026-09-26T23:37:24Z",
  "senderName": "Ziyad",
  "text": "what can we do for u?",
  "type": "text",
  "username": null
}
```

</details>

<details>
<summary>Observed image message webhook with overloaded text fields</summary>

```json
{
  "agentEmail": "mziyadc@gmail.com",
  "appType": "webapp",
  "bsuid": null,
  "chatType": "individual",
  "customer": {
    "id": "68eea2fc-b867-11f1-a511-7159177937b7",
    "name": "Ziyad"
  },
  "customerName": "Ziyad",
  "deliveryStatus": "sent",
  "direction": "FROM_STORE",
  "event": "message:store:out",
  "fileCaption": "hello3",
  "fileUrl": "https://cdn.live.zoko.io/store/customers/transcoded/c211f1bc90f475382025c4629cbcc25a_1790549324_output_image.jpg",
  "id": "9ad24070-bac5-11f1-abca-c13616522527",
  "phone": "+918590656155",
  "platform": "WHATSAPP",
  "platformSenderId": "+918590656155",
  "platformTimestamp": "2026-09-27T22:48:49Z",
  "senderName": "Ziyad",
  "text": "https://cdn.live.zoko.io/store/customers/transcoded/c211f1bc90f475382025c4629cbcc25a_1790549324_output_image.jpg",
  "type": "image",
  "username": null
}
```

</details>

### 4. Official Zoko MCP server

- **What:** Expose authenticated Zoko resources and tools to compatible AI agents. Start read-only, then add scoped and auditable actions such as drafting messages or flows.
- **Why:** This gives merchants, agencies, and developers access to Zoko data and actions from the AI tools they already use, without bespoke integrations.
- **Expected impact:** Lower integration friction, higher API and automation usage, new ecosystem distribution, and AI-native differentiation.

### 5. Dark mode

- **What:** Add a system-aware theme with a persistent manual toggle and complete coverage across chats, analytics, and FlowHippo.
- **Why:** Agents and operators spend extended periods in the dashboard; theme choice is a visible product-quality improvement.
- **Expected impact:** Better user comfort and perceived product quality with relatively low implementation risk.
