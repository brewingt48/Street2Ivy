# Application System

Campus2Career uses a custom SQLite-backed application system for managing student-to-corporate project applications. This runs alongside Sharetribe's transaction system — applications are created in SQLite first, then linked to a Sharetribe transaction when the corporate partner accepts.

## Architecture

```
Student applies to project
  └─ POST /api/project-applications
       ├─ db.projectApplications.create()      SQLite row
       ├─ sdk.transactions.initiate()           Sharetribe transaction
       ├─ db.projectApplications.updateTransactionId()
       ├─ db.applicationMessages.create()       Cover letter → first message
       └─ notifications.sendNotification()      Email to corporate partner + confirmation to student
```

### Key Files

| File | Purpose |
|------|---------|
| `server/api-util/db.js` | SQLite schema + DAO for `project_applications` and `application_messages` |
| `server/api/project-applications.js` | API handlers: submit, accept, decline, withdraw, complete |
| `server/api/application-messaging.js` | API handlers: inbox, send message, mark read |
| `server/apiRouter.js` | Route registration (lines 256-273) |
| `server/api-util/notifications.js` | Email + in-app notification dispatch |
| `src/transactions/transactionProcessProjectApplication.js` | Sharetribe state machine |
| `src/containers/InboxPage/InboxPage.duck.js` | Redux: fetch applications & conversations |
| `src/containers/InboxPage/ConversationPage.js` | Conversation thread UI |

## Database Schema

### `project_applications` table

```sql
CREATE TABLE project_applications (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  transaction_id TEXT,
  invite_id TEXT,
  cover_letter TEXT,
  resume_attachment_id TEXT,
  availability_date TEXT,
  interest_reason TEXT,
  skills TEXT,                    -- JSON array
  relevant_coursework TEXT,
  gpa TEXT,
  hours_per_week INTEGER,
  references_text TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewer_notes TEXT,
  corporate_id TEXT,
  corporate_name TEXT,
  corporate_email TEXT,
  student_name TEXT,
  student_email TEXT,
  listing_title TEXT,
  initiated_by TEXT DEFAULT 'student',
  invitation_message TEXT,
  rejection_reason TEXT,
  responded_at TEXT,
  completed_at TEXT,
  updated_at TEXT
);
```

**Indexes:** `student_id`, `listing_id`, `status`, `transaction_id`, `corporate_id`, `initiated_by`

### ID Format

Application IDs use the pattern `app_{timestamp}_{random6}`, e.g. `app-1707840000000-x7k2m9`.

## Application Lifecycle

```
                    ┌─────────────┐
                    │   pending    │ ← Student submits application
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │ accepted │ │ rejected │ │ withdrawn │ ← Student cancels
        └────┬─────┘ └──────────┘ └───────────┘
             │
             ▼
        ┌───────────┐
        │ completed │ ← Corporate partner marks done
        └───────────┘
```

### Status Values

| Status | Set By | Meaning |
|--------|--------|---------|
| `pending` | System | Awaiting corporate partner review |
| `invited` | Corporate | Partner invited student (before application) |
| `student_accepted` | Student | Student accepted an invitation |
| `accepted` | Corporate | Partner accepted the application |
| `rejected` | Corporate | Partner declined the application |
| `declined` | Student | Student declined an invitation |
| `withdrawn` | Student | Student withdrew their application |
| `cancelled` | System | Application cancelled |
| `completed` | Corporate | Project marked as finished |

## API Routes

### Student Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/project-applications` | Submit a new application |
| `GET` | `/api/project-applications/:id` | View single application |
| `GET` | `/api/student/applications` | List student's applications |
| `POST` | `/api/project-applications/:id/withdraw` | Withdraw application |

### Corporate Partner Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/project-applications/by-listing/:listingId` | Applications for a listing |
| `GET` | `/api/project-applications/by-transaction/:txId` | Lookup by Sharetribe transaction |
| `POST` | `/api/project-applications/:id/accept` | Accept application |
| `POST` | `/api/project-applications/:id/decline` | Decline application |
| `POST` | `/api/project-applications/:id/complete` | Mark project completed |

### What Happens on Submit

When a student submits an application (`POST /api/project-applications`):

1. Validate the request body (cover letter, interest reason required)
2. Check for duplicate active applications (`findActiveByStudentAndListing`)
3. Create the SQLite application record
4. Initiate a Sharetribe transaction (`transition/inquire-without-payment`)
5. Link the transaction ID back to the application
6. Create the cover letter as the first conversation message
7. Send email notification to the corporate partner (`new-application`)
8. Send confirmation email to the student (`application-received`)

### What Happens on Accept

When a corporate partner accepts (`POST /api/project-applications/:id/accept`):

1. Verify the user owns the listing
2. Update SQLite status to `accepted` with `respondedAt` and `reviewedAt` timestamps
3. Trigger Sharetribe transition (`transition/accept`)
4. Create system message: "Application accepted"
5. Send email to student (`application-accepted`)

### What Happens on Decline

Same as accept but with status `rejected`, transition `transition/decline`, and email `application-declined`. Optionally includes `rejectionReason` and `reviewerNotes`.

## DAO Methods

### `db.projectApplications`

```javascript
// Retrieval
getById(id)
getByStudentAndListing(studentId, listingId)
findActiveByStudentAndListing(studentId, listingId)  // Excludes terminal states
getByListingId(listingId, { status, limit })
getByStudentId(studentId, { status, limit })
getByCorporateId(corporateId, { status, limit })
getByUserId(userId, { status, limit, offset })        // Unified: student OR corporate
getByTransactionId(transactionId)

// Analytics
countByStatus(corporateId)   // → { pending: 5, accepted: 2, rejected: 1, ... }

// Mutations
create(application)
updateStatus(id, status, metadata)
updateTransactionId(id, transactionId)
update(id, data)
```

## Sharetribe Transaction Process

**Process name:** `default-project-application`
**Process alias:** `default-project-application/release-1`
**Unit type:** `inquiry`

### States

| State | Description |
|-------|-------------|
| `initial` | Before any action |
| `applied` | Student has applied (pending review) |
| `accepted` | Corporate partner accepted |
| `declined` | Corporate partner declined |
| `completed` | Project marked finished |
| `reviewed-by-customer` | Student left a review |
| `reviewed-by-provider` | Corporate partner left a review |
| `reviewed` | Both parties reviewed |

### Transitions

| Transition | From → To |
|------------|-----------|
| `transition/inquire-without-payment` | initial → applied |
| `transition/accept` | applied → accepted |
| `transition/decline` | applied → declined |
| `transition/mark-completed` | accepted → completed |
| `transition/review-1-by-provider` | completed → reviewed-by-provider |
| `transition/review-1-by-customer` | completed → reviewed-by-customer |
| `transition/review-2-by-provider` | reviewed-by-customer → reviewed |
| `transition/review-2-by-customer` | reviewed-by-provider → reviewed |

## Dual-Data Model

The application system uses **two synchronized data stores**:

1. **SQLite** (`project_applications` table) — owns the rich application data: cover letter, skills, GPA, resume, cached participant names/emails, messaging thread
2. **Sharetribe** (transaction) — owns the marketplace state machine, reviews, standard message threading, and payment infrastructure (unused for now)

The SQLite `transaction_id` column links the two. When a student views their inbox, both data sources contribute:
- The "Applications" and "Received" tabs fetch Sharetribe transactions
- The "Messages" tab fetches custom conversation previews from SQLite
- The "All Messages" tab merges Sharetribe order + sale transactions

## Permissions

| Action | Student | Corporate Partner | Admin |
|--------|---------|-------------------|-------|
| Submit application | ✅ | ❌ | ❌ |
| View own applications | ✅ | ❌ | ✅ |
| Withdraw application | ✅ | ❌ | ❌ |
| View applications for listing | ❌ | ✅ (own listings) | ✅ |
| Accept/Decline | ❌ | ✅ (own listings) | ❌ |
| Mark completed | ❌ | ✅ | ❌ |
| Send messages | ✅ (participant) | ✅ (participant) | ❌ |

## Testing

```bash
# Run the application messaging DAL tests
CI=true npx jest server/api-util/applicationMessaging.test.js

# Run all tests
CI=true npx sharetribe-scripts test --verbose
```

The test file `server/api-util/applicationMessaging.test.js` validates:
- Application CRUD (create, getById, getByUserId, findActive, updateStatus, countByStatus)
- Message CRUD (create, getByApplicationId, getMessageCount)
- Unread tracking (getUnreadCountByUser, getUnreadCountByApplication, markAsRead)
- System messages (createSystemMessage)
- Conversation previews (getConversationPreviews)
