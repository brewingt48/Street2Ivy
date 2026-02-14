/**
 * Invite Received Email Template — sent to student
 */

import { emailShell } from './shell';

export function inviteReceivedEmail(data: {
  studentName: string;
  companyName: string;
  projectTitle: string;
}): { subject: string; html: string } {
  return {
    subject: `${data.companyName} invited you to a project on Street2Ivy`,
    html: emailShell({
      title: 'Project Invitation',
      preheader: `${data.companyName} wants to work with you!`,
      body: `
        <h2>You've Been Invited!</h2>
        <p>Hi ${data.studentName},</p>
        <p><strong>${data.companyName}</strong> has invited you to participate in their project <strong>"${data.projectTitle}"</strong>.</p>
        <p>Review the invitation and respond at your convenience:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/dashboard" class="btn">View Invitation</a>
        </p>
      `,
    }),
  };
}
