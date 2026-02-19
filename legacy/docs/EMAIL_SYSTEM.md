# Email System

Campus2Career uses Mailgun to send transactional emails for all platform notifications.

## Architecture

```
notifications.js          ─→  sendNotification()
  ├─ storeNotification()      SQLite (in-app notification center)
  └─ sendEmail()               Mailgun (email delivery)
       ├─ renderEmailTemplate()  Per-type HTML template (preferred)
       └─ wrapInHtmlTemplate()   Generic fallback (plain-text → HTML)
```

### Files

| File | Purpose |
|------|---------|
| `server/api-util/notifications.js` | Central notification hub — stores to SQLite and sends email |
| `server/services/email.js` | Mailgun client, `sendEmail()`, generic HTML wrapper |
| `server/services/emailTemplates.js` | Per-notification-type professional HTML templates |

## Environment Variables

Set via Heroku config vars:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAILGUN_API_KEY` | Yes | — | Mailgun API key (provisioned via Heroku add-on) |
| `MAILGUN_DOMAIN` | Yes | — | Sending domain (e.g. `mg.street2ivy.com`) |
| `MAILGUN_FROM_NAME` | No | `Campus2Career` | Display name in From header |
| `MAILGUN_FROM_EMAIL` | No | `noreply@{MAILGUN_DOMAIN}` | From email address |
| `EMAIL_ENABLED` | No | `true` | Set to `false` to disable sending (logs only) |
| `REACT_APP_MARKETPLACE_ROOT_URL` | No | `https://street2ivy.com` | Base URL for links in emails |

## Notification Types

Each type has a professional HTML template and a plain-text fallback:

| Type | Recipient | Triggered By |
|------|-----------|-------------|
| `new-application` | Corporate partner | Student submits application |
| `application-received` | Student | Student submits application (confirmation) |
| `application-accepted` | Student | Partner accepts application |
| `application-declined` | Student | Partner declines application |
| `application-withdrawn` | Corporate partner | Student withdraws application |
| `invitation-declined` | Corporate partner | Student declines invitation |
| `student-accepted-invite` | Corporate partner | Student accepts invitation |
| `project-completed` | Student | Partner marks project complete |
| `invite-received` | Student | Partner sends project invitation |
| `assessment-received` | Student | Partner submits performance assessment |
| `new-message` | Either | New message in conversation thread (custom messaging) |

## How Emails Are Sent

1. A platform event triggers `sendNotification()` in `notifications.js`
2. The notification is stored in SQLite for the in-app notification center
3. `sendEmail()` is called with `type`, `data`, `subject`, and `text`
4. `sendEmail()` tries to render a professional template via `renderEmailTemplate(type, subject, data)`
5. If no template exists for that type, it falls back to `wrapInHtmlTemplate(subject, text)`
6. The email is sent via the Mailgun API

Email failures are non-blocking — they are caught and logged but never prevent the notification from being stored or the API response from being returned.

## Template Design

All templates share a consistent layout:

- **Header**: Navy (#0f172a) background with "Campus2Career by Street2Ivy" branding
- **Body**: White card with type-specific content, info cards, and CTA buttons
- **CTA Button**: Teal (#00A89A) with white text
- **Footer**: Slate-50 background with copyright and notification preferences link
- **Preheader**: Hidden text for email client preview pane

Templates use:
- Inline styles for maximum email client compatibility
- `role="presentation"` tables for layout (not semantic tables)
- MSO conditional comments for Outlook compatibility
- Responsive `max-width:600px` design

## Adding a New Template

1. Add a new function in `server/services/emailTemplates.js`:
   ```js
   function myNewTemplate(data) {
     const subject = `My Subject - ${data.someField}`;
     const body = `<td style="padding:32px;">...</td>`;
     return emailShell(subject, body, { preheader: '...' });
   }
   ```

2. Register it in `EMAIL_TEMPLATES`:
   ```js
   const EMAIL_TEMPLATES = {
     ...existing,
     'my-new-type': myNewTemplate,
   };
   ```

3. Add the notification type to `NOTIFICATION_TYPES` in `notifications.js`
4. Add a template entry to `NOTIFICATION_TEMPLATES` in `notifications.js`
5. Call `sendNotification({ type, recipientId, recipientEmail, data })` from your API handler

## Testing

Run the template test suite:
```bash
node -e "
const { renderEmailTemplate } = require('./server/services/emailTemplates');
const types = ['new-application','application-received','application-accepted','application-declined','application-withdrawn','invitation-declined','student-accepted-invite','project-completed','invite-received','assessment-received','new-message'];
for (const t of types) {
  const html = renderEmailTemplate(t, 'Test', { studentName:'Test',companyName:'Test',projectTitle:'Test' });
  console.log(t, html ? '✓' : '✗', html?.length + ' chars');
}
"
```

To preview a template in your browser, pipe the output to a file and open it:
```bash
node -e "
const { renderEmailTemplate } = require('./server/services/emailTemplates');
const html = renderEmailTemplate('application-accepted', 'Test', {
  studentName: 'Jane Doe',
  companyName: 'Acme Corp',
  projectTitle: 'Market Analysis Q1',
});
process.stdout.write(html);
" > /tmp/email-preview.html && open /tmp/email-preview.html
```
