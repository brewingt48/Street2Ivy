# Alumni User Guide

> Street2Ivy Alumni Dashboard — Complete User Guide

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Accepting Your Invitation](#2-accepting-your-invitation)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Creating Projects](#4-creating-projects)
5. [Managing Applications](#5-managing-applications)
6. [Messages](#6-messages)
7. [Profile Management](#7-profile-management)
8. [Project Workspace](#8-project-workspace)
9. [FAQ & Troubleshooting](#9-faq--troubleshooting)

---

## 1. Getting Started

### Who Is This For?

This guide is for **alumni** who have been invited by their institution's career services team to join Street2Ivy. As an alumni, you can:

- Create mentorship projects for current students.
- Review and accept student applications.
- Collaborate with students through the project workspace.
- Build your institution's professional network.

### How Alumni Access Works

Alumni access is **invitation-only**. Your institution's career services administrator must invite you using your email address. You'll receive an email with a unique invitation link.

### Requirements

- A valid email address (the same one your institution used to invite you).
- An active Street2Ivy account (created during the invitation acceptance flow).

---

## 2. Accepting Your Invitation

### Step-by-Step

1. **Check your email** for an invitation from Street2Ivy (sent on behalf of your institution).
   - Subject line: "You're Invited to Join [Institution Name] on Street2Ivy"
   - The email includes your institution name, the inviter's name, and your unique link.

2. **Click the invitation link** — it opens the Alumni Join page at `/alumni/join/[your-invitation-code]`.

3. **Verify your invitation** — the system automatically checks your invitation code. You'll see:
   - Your name and institution
   - A confirmation that the invitation is valid

4. **Create your account** (if you don't already have one):
   - Enter your email and password.
   - Complete your profile information.

5. **You're in!** Your account is now marked as a verified alumni of your institution. You'll be redirected to your Alumni Dashboard.

### What If My Link Doesn't Work?

- **"Invalid Invitation"** — The code may have expired or been used. Ask your career services office to **resend** your invitation (they can do this from their Alumni tab).
- **"Already Accepted"** — You've already accepted this invitation. Just log in normally.
- **Expired link** — Invitation codes don't expire by default, but your admin can regenerate one by clicking "Resend".

---

## 3. Dashboard Overview

Access your dashboard at `/alumni/dashboard` or click **Alumni Dashboard** in the navigation.

### Overview Tab

Your home screen shows:

| Metric | Description |
|--------|-------------|
| **Projects Created** | Total mentorship projects you've posted. |
| **Active Projects** | Projects with students currently working on them. |
| **Total Applications** | Number of student applications received across all your projects. |

Below the stats, you'll see your **Recent Activity** — a feed of recent events like new applications, project updates, and messages.

> **Tip:** Each stat card has a small **?** help icon. Hover over it for a detailed explanation of that metric.

### Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| **Overview** | Stats, recent activity |
| **Projects** | Create and manage your projects |
| **Messages** | Inbox and sent messages |
| **Profile** | View and edit your alumni profile |

---

## 4. Creating Projects

### What Are Projects?

Projects are mentorship or consulting opportunities that you create for students. They appear in the marketplace where students from your institution (and potentially other institutions) can discover and apply to them.

### Creating a New Project

1. Go to the **Projects** tab.
2. Click **Create Project** (or navigate to `/l/new`).
3. Fill in the listing details:
   - **Title** — Clear, descriptive project name.
   - **Description** — What the student will work on, learn, and deliver.
   - **Category** — Select the appropriate category.
   - **Duration** — Expected project timeline.
   - **Skills Required** — What skills the student should have.
   - **Compensation** — If applicable (some projects are unpaid mentorships).
4. Publish your listing.

### Project Lifecycle

```
Draft → Published → Applications Received → Student Accepted → In Progress → Completed
```

### Best Practices

- **Be specific** about deliverables and time commitment.
- **Respond promptly** to applications — students are eager and may apply elsewhere.
- **Set clear expectations** about communication frequency and meeting cadence.
- **Provide feedback** throughout the project, not just at the end.

---

## 5. Managing Applications

### Reviewing Applications

When students apply to your projects:

1. You'll receive a notification (in-app and/or email).
2. Go to your project listing or the **Inbox** to review applications.
3. Each application includes the student's profile, major, graduation year, and a message.

### Accepting or Declining

- **Accept** — The student is assigned to your project. They gain access to the project workspace.
- **Decline** — The student is notified that they weren't selected. Be kind — a brief reason helps students improve future applications.

### NDA Management (If Enabled)

If your institution has NDA management enabled:

1. You can upload an NDA document to your project listing.
2. Accepted students must e-sign the NDA before accessing project details.
3. Both parties receive signed copies.

---

## 6. Messages

### Inbox

The **Messages tab** shows communications from:

- Students who have applied to or are working on your projects.
- Your institution's career services team.
- Street2Ivy platform notifications.

### Sending Messages

You can message students directly from:

- The project workspace (for accepted students).
- The transaction/order page.
- Responding to received messages.

### Attachments

If message attachments are enabled, you can:

- Upload files (documents, images) with your messages.
- Download attachments from received messages.
- Preview supported file types directly in the browser.

---

## 7. Profile Management

### Viewing Your Profile

The **Profile tab** displays:

- **Name** — Your display name on the platform.
- **Company** — Your current employer (from your profile settings).
- **Role** — Your current job title.
- **Graduation Year** — When you graduated from your institution.
- **Institution** — Your verified institution domain.

### Editing Your Profile

Click **Edit Profile** to go to the profile settings page (`/profile-settings`) where you can update:

- Display name and bio.
- Profile photo.
- Professional details (company, role, LinkedIn, etc.).
- Location and contact preferences.

### Why Profile Matters

A complete profile helps:

- Students trust you as a legitimate mentor.
- Your institution showcase their alumni network.
- Corporate partners understand the quality of your institution's graduates.

---

## 8. Project Workspace

### What Is the Project Workspace?

Once a student is accepted to your project, both of you get access to a **secure project workspace** at `/project-workspace/:transactionId`. This is your collaboration hub.

### Workspace Features

- **Messages** — Real-time messaging between you and the student.
- **NDA Acceptance** — If an NDA is required, the student signs it here.
- **Read Receipts** — See when messages have been read.
- **File Sharing** — Exchange documents and deliverables (via message attachments).

### Project Completion

When the project is done:

1. Mark the project as complete through the transaction flow.
2. Both parties may be asked to provide feedback or assessments.
3. The project appears in both your and the student's "Completed" statistics.

---

## 9. FAQ & Troubleshooting

### Q: I didn't receive my invitation email.

Check your spam/junk folder. The email comes from `noreply@street2ivy.com` (or your institution's configured email address). If you still can't find it, ask your career services office to resend the invitation.

### Q: Can I invite other alumni?

No. Only educational administrators (career services staff) can invite alumni. Ask your career services office to send invitations to colleagues you'd like to join.

### Q: My invitation link says "Invalid Invitation".

The invitation code may have been regenerated (e.g., if your admin clicked "Resend"). Ask them to resend you a fresh invitation — the new link will work.

### Q: How do I create a project?

Go to the **Projects** tab and click **Create Project**, or navigate directly to `/l/new`. Follow the listing creation flow.

### Q: Can students from other institutions apply to my projects?

This depends on your institution's configuration. By default, projects are visible across the marketplace. Your institution's admin may have configured tenant-scoped browsing to limit visibility.

### Q: How do I deactivate my alumni account?

Go to **Account Settings** > **Manage Account** to manage your account. If you want to remove your alumni status specifically, contact your institution's career services office.

### Q: I'm having technical issues.

1. Try clearing your browser cache and refreshing.
2. Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge).
3. Contact Street2Ivy support through the messaging system or at the contact information provided by your institution.

### Q: Can I be alumni at multiple institutions?

Currently, each alumni account is linked to one institution. If you're alumni of multiple institutions, contact Street2Ivy support for assistance.

---

*Last updated: February 2026*
*Street2Ivy Platform Documentation*
