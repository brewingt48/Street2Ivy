/**
 * Project Completed Email Template — sent to student
 */

import { emailShell } from './shell';

export function projectCompletedEmail(data: {
  studentName: string;
  projectTitle: string;
  companyName: string;
}): { subject: string; html: string } {
  return {
    subject: `Project "${data.projectTitle}" has been marked as completed`,
    html: emailShell({
      title: 'Project Completed',
      preheader: 'Congratulations on completing your project!',
      body: `
        <h2>Project Completed!</h2>
        <p>Hi ${data.studentName},</p>
        <p>Congratulations! Your work on <strong>"${data.projectTitle}"</strong> with <strong>${data.companyName}</strong> has been marked as completed.</p>
        <p>You may receive a performance assessment from the project team. Keep up the great work!</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/applications" class="btn">View Details</a>
        </p>
      `,
    }),
  };
}
