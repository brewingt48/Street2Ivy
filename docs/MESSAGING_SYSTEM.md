# Messaging System

Campus2Career has **two messaging channels** that work together:

1. **Sharetribe transaction messages** — tied to marketplace transactions, rendered via ActivityFeed on the TransactionPage
2. **Custom conversation messages** — SQLite-backed free-form threads between students and corporate partners, rendered via ConversationPage

Both channels are accessible from the unified Inbox.

## Architecture

```
InboxPage (/inbox)
  ├─ "All Messages" tab      → Sharetribe orders + sales (dual-fetch, merged)
  ├─ "Messages" tab           → Custom SQLite conversations (via /api/messages/inbox)
  ├─ "My Applications" tab    → Sharetribe orders (student view)
  └─ "Applications" tab       → Sharetribe sales (corporate partner view)

Transaction messages:
  InboxItem → NamedLink → TransactionPage
    ├─ ActivityFeed (Sharetribe messages + transitions)
    ├─ SendMessageForm
    └─ ApplicationDetailSection

Custom conversations:
  ConversationItem → NamedLink → ConversationPage (/inbox/conversation/:id)
    ├─ Message thread (SQLite messages, chronological)
    ├─ Status badge
    └─ Send message form
```

### Key Files

| File | Purpose |
|------|---------|
| **Inbox** | |
| `src/containers/InboxPage/InboxPage.js` | Tabbed inbox: All, Messages, Applications, Received |
| `src/containers/InboxPage/InboxPage.duck.js` | Redux: fetches transactions + custom conversations |
| `src/containers/InboxPage/InboxPage.stateData.js` | Transaction state → UI mapping |
| `src/containers/InboxPage/InboxSearchForm/` | Sort/filter controls |
| **Transaction messages** | |
| `src/containers/TransactionPage/TransactionPage.js` | Sharetribe transaction detail + messages |
| `src/containers/TransactionPage/ActivityFeed/` | Message + transition timeline |
| `src/containers/TransactionPage/SendMessageForm/` | Compose form for transaction messages |
| **Custom conversations** | |
| `src/containers/InboxPage/ConversationPage.js` | Full conversation thread UI |
| `server/api/application-messaging.js` | API handlers: inbox, send, mark read |
| `server/api-util/db.js` | SQLite schema + DAO for `application_messages` |
| **Admin** | |
| `server/api/email-status.js` | Admin-only Mailgun verification endpoints |

## URL Structure

| URL | Who Sees It | Data Source |
|-----|------------|-------------|
| `/inbox` | All users | Redirects to `/inbox/all` |
| `/inbox/all` | All users | Sharetribe orders + sales (merged) |
| `/inbox/messages` | All users | Custom SQLite conversations |
| `/inbox/applications` | Students | Sharetribe orders (student's applications) |
| `/inbox/received` | Corporate Partners | Sharetribe sales (received applications) |
| `/inbox/conversation/:id` | Participants | Custom conversation thread |
| `/application/:id` | Students | Transaction detail (as customer) |
| `/review/:id` | Corporate Partners | Transaction detail (as provider) |

Legacy URLs (`/inbox/orders`, `/inbox/sales`, `/order/:id`, `/sale/:id`) redirect to the new paths.

## User Flows

### Student (Customer) Flow

1. **Apply to project** → Creates transaction + SQLite application + first message (cover letter)
2. **View inbox** → `/inbox/all` shows "All Messages" tab (default landing)
3. **Check messages** → `/inbox/messages` shows custom conversation threads
4. **Filter view** → `/inbox/applications` shows "My Applications" tab only
5. **Click transaction** → Opens TransactionPage with full conversation
6. **Click conversation** → Opens ConversationPage with direct message thread
7. **Send messages** → Either via TransactionPage or ConversationPage
8. **Receive updates** → Status badges update automatically (Applied → Accepted → Completed)

### Corporate Partner (Provider) Flow

1. **Receive application** → Transaction appears in inbox, notification email sent
2. **View inbox** → `/inbox/all` shows unified view with "Received" direction badges
3. **Check messages** → `/inbox/messages` shows custom conversation threads
4. **Filter view** → `/inbox/received` shows only received applications
5. **Review application** → TransactionPage shows ApplicationDetailSection (skills, GPA, resume, etc.)
6. **Accept/Decline** → Action buttons in TransactionPage trigger transitions
7. **Communicate** → Direct messages through ConversationPage or TransactionPage
8. **Complete project** → Mark as completed, leave review

---

## Custom Conversation System (SQLite)

### Database Schema

**Table: `application_messages`**

```sql
CREATE TABLE application_messages (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,      -- References project_applications.id
  sender_id TEXT NOT NULL,           -- Sharetribe UUID or 'system'
  sender_name TEXT,
  sender_role TEXT,                  -- 'student', 'corporate-partner', 'system'
  content TEXT NOT NULL,             -- Max 5000 characters
  message_type TEXT DEFAULT 'user',  -- 'user' or 'system'
  read_at TEXT,                      -- NULL = unread, ISO 8601 = read
  created_at TEXT
);
```

**Indexes:** `(application_id, created_at)`, `sender_id`, `(application_id, read_at)`

### API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/messages/inbox` | Conversation previews (paginated) |
| `GET` | `/api/messages/unread-count` | Total unread across all conversations |
| `GET` | `/api/messages/:applicationId` | All messages in a conversation |
| `POST` | `/api/messages/:applicationId` | Send a new message |
| `POST` | `/api/messages/:applicationId/read` | Mark conversation as read |

### GET /api/messages/inbox

Returns conversation previews for the authenticated user.

**Query params:** `limit` (default 20, max 50), `offset` (default 0)

**Response:**
```json
{
  "conversations": [
    {
      "id": "app-1707840000000-x7k2m9",
      "studentId": "uuid",
      "studentName": "Jane Doe",
      "corporateId": "uuid",
      "corporateName": "Acme Corp",
      "listingTitle": "Market Analysis Q1",
      "status": "accepted",
      "initiatedBy": "student",
      "lastMessageContent": "Thanks for accepting!",
      "lastMessageSender": "Jane Doe",
      "lastMessageAt": "2024-02-13T...",
      "lastMessageType": "user",
      "unreadCount": 2,
      "totalMessages": 15
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "count": 45 }
}
```

### POST /api/messages/:applicationId

Send a message. Validates the sender is a participant. Triggers email notification to the other party.

**Request body:** `{ "content": "Message text (1-5000 chars)" }`

**Response:** `{ "message": { id, applicationId, senderId, senderName, senderRole, content, messageType, createdAt } }`

### GET /api/messages/:applicationId

Fetch all messages in a conversation. Automatically marks messages from the other party as read.

**Response:**
```json
{
  "application": { "id": "...", "status": "accepted", "studentName": "...", "..." : "..." },
  "messages": [
    { "id": "msg-...", "senderId": "...", "senderName": "Jane", "content": "Hello!", "messageType": "user", "createdAt": "..." },
    { "id": "sys-...", "senderId": "system", "content": "Application accepted.", "messageType": "system", "createdAt": "..." }
  ],
  "pagination": { "limit": 50, "offset": 0, "total": 12 }
}
```

### DAO Methods (`db.applicationMessages`)

```javascript
// Retrieval
getByApplicationId(applicationId, { limit, offset })  // Messages ASC by created_at
getById(id)
getMessageCount(applicationId)

// Unread tracking
getUnreadCountByUser(userId)                           // Total across all conversations
getUnreadCountByApplication(applicationId, userId)     // Per-conversation
markAsRead(applicationId, userId)                      // Marks OTHER party's messages

// Conversation previews
getConversationPreviews(userId, { limit, offset })     // Inbox list with last message + unread count

// Mutations
create(message)                                        // User message
createSystemMessage(applicationId, content)            // System notification
```

### System Messages

Automatic system messages are inserted when application status changes:

| Event | System Message |
|-------|---------------|
| Application accepted | "Application status changed to accepted." |
| Application declined | "Application status changed to rejected." |
| Application withdrawn | "Application was withdrawn." |
| Project completed | "Application status changed to completed." |

### ConversationPage UI

**Route:** `/inbox/conversation/:id`

Features:
- Full message thread, oldest to newest
- Chat bubbles with sender name and timestamp
- System messages displayed as centered grey text
- Auto-scrolls to bottom on load and new messages
- Textarea input with 5000-character limit
- Enter to send, Shift+Enter for newline
- Disabled compose for terminal states (withdrawn, cancelled)
- Back button to `/inbox/messages`
- Status badge in header

**State:** Component-local (useState), no Redux — fetches directly from `/api/messages/:id`.

---

## Sharetribe Transaction Messages

### How They Work

Sharetribe messages are part of the transaction entity. When a user sends a message via SendMessageForm on the TransactionPage, it calls `sdk.messages.send()`. Messages appear in the ActivityFeed alongside transaction transitions (applied, accepted, etc.).

### InboxPage Tabs for Transactions

**"All Messages" tab** — dual-fetch pattern:
```javascript
Promise.all([
  sdk.transactions.query({ only: 'order', ... }),
  sdk.transactions.query({ only: 'sale', ... })
])
```
Results are merged and sorted by `lastTransitionedAt` (newest first). Each item shows a "Sent" or "Received" direction badge.

**"My Applications" tab** — `only: 'order'` (student is customer)

**"Applications" tab** — `only: 'sale'` (corporate partner is provider)

## InboxPage Features

- **Unified "All Messages" tab** — both sent and received in one view
- **Dual-fetch pattern** — "All" tab fetches orders AND sales via `Promise.all()`, merges client-side
- **Per-transaction role resolution** — each item dynamically resolves customer/provider role
- **Direction badges** — "Sent" (teal) and "Received" (slate) pills on "All Messages" tab
- **Column headers** — desktop table-like layout: From/To | Project | Status | Date
- **Email-client style cards** with avatar, name, timestamp, project title, preview snippet, status badge
- **Unread indicators** — blue dot badge on avatar, left-side notification bar
- **Relative timestamps** — "Just now", "5m ago", "3d ago", "2w ago"
- **Role-aware labels** — Students see "My Applications", partners see "Applications"
- **Sort options** — Newest first, Recent messages, Recent activity
- **Pagination** — 10 items per page (transactions), 20 per page (conversations)
- **Dashboard back-links** — Contextual link back to appropriate dashboard
- **Empty states** — Friendly messaging when inbox is empty

## Transaction Processes

Messaging works across all transaction processes:

| Process | States | Use Case |
|---------|--------|----------|
| `default-project-application` | applied → accepted/declined → completed → reviewed | Student applications |
| `default-booking` | inquiry → accepted → delivered → completed → reviewed | Scheduled sessions |
| `default-purchase` | inquiry → purchased → delivered → completed → reviewed | Direct purchases |
| `default-negotiation` | inquiry → offer → accepted → delivered → completed → reviewed | Negotiated deals |
| `default-inquiry` | free-inquiry | Simple inquiries |

## State Data

Each process has a state data file that maps transaction states to UI elements:

```
InboxPage.stateDataProjectApplication.js
  ├─ processState: 'applied' | 'accepted' | 'declined' | 'completed' | 'reviewed-by-*' | 'reviewed'
  ├─ actionNeeded: boolean (drives unread indicators)
  ├─ isSaleNotification / isOrderNotification: boolean
  └─ isFinal: boolean (concludes the transaction)
```

## How the Two Systems Relate

```
Student applies to a project
  │
  ├─ Creates SQLite application (project_applications)
  ├─ Creates Sharetribe transaction (default-project-application/release-1)
  ├─ Links them via transaction_id column
  └─ Creates first message in SQLite (cover letter)
       │
       ├─ TransactionPage: Sharetribe messages via sdk.messages.send()
       └─ ConversationPage: SQLite messages via /api/messages/:applicationId
```

Both messaging channels exist for the same application. The TransactionPage shows Sharetribe messages + transitions. The ConversationPage shows the custom SQLite thread. The custom conversation system is the primary channel for direct communication, while the Sharetribe transaction messages track state transitions and formal actions.

## Translations

All user-facing strings are in `src/translations/en.json`:

- **Tabs:** `InboxPage.allMessagesTab`, `InboxPage.messagesTab`, `InboxPage.ordersTabTitle`, `InboxPage.salesTabTitle`
- **Role labels:** `InboxPage.studentOrdersTab`, `InboxPage.corporateSalesTab`
- **Direction:** `InboxPage.directionSent`, `InboxPage.directionReceived`
- **Columns:** `InboxPage.columnFrom`, `InboxPage.columnProject`, `InboxPage.columnStatus`, `InboxPage.columnDate`
- **Status:** `InboxPage.{process}.{state}.status`
- **Previews:** `InboxPage.previewAppliedProvider`, etc.
- **Time:** `InboxPage.timeJustNow`, `InboxPage.timeMinutesAgo`, etc.
- **Conversation:** `ConversationPage.sendMessage`, `ConversationPage.backToInbox`, etc.

## Email Verification (Admin)

Admin-only endpoints for verifying Mailgun email delivery:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/email-status` | GET | Returns Mailgun config status, domain, diagnostics |
| `/api/email-test` | POST | Sends test email to admin's address |

Both endpoints require system-admin authentication.

## Removed Components (v53)

The following were replaced by the Inbox/TransactionPage/ConversationPage system:

- `MessageCenter` (was in StudentDashboardPage) → InboxPage "Messages" tab
- `MessageDetailModal` (was in StudentDashboardPage) → ConversationPage
- `ReviewsPanel` (was in both dashboards) → TransactionPage ReviewModal
- `ApplicationsPage` inline accept/decline → redirects to `/inbox/received`

Dashboards now link to the Inbox rather than embedding their own messaging/review UIs.
