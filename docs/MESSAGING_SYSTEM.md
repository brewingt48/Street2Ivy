# Messaging System

Campus2Career's messaging system is built on Sharetribe's transaction-based messaging infrastructure. All messages are tied to transactions (project applications, invites, etc.) and accessible through the Inbox.

## Architecture

```
InboxPage (/inbox/orders or /inbox/sales)
  └─ InboxItem (email-client-style card per transaction)
       └─ NamedLink → TransactionPage
            ├─ ActivityFeed (messages + transitions)
            ├─ SendMessageForm (compose new message)
            └─ ApplicationDetailSection (application data)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/containers/InboxPage/InboxPage.js` | Email-style inbox with tabs for orders/sales |
| `src/containers/InboxPage/InboxPage.duck.js` | Redux state — fetches transactions list |
| `src/containers/InboxPage/InboxPage.stateData.js` | Resolves transaction state for display |
| `src/containers/InboxPage/InboxSearchForm/` | Sort/filter controls |
| `src/containers/TransactionPage/TransactionPage.js` | Individual transaction view |
| `src/containers/TransactionPage/TransactionPage.duck.js` | Redux — messages, transitions, application data |
| `src/containers/TransactionPage/ActivityFeed/` | Message + transition timeline |
| `src/containers/TransactionPage/SendMessageForm/` | Message composition form |
| `src/containers/TransactionPage/TransactionPanel/` | Main panel with all sections |

## User Flows

### Student (Customer) Flow

1. **Apply to project** → Creates transaction with `transition/inquire-without-payment`
2. **View inbox** → `/inbox/orders` shows "My Applications" tab
3. **Click transaction** → Opens TransactionPage with full conversation
4. **Send messages** → Uses SendMessageForm in TransactionPage
5. **Receive updates** → Status badges update automatically (Applied → Accepted → Completed)

### Corporate Partner (Provider) Flow

1. **Receive application** → Transaction appears in `/inbox/sales` as "Applications" tab
2. **Review application** → TransactionPage shows ApplicationDetailSection (skills, GPA, resume, etc.)
3. **Accept/Decline** → Action buttons in TransactionPage trigger transitions
4. **Communicate** → Send messages through the transaction thread
5. **Complete project** → Mark as completed, leave review

## InboxPage Features

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
- Tab titles: `InboxPage.ordersTabTitle`, `InboxPage.salesTabTitle`
- Role-specific: `InboxPage.studentOrdersTab`, `InboxPage.corporateSalesTab`
- Preview snippets: `InboxPage.previewAppliedProvider`, etc.
- Time formatting: `InboxPage.timeJustNow`, `InboxPage.timeMinutesAgo`, etc.

## Removed Components (v53)

The following components were removed in favor of the Inbox/TransactionPage system:

- `MessageCenter` (was in StudentDashboardPage) — replaced by InboxPage
- `MessageDetailModal` (was in StudentDashboardPage) — replaced by TransactionPage
- `ReviewsPanel` (was in both dashboards) — replaced by TransactionPage ReviewModal
- `ApplicationsPage` inline accept/decline — redirects to `/inbox/sales`

Dashboards now link to the Inbox rather than embedding their own messaging/review UIs.
