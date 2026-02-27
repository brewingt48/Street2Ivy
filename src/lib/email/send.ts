/**
 * Email Send Utility
 *
 * Central function for sending transactional emails via Mailgun.
 * Silently fails in development if MAILGUN_API_KEY is not set.
 */

import { getMailgunClient, DOMAIN, FROM_EMAIL } from './client';

import { welcomeEmail } from './templates/welcome';
import { passwordResetEmail } from './templates/password-reset';
import { newApplicationEmail } from './templates/new-application';
import { applicationAcceptedEmail } from './templates/application-accepted';
import { applicationDeclinedEmail } from './templates/application-declined';
import { newMessageEmail } from './templates/new-message';
import { directMessageEmail } from './templates/direct-message';
import { inviteReceivedEmail } from './templates/invite-received';
import { projectCompletedEmail } from './templates/project-completed';
import { assessmentReceivedEmail } from './templates/assessment-received';

export {
  welcomeEmail,
  passwordResetEmail,
  newApplicationEmail,
  applicationAcceptedEmail,
  applicationDeclinedEmail,
  newMessageEmail,
  directMessageEmail,
  inviteReceivedEmail,
  projectCompletedEmail,
  assessmentReceivedEmail,
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
}

/**
 * Send an email via Mailgun.
 *
 * Returns true if sent successfully, false otherwise.
 * Does NOT throw — callers should not gate business logic on email delivery.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const mg = getMailgunClient();

  // Skip if Mailgun is not configured
  if (!mg) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Email would be sent to ${options.to}: ${options.subject}`);
    }
    return false;
  }

  try {
    await mg.messages.create(DOMAIN, {
      from: FROM_EMAIL,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      'o:tag': options.tags || ['transactional'],
    });

    return true;
  } catch (error) {
    console.error(`Email send failed to ${options.to}:`, error);
    return false;
  }
}

/**
 * Strip HTML tags for plain-text fallback.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
