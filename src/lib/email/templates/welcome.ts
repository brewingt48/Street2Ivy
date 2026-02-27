/**
 * Welcome Email Template
 */

import { emailShell } from './shell';

export function welcomeEmail(data: { firstName: string; role: string }): { subject: string; html: string } {
  const roleMessages: Record<string, string> = {
    student: 'You can now browse projects, build your profile, and apply to real-world project opportunities.',
    corporate_partner: 'You can now create project listings and connect with talented students.',
    educational_admin: 'You can now manage your institution\'s students and monitor their progress.',
    network_partner: 'You can now connect with institutions and share opportunities across the network.',
  };

  const roleMsg = roleMessages[data.role] || 'Welcome aboard!';

  return {
    subject: 'Welcome to Proveground!',
    html: emailShell({
      title: 'Welcome to Proveground',
      preheader: 'Your account is ready — start exploring today.',
      body: `
        <h2>Welcome, ${data.firstName}!</h2>
        <p>Your Proveground account has been created successfully. ${roleMsg}</p>
        <p>Here are a few things you can do to get started:</p>
        <ul style="color: #334155; padding-left: 20px;">
          <li>Complete your profile</li>
          <li>Explore available opportunities</li>
          <li>Connect with others on the platform</li>
        </ul>
        <p style="text-align: center; margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://proveground.com'}/dashboard" class="btn">Go to Dashboard</a>
        </p>
      `,
    }),
  };
}
