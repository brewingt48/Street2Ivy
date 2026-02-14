/**
 * New Message Email Template — sent for application messages
 */

import { emailShell } from './shell';

export function newMessageEmail(data: {
  recipientName: string;
  senderName: string;
  projectTitle: string;
  preview: string;
}): { subject: string; html: string } {
  return {
    subject: `New message from ${data.senderName} about "${data.projectTitle}"`,
    html: emailShell({
      title: 'New Message',
      preheader: `${data.senderName} sent you a message.`,
      body: `
        <h2>New Message</h2>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.senderName}</strong> sent you a message about <strong>"${data.projectTitle}"</strong>:</p>
        <div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 12px 16px; margin: 16px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; color: #475569; font-style: italic;">"${data.preview.substring(0, 200)}${data.preview.length > 200 ? '...' : ''}"</p>
        </div>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/inbox" class="btn">View Message</a>
        </p>
      `,
    }),
  };
}
