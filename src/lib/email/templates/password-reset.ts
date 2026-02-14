/**
 * Password Reset Email Template
 */

import { emailShell } from './shell';

export function passwordResetEmail(data: { firstName: string; resetToken: string }): { subject: string; html: string } {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}/reset-password?token=${data.resetToken}`;

  return {
    subject: 'Reset Your Password — Campus2Career',
    html: emailShell({
      title: 'Reset Your Password',
      preheader: 'You requested a password reset for your Campus2Career account.',
      body: `
        <h2>Password Reset Request</h2>
        <p>Hi ${data.firstName},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" class="btn">Reset Password</a>
        </p>
        <p style="font-size: 13px; color: #64748b;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr class="divider" />
        <p style="font-size: 12px; color: #94a3b8;">If the button doesn't work, copy and paste this URL into your browser:<br/>
          <a href="${resetUrl}" style="color: #0d9488;">${resetUrl}</a>
        </p>
      `,
    }),
  };
}
