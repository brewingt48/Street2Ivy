/**
 * Shared Email HTML Shell
 *
 * Provides a consistent branded wrapper for all transactional emails.
 */

export function emailShell(options: {
  title: string;
  preheader?: string;
  body: string;
  footerText?: string;
}): string {
  const { title, preheader, body, footerText } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden">${preheader}</span>` : ''}
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #0d9488; text-decoration: none; }
    .body { color: #334155; font-size: 15px; line-height: 1.6; }
    .body h2 { color: #0f172a; font-size: 20px; margin: 0 0 16px 0; }
    .body p { margin: 0 0 16px 0; }
    .btn { display: inline-block; background-color: #0d9488; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; }
    .btn:hover { background-color: #0f766e; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
    .footer a { color: #64748b; text-decoration: underline; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://street2ivy-dev-c54ffcb26038.herokuapp.com'}" class="logo">Street2Ivy</a>
      </div>
      <div class="body">
        ${body}
      </div>
    </div>
    <div class="footer">
      <p>${footerText || 'You received this email because you have an account on Street2Ivy.'}</p>
      <p>&copy; ${new Date().getFullYear()} Street2Ivy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
