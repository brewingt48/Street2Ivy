# Messaging System

Campus2Career's messaging system is built on Sharetribe's transaction-based messaging infrastructure. All messages are tied to transactions (project applications, invites, etc.) and accessible through the Inbox.

## Architecture

```
InboxPage (/inbox/all, /inbox/applications, or /inbox/received)
  └─ InboxItem (email-client-style card per transaction)
       └─ NamedLink → TransactionPage
            ├─ ActivityFeed (messages + transitions)
            ├─ SendMessageForm (compose new message)
            └─ ApplicationDetailSection (application data)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/containers/InboxPage/InboxPage.js` | Email-style inbox with tabs: All Messages, Applications, Received |
| `src/containers/InboxPage/InboxPage.duck.js` | Redux state — fetches transactions list (dual-fetch for "All" tab) |
| `src/containers/InboxPage/InboxPage.stateData.js` | Resolves transaction state for display |
| `src/containers/InboxPage/InboxSearchForm/` | Sort/filter controls |
| `src/containers/TransactionPage/TransactionPage.js` | Individual transaction view |
| `src/containers/TransactionPage/TransactionPage.duck.js` | Redux — messages, transitions, application data |
| `src/containers/TransactionPage/ActivityFeed/` | Message + transition timeline |
| `src/containers/TransactionPage/SendMessageForm/` | Message composition form |
| `src/containers/TransactionPage/TransactionPanel/` | Main panel with all sections |
| `server/api/email-status.js` | Admin-only Mailgun verification endpoints |

## URL Structure

| URL | Who sees it | Purpose |
|-----|------------|---------|
| `/inbox/all` | All users (default) | "All Messages" — unified view of sent & received |
| `/inbox/applications` | Students | "My Applications" — track submitted applications |
| `/inbox/received` | Corporate Partners | "Applications" — review received applications |
| `/application/:id` | Students | View transaction details as applicant |
| `/review/:id` | Corporate Partners | Review application, accept/decline, message |

Legacy URLs (`/inbox/orders`, `/inbox/sales`, `/order/:id`, `/sale/:id`) redirect to the new paths.

## User Flows

### Student (Customer) Flow

1. **Apply to project** → Creates transaction with `transition/inquire-without-payment`
2. **View inbox** → `/inbox/all` shows "All Messages" tab (default landing)
3. **Filter view** → `/inbox/applications` shows "My Applications" tab only
4. **Click transaction** → Opens TransactionPage with full conversation
5. **Send messages** → Uses SendMessageForm in TransactionPage
6. **Receive updates** → Status badges update automatically (Applied → Accepted → Completed)

### Corporate Partner (Provider) Flow

1. **Receive application** → Transaction appears in inbox
2. **View inbox** → `/inbox/all` shows unified view with "Received" direction badges
3. **Filter view** → `/inbox/received` shows only received applications
4. **Review application** → TransactionPage shows ApplicationDetailSection (skills, GPA, resume, etc.)
5. **Accept/Decline** → Action buttons in TransactionPage trigger transitions
6. **Communicate** → Send messages through the transaction thread
7. **Complete project** → Mark as completed, leave review

## InboxPage Features

- **Unified "All Messages" tab** — shows both sent and received conversations in one view
- **Dual-fetch pattern** — "All" tab fetches both orders AND sales via `Promise.all()`, merges client-side
- **Per-transaction role resolution** — on "All" tab, each item dynamically resolves customer/provider role
- **Direction badges** — "Sent" (teal) and "Received" (slate) pills on "All Messages" tab
- **Column headers** — desktop table-like layout: From/To | Project | Status | Date
- **Email-client style cards** with avatar, name, timestamp, project title, preview snippet, status badge
- **Unread indicators** — blue dot badge on avatar, left-side notification bar
- **Relative timestamps** — "Just now", "5m ago", "3d ago", "2w ago"
- **Role-aware labels** — Students see "My Applications", partners see "Applications"
- **Sort options** — Newest first, Recent messages, Recent activity
- **Pagination** — 10 items per page with navigation
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

## Translations

All user-facing strings are in `src/translations/en.json` under `InboxPage.*` keys:

- Status labels: `InboxPage.{process}.{state}.status`
- Tab titles: `InboxPage.allMessagesTab`, `InboxPage.ordersTabTitle`, `InboxPage.salesTabTitle`
- Role-specific: `InboxPage.studentOrdersTab`, `InboxPage.corporateSalesTab`
- Direction badges: `InboxPage.directionSent`, `InboxPage.directionReceived`
- Column headers: `InboxPage.columnFrom`, `InboxPage.columnProject`, `InboxPage.columnStatus`, `InboxPage.columnDate`
- Preview snippets: `InboxPage.previewAppliedProvider`, etc.
- Time formatting: `InboxPage.timeJustNow`, `InboxPage.timeMinutesAgo`, etc.

## Email Verification (Admin)

Admin-only endpoints for verifying Mailgun email delivery:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/email-status` | GET | Returns Mailgun config status, domain, diagnostics |
| `/api/email-test` | POST | Sends test email to admin's address |

Both endpoints require system-admin authentication.

## Removed Components (v53)

The following components were removed in favor of the Inbox/TransactionPage system:

- `MessageCenter` (was in StudentDashboardPage) — replaced by InboxPage
- `MessageDetailModal` (was in StudentDashboardPage) — replaced by TransactionPage
- `ReviewsPanel` (was in both dashboards) — replaced by TransactionPage ReviewModal
- `ApplicationsPage` inline accept/decline — redirects to `/inbox/received`

Dashboards now link to the Inbox rather than embedding their own messaging/review UIs.
