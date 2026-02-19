/**
 * Tests for the Application Messaging data access layer.
 *
 * Validates the SQLite-backed applicationMessages and projectApplications
 * DAOs that power the custom messaging system (Phases 1-4).
 */

const db = require('./db');

describe('Application Messaging Data Access Layer', () => {
  const testStudentId = 'test-student-' + Date.now();
  const testCorporateId = 'test-corporate-' + Date.now();
  const testListingId = 'test-listing-' + Date.now();
  let testApplicationId;

  // ─── Setup: create a test application ────────────────────────────────────

  beforeAll(() => {
    testApplicationId = `app-test-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    db.projectApplications.create({
      id: testApplicationId,
      studentId: testStudentId,
      listingId: testListingId,
      coverLetter: 'Test cover letter',
      interestReason: 'Testing',
      status: 'pending',
      corporateId: testCorporateId,
      corporateName: 'Test Corp',
      corporateEmail: 'corp@test.com',
      studentName: 'Test Student',
      studentEmail: 'student@test.com',
      listingTitle: 'Test Project',
      initiatedBy: 'student',
    });
  });

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  afterAll(() => {
    // Clean up test data
    try {
      db._sqlite.prepare('DELETE FROM application_messages WHERE application_id = ?').run(testApplicationId);
      db._sqlite.prepare('DELETE FROM project_applications WHERE id = ?').run(testApplicationId);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // ─── projectApplications tests ───────────────────────────────────────────

  describe('projectApplications', () => {
    test('getById returns the created application', () => {
      const app = db.projectApplications.getById(testApplicationId);
      expect(app).not.toBeNull();
      expect(app.id).toBe(testApplicationId);
      expect(app.studentId).toBe(testStudentId);
      expect(app.corporateId).toBe(testCorporateId);
      expect(app.status).toBe('pending');
      expect(app.listingTitle).toBe('Test Project');
      expect(app.initiatedBy).toBe('student');
    });

    test('getByUserId returns applications for a participant', () => {
      const apps = db.projectApplications.getByUserId(testStudentId);
      expect(apps.length).toBeGreaterThanOrEqual(1);
      const found = apps.find(a => a.id === testApplicationId);
      expect(found).toBeTruthy();
    });

    test('getByUserId also finds by corporateId', () => {
      const apps = db.projectApplications.getByUserId(testCorporateId);
      const found = apps.find(a => a.id === testApplicationId);
      expect(found).toBeTruthy();
    });

    test('findActiveByStudentAndListing finds active application', () => {
      const active = db.projectApplications.findActiveByStudentAndListing(testStudentId, testListingId);
      expect(active).not.toBeNull();
      expect(active.id).toBe(testApplicationId);
    });

    test('updateStatus transitions correctly', () => {
      const updated = db.projectApplications.updateStatus(testApplicationId, 'accepted');
      expect(updated.status).toBe('accepted');
      expect(updated.respondedAt).toBeTruthy();
      expect(updated.reviewedAt).toBeTruthy();
      // Reset for remaining tests
      db.projectApplications.updateStatus(testApplicationId, 'pending');
    });

    test('countByStatus returns counts', () => {
      const counts = db.projectApplications.countByStatus(testCorporateId);
      expect(typeof counts).toBe('object');
      expect(counts.pending).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── applicationMessages tests ───────────────────────────────────────────

  describe('applicationMessages', () => {
    const messageIds = [];

    test('create stores a message', () => {
      const msgId = `msg-test-${Date.now()}-1`;
      messageIds.push(msgId);
      const msg = db.applicationMessages.create({
        id: msgId,
        applicationId: testApplicationId,
        senderId: testStudentId,
        senderName: 'Test Student',
        senderRole: 'student',
        content: 'Hello, I am interested in this project!',
        messageType: 'user',
      });
      expect(msg).not.toBeNull();
      expect(msg.id).toBe(msgId);
      expect(msg.content).toBe('Hello, I am interested in this project!');
      expect(msg.senderName).toBe('Test Student');
      expect(msg.messageType).toBe('user');
    });

    test('create stores a reply', () => {
      const msgId = `msg-test-${Date.now()}-2`;
      messageIds.push(msgId);
      const msg = db.applicationMessages.create({
        id: msgId,
        applicationId: testApplicationId,
        senderId: testCorporateId,
        senderName: 'Test Corp',
        senderRole: 'corporate-partner',
        content: 'Thanks for your interest! Can we schedule a call?',
        messageType: 'user',
      });
      expect(msg).not.toBeNull();
      expect(msg.senderId).toBe(testCorporateId);
    });

    test('getByApplicationId returns messages in order', () => {
      const messages = db.applicationMessages.getByApplicationId(testApplicationId);
      expect(messages.length).toBeGreaterThanOrEqual(2);
      // Should be in chronological order (ASC)
      const first = messages[0];
      const second = messages[1];
      expect(new Date(first.createdAt) <= new Date(second.createdAt)).toBe(true);
    });

    test('getMessageCount returns correct count', () => {
      const count = db.applicationMessages.getMessageCount(testApplicationId);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('getUnreadCountByUser counts unread messages from others', () => {
      // Student should have 1 unread (the corporate's reply)
      const studentUnread = db.applicationMessages.getUnreadCountByUser(testStudentId);
      expect(studentUnread).toBeGreaterThanOrEqual(1);

      // Corporate should have 1 unread (the student's message)
      const corpUnread = db.applicationMessages.getUnreadCountByUser(testCorporateId);
      expect(corpUnread).toBeGreaterThanOrEqual(1);
    });

    test('getUnreadCountByApplication returns per-conversation count', () => {
      const unread = db.applicationMessages.getUnreadCountByApplication(testApplicationId, testStudentId);
      expect(unread).toBeGreaterThanOrEqual(1);
    });

    test('markAsRead marks messages from other party', () => {
      const changed = db.applicationMessages.markAsRead(testApplicationId, testStudentId);
      expect(changed).toBeGreaterThanOrEqual(1);

      // Now student should have 0 unread for this conversation
      const unread = db.applicationMessages.getUnreadCountByApplication(testApplicationId, testStudentId);
      expect(unread).toBe(0);
    });

    test('createSystemMessage creates a system message', () => {
      const sysMsg = db.applicationMessages.createSystemMessage(
        testApplicationId,
        'Application status changed to accepted.'
      );
      expect(sysMsg).not.toBeNull();
      expect(sysMsg.messageType).toBe('system');
      expect(sysMsg.senderId).toBe('system');
      expect(sysMsg.senderRole).toBe('system');
      expect(sysMsg.content).toBe('Application status changed to accepted.');
    });

    test('getConversationPreviews returns conversation summaries', () => {
      const previews = db.applicationMessages.getConversationPreviews(testStudentId);
      expect(previews.length).toBeGreaterThanOrEqual(1);
      const preview = previews.find(p => p.id === testApplicationId);
      expect(preview).toBeTruthy();
      expect(preview.lastMessageContent).toBeTruthy();
      expect(typeof preview.unreadCount).toBe('number');
      expect(typeof preview.totalMessages).toBe('number');
      expect(preview.totalMessages).toBeGreaterThanOrEqual(3); // 2 user + 1 system
    });

    test('getById retrieves a specific message', () => {
      const msg = db.applicationMessages.getById(messageIds[0]);
      expect(msg).not.toBeNull();
      expect(msg.id).toBe(messageIds[0]);
    });
  });
});
