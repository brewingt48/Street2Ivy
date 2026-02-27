/**
 * Mailgun Client
 *
 * Lazy-initialized Mailgun client to avoid build-time errors
 * when MAILGUN_API_KEY is not set.
 */

import Mailgun from 'mailgun.js';
import formData from 'form-data';

export const DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.proveground.com';
export const FROM_EMAIL = process.env.FROM_EMAIL || 'Proveground <noreply@proveground.com>';

let _client: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;

/**
 * Get the Mailgun client (lazy-initialized).
 * Returns null if MAILGUN_API_KEY is not configured.
 */
export function getMailgunClient() {
  if (!process.env.MAILGUN_API_KEY) {
    return null;
  }

  if (!_client) {
    const mailgun = new Mailgun(formData);
    _client = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
    });
  }

  return _client;
}
