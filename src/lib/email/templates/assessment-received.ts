/**
 * Assessment Received Email Template — sent to student
 */

import { emailShell } from './shell';

export function assessmentReceivedEmail(data: {
  studentName: string;
  projectTitle: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `You received an assessment for "${data.projectTitle}"`,
    html: emailShell({
      title: 'Assessment Received',
      preheader: `${data.companyName} has submitted an assessment of your work.`,
      body: `
        <h2>Assessment Received</h2>
        <p>Hi ${data.studentName},</p>
        <p><strong>${data.companyName}</strong> has submitted a performance assessment for your work on <strong>"${data.projectTitle}"</strong>.</p>
        <p>View your assessment and feedback on your dashboard:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/dashboard" class="btn">View Assessment</a>
        </p>
      `,
    }),
  };
}
