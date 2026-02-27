/**
 * New Application Email Template — sent to corporate partner
 */

import { emailShell } from './shell';

export function newApplicationEmail(data: {
  corporateName: string;
  studentName: string;
  projectTitle: string;
  applicationId: string;
}): { subject: string; html: string } {
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://proveground.com'}/corporate/applications`;

  return {
    subject: `New Application: ${data.studentName} applied to "${data.projectTitle}"`,
    html: emailShell({
      title: 'New Application Received',
      preheader: `${data.studentName} has applied to your project.`,
      body: `
        <h2>New Application Received</h2>
        <p>Hi ${data.corporateName},</p>
        <p><strong>${data.studentName}</strong> has submitted an application for your project <strong>"${data.projectTitle}"</strong>.</p>
        <p>Review their application and respond at your convenience:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}" class="btn">Review Application</a>
        </p>
      `,
    }),
  };
}
