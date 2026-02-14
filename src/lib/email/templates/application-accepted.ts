/**
 * Application Accepted Email Template — sent to student
 */

import { emailShell } from './shell';

export function applicationAcceptedEmail(data: {
  studentName: string;
  projectTitle: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Congratulations! Your application for "${data.projectTitle}" was accepted`,
    html: emailShell({
      title: 'Application Accepted',
      preheader: `Great news — ${data.companyName} accepted your application!`,
      body: `
        <h2>Application Accepted!</h2>
        <p>Hi ${data.studentName},</p>
        <p>Great news! <strong>${data.companyName}</strong> has accepted your application for <strong>"${data.projectTitle}"</strong>.</p>
        <p>You can now communicate with the team through the messaging system to discuss next steps.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/applications" class="btn">View Applications</a>
        </p>
      `,
    }),
  };
}
