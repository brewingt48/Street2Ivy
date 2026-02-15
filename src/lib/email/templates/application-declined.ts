/**
 * Application Declined Email Template — sent to student
 */

import { emailShell } from './shell';

export function applicationDeclinedEmail(data: {
  studentName: string;
  projectTitle: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Update on your application for "${data.projectTitle}"`,
    html: emailShell({
      title: 'Application Update',
      preheader: `An update on your application to ${data.companyName}.`,
      body: `
        <h2>Application Update</h2>
        <p>Hi ${data.studentName},</p>
        <p>Thank you for your interest in <strong>"${data.projectTitle}"</strong> with <strong>${data.companyName}</strong>.</p>
        <p>After careful consideration, they have decided to move forward with other candidates for this project.</p>
        <p>Don't be discouraged — there are many more opportunities waiting for you on Proveground!</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/projects" class="btn">Browse Projects</a>
        </p>
      `,
    }),
  };
}
