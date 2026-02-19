/**
 * Professional HTML Email Templates for Campus2Career
 *
 * Each template function receives a data object and returns a complete HTML email string.
 * Templates use inline styles for maximum email client compatibility.
 *
 * Brand colors (from s2i design system):
 *   Navy 900:  #0f172a  (header background)
 *   Teal 600:  #00A89A  (primary CTA, links)
 *   Teal 700:  #008A7F  (CTA hover)
 *   Slate 700: #334155  (body text)
 *   Slate 500: #64748B  (secondary text)
 *   Slate 100: #F1F5F9  (page background)
 *   Slate 50:  #F8FAFC  (footer background)
 *   White:     #FFFFFF  (card background)
 *   Emerald:   #059669  (success accents)
 *   Coral 600: #D94336  (decline accents)
 *   Amber 500: #FFB43C  (star/highlight accents)
 */

// ─── Shared Layout ───────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wraps body content in the Campus2Career email shell (header, card, footer).
 */
function emailShell(subject, bodyHtml, { preheader = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#0f172a;padding:20px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;letter-spacing:-0.3px;">Campus2Career</span>
                    <span style="font-size:11px;color:#94A3B8;margin-left:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">by Street2Ivy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size:12px;color:#94A3B8;line-height:1.5;">
                    <p style="margin:0 0 4px 0;">Street2Ivy, Inc. &middot; Campus2Career Platform</p>
                    <p style="margin:0 0 4px 0;">You received this email because you have an account on Campus2Career.</p>
                    <p style="margin:0;">
                      <a href="${getBaseUrl()}/account/notifications" style="color:#64748B;text-decoration:underline;font-size:11px;">Manage notification preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Bottom spacing -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:16px;text-align:center;">
              <span style="font-size:11px;color:#94A3B8;">&copy; ${new Date().getFullYear()} Street2Ivy, Inc. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getBaseUrl() {
  return process.env.REACT_APP_MARKETPLACE_ROOT_URL || 'https://street2ivy.com';
}

/**
 * Renders a primary CTA button (teal).
 */
function ctaButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background-color:#00A89A;border-radius:6px;">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${escapeHtml(text)}
      </a>
    </td>
  </tr>
</table>`;
}

/**
 * Renders an info row (label: value) for detail sections.
 */
function infoRow(label, value) {
  if (!value) return '';
  return `<tr>
  <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:6px 0;color:#334155;font-size:14px;">${escapeHtml(value)}</td>
</tr>`;
}

/**
 * Renders a status badge.
 */
function statusBadge(text, { bg = '#E6FBFA', color = '#004D47' } = {}) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:12px;background-color:${bg};color:${color};font-size:12px;font-weight:600;letter-spacing:0.3px;">${escapeHtml(text)}</span>`;
}

// ─── Per-Type Templates ──────────────────────────────────────────────────────

/**
 * NEW_APPLICATION — sent to corporate partner when a student applies
 */
function newApplication(data) {
  const subject = `New Application for ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">New Application Received</h1>
      <p style="margin:0 0 24px 0;font-size:15px;color:#64748B;">A new applicant has applied for your project.</p>

      <!-- Project Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 4px 0;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Project</p>
            <p style="margin:0 0 16px 0;font-size:17px;color:#0f172a;font-weight:600;">${escapeHtml(data.projectTitle)}</p>

            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow('Applicant', data.studentName)}
              ${infoRow('University', data.studentUniversity)}
              ${infoRow('Major', data.studentMajor)}
            </table>
          </td>
        </tr>
      </table>

      ${ctaButton('Review Application', data.applicationUrl || `${getBaseUrl()}/inbox/received`)}

      <p style="margin:16px 0 0 0;font-size:13px;color:#94A3B8;">Tip: Respond quickly to applications to attract top talent.</p>
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.studentName} applied for "${data.projectTitle}"`,
  });
}

/**
 * APPLICATION_RECEIVED — confirmation sent to student after applying
 */
function applicationReceived(data) {
  const subject = `Application Received - ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">Application Submitted!</h1>
      <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;">Your application for <strong>"${escapeHtml(data.projectTitle)}"</strong> has been received. The corporate partner will review your application and get back to you soon.</p>

      <!-- Details Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${infoRow('Company', data.companyName)}
              ${infoRow('Timeline', data.timeline)}
              <tr>
                <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;width:120px;">Status</td>
                <td style="padding:6px 0;">${statusBadge('Under Review')}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${ctaButton('Track Your Application', `${getBaseUrl()}/inbox/applications`)}

      <p style="margin:16px 0 0 0;font-size:14px;color:#64748B;line-height:1.5;">While you wait, keep browsing other projects — applying to multiple opportunities increases your chances!</p>
    </td>`;

  return emailShell(subject, body, {
    preheader: `Your application for "${data.projectTitle}" was received`,
  });
}

/**
 * APPLICATION_ACCEPTED — sent to student when accepted
 */
function applicationAccepted(data) {
  const subject = `Congratulations! Your Application Was Accepted`;
  const body = `
    <td style="padding:0;">
      <!-- Success Banner -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;background-color:#ECFDF5;text-align:center;">
            <span style="font-size:32px;">&#127881;</span>
            <h1 style="margin:8px 0 0 0;font-size:22px;color:#064E3B;font-weight:700;">Application Accepted!</h1>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
            <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;">Great news! <strong>${escapeHtml(data.companyName)}</strong> has accepted your application for <strong>"${escapeHtml(data.projectTitle)}"</strong>.</p>

            <!-- Next Steps -->
            <p style="margin:0 0 12px 0;font-size:14px;color:#0f172a;font-weight:600;">Next Steps:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#334155;">
                  <span style="display:inline-block;width:24px;height:24px;background-color:#00A89A;color:#FFFFFF;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">1</span>
                  Review and accept the project terms
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#334155;">
                  <span style="display:inline-block;width:24px;height:24px;background-color:#00A89A;color:#FFFFFF;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">2</span>
                  Access the project workspace
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#334155;">
                  <span style="display:inline-block;width:24px;height:24px;background-color:#00A89A;color:#FFFFFF;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;margin-right:10px;">3</span>
                  Connect with your corporate partner
                </td>
              </tr>
            </table>

            ${ctaButton('Go to Your Project', `${getBaseUrl()}/inbox/applications`)}
          </td>
        </tr>
      </table>
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.companyName} accepted your application for "${data.projectTitle}"`,
  });
}

/**
 * APPLICATION_DECLINED — sent to student when declined
 */
function applicationDeclined(data) {
  const subject = `Application Update - ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">Application Update</h1>
      <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;">Thank you for your interest in <strong>"${escapeHtml(data.projectTitle)}"</strong> at ${escapeHtml(data.companyName)}. After careful consideration, the corporate partner has decided to move forward with other candidates for this project.</p>

      <!-- Encouragement Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8E6;border:1px solid #FFE0A3;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 8px 0;font-size:15px;color:#663D00;font-weight:600;">&#128170; Don't be discouraged!</p>
            <p style="margin:0;font-size:14px;color:#8C5400;line-height:1.5;">Each application is valuable experience. Many students find their perfect match after applying to several projects. Keep building your skills and exploring opportunities.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('Browse More Projects', data.browseProjectsUrl || `${getBaseUrl()}/s`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `Update on your application for "${data.projectTitle}"`,
  });
}

/**
 * PROJECT_COMPLETED — sent to student when project is marked complete
 */
function projectCompleted(data) {
  const subject = `Project Completed - ${data.projectTitle}`;
  const body = `
    <td style="padding:0;">
      <!-- Completion Banner -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;background-color:#ECFDF5;text-align:center;">
            <span style="font-size:32px;">&#127942;</span>
            <h1 style="margin:8px 0 0 0;font-size:22px;color:#064E3B;font-weight:700;">Project Completed!</h1>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
            <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;">Congratulations on completing <strong>"${escapeHtml(data.projectTitle)}"</strong> with ${escapeHtml(data.companyName)}! This is a great achievement to add to your professional portfolio.</p>

            <!-- What's Next Card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 12px 0;font-size:14px;color:#0f172a;font-weight:600;">What's next?</p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">&#10003; &nbsp;Leave a review of your experience</p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">&#10003; &nbsp;Check your profile for any assessments</p>
                  <p style="margin:0 0 8px 0;font-size:14px;color:#334155;">&#10003; &nbsp;Update your profile with new skills</p>
                  <p style="margin:0;font-size:14px;color:#334155;">&#10003; &nbsp;Browse more projects to keep building experience</p>
                </td>
              </tr>
            </table>

            ${ctaButton('View Project Details', `${getBaseUrl()}/inbox/applications`)}
          </td>
        </tr>
      </table>
    </td>`;

  return emailShell(subject, body, {
    preheader: `Congratulations on completing "${data.projectTitle}"`,
  });
}

/**
 * INVITE_RECEIVED — sent to student when invited to apply
 */
function inviteReceived(data) {
  const subject = `New Project Invitation from ${data.companyName}`;
  const body = `
    <td style="padding:0;">
      <!-- Invite Banner -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;background-color:#E6FBFA;text-align:center;">
            <span style="font-size:32px;">&#128140;</span>
            <h1 style="margin:8px 0 0 0;font-size:22px;color:#004D47;font-weight:700;">You've Been Invited!</h1>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
            <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;"><strong>${escapeHtml(data.companyName)}</strong> thinks you'd be a great fit and has personally invited you to apply for a project.</p>

            <!-- Project Card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:16px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 4px 0;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Project Invitation</p>
                  <p style="margin:0 0 12px 0;font-size:17px;color:#0f172a;font-weight:600;">${escapeHtml(data.projectTitle)}</p>
                  ${data.projectDescription ? `<p style="margin:0;font-size:14px;color:#64748B;line-height:1.5;">${escapeHtml(data.projectDescription)}</p>` : ''}
                </td>
              </tr>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF8E6;border-radius:6px;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#8C5400;">
                  &#9733; Personalized invitations mean the company is specifically interested in your profile!
                </td>
              </tr>
            </table>

            ${ctaButton('View Invitation', data.invitationUrl || `${getBaseUrl()}/inbox/applications`)}
          </td>
        </tr>
      </table>
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.companyName} invited you to apply for "${data.projectTitle}"`,
  });
}

/**
 * ASSESSMENT_RECEIVED — sent to student when assessment is submitted
 */
function assessmentReceived(data) {
  const subject = `Assessment Received for ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">Performance Assessment Received</h1>
      <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.studentName)},</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;"><strong>${escapeHtml(data.companyName)}</strong> has submitted a performance assessment for your work on <strong>"${escapeHtml(data.projectTitle)}"</strong>.</p>

      <!-- Assessment Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#064E3B;font-weight:600;">&#128203; What this means</p>
            <p style="margin:0;font-size:14px;color:#065F46;line-height:1.5;">This assessment is now part of your Campus2Career profile. Strong assessments help you stand out when applying to future projects.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('View Your Assessment', data.assessmentUrl || `${getBaseUrl()}/profile`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.companyName} submitted an assessment for "${data.projectTitle}"`,
  });
}

/**
 * NEW_MESSAGE — sent when a new message is received in a transaction
 */
function newMessage(data) {
  const subject = `New Message from ${data.senderName}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">New Message</h1>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.recipientName)},</p>

      <!-- Message Preview Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(data.senderName)}</span>
                  ${data.companyContext ? `<span style="font-size:13px;color:#64748B;"> ${escapeHtml(data.companyContext)}</span>` : ''}
                </td>
              </tr>
              ${data.messagePreview ? `<tr>
                <td style="padding:12px 16px;background-color:#FFFFFF;border-radius:6px;border:1px solid #E2E8F0;">
                  <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;font-style:italic;">"${escapeHtml(data.messagePreview)}"</p>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      ${ctaButton('View Conversation', data.conversationUrl || `${getBaseUrl()}/inbox`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.senderName}: "${(data.messagePreview || '').substring(0, 80)}"`,
  });
}

/**
 * STUDENT_ACCEPTED_INVITE — sent to corporate partner when student accepts invite
 */
function studentAcceptedInvite(data) {
  const subject = `${data.studentName} Accepted Your Invitation for ${data.projectTitle}`;
  const body = `
    <td style="padding:0;">
      <!-- Success Banner -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px;background-color:#E6FBFA;text-align:center;">
            <span style="font-size:32px;">&#9989;</span>
            <h1 style="margin:8px 0 0 0;font-size:22px;color:#004D47;font-weight:700;">Invitation Accepted!</h1>
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:24px 32px 32px 32px;">
            <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.companyName)} Team,</p>
            <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;"><strong>${escapeHtml(data.studentName)}</strong> has accepted your invitation to apply for <strong>"${escapeHtml(data.projectTitle)}"</strong>. They may submit their full application soon.</p>

            <!-- Info Card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#0f172a;font-weight:600;">&#128203; What happens next</p>
                  <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">The applicant will complete and submit their full application. You'll receive another notification when it arrives. Keep an eye on your inbox!</p>
                </td>
              </tr>
            </table>

            ${ctaButton('View Your Applications', data.applicationUrl || `${getBaseUrl()}/inbox/received`)}
          </td>
        </tr>
      </table>
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.studentName} accepted your invitation for "${data.projectTitle}"`,
  });
}

/**
 * APPLICATION_WITHDRAWN — sent to corporate partner when student withdraws their application
 */
function applicationWithdrawn(data) {
  const subject = `Application Withdrawn - ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">Application Withdrawn</h1>
      <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.companyName)} Team,</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;"><strong>${escapeHtml(data.studentName)}</strong> has withdrawn their application for <strong>"${escapeHtml(data.projectTitle)}"</strong>.</p>

      <!-- Info Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">This application has been removed from your active applications list. No further action is needed from your end.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('View Your Applications', `${getBaseUrl()}/inbox/received`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.studentName} withdrew their application for "${data.projectTitle}"`,
  });
}

/**
 * INVITATION_DECLINED — sent to corporate partner when student declines their invitation
 */
function invitationDeclined(data) {
  const subject = `Invitation Declined - ${data.projectTitle}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">Invitation Update</h1>
      <p style="margin:0 0 4px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.companyName)} Team,</p>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;line-height:1.6;"><strong>${escapeHtml(data.studentName)}</strong> has decided not to pursue the invitation to apply for <strong>"${escapeHtml(data.projectTitle)}"</strong> at this time.</p>

      <!-- Encouragement Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#0f172a;font-weight:600;">What you can do next</p>
            <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;">There are many qualified students on Campus2Career. Browse student profiles and send invitations to find the right match for your project.</p>
          </td>
        </tr>
      </table>

      ${ctaButton('Browse Students', `${getBaseUrl()}/s?pub_userType=student`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.studentName} declined your invitation for "${data.projectTitle}"`,
  });
}

/**
 * DIRECT_MESSAGE — sent when a user sends a direct message (user ↔ admin, or user-initiated)
 */
function directMessage(data) {
  const subject = data.subject
    ? `New Message from ${data.senderName}: ${data.subject}`
    : `New Message from ${data.senderName}`;
  const body = `
    <td style="padding:32px;">
      <h1 style="margin:0 0 8px 0;font-size:22px;color:#0f172a;font-weight:700;">New Message</h1>
      <p style="margin:0 0 24px 0;font-size:15px;color:#334155;">Hi ${escapeHtml(data.recipientName)},</p>

      <!-- Message Preview Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding-bottom:12px;">
                  <span style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(data.senderName)}</span>
                  ${data.subject ? `<br/><span style="font-size:13px;color:#64748B;">Re: ${escapeHtml(data.subject)}</span>` : ''}
                </td>
              </tr>
              ${data.messagePreview ? `<tr>
                <td style="padding:12px 16px;background-color:#FFFFFF;border-radius:6px;border:1px solid #E2E8F0;">
                  <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;font-style:italic;">"${escapeHtml(data.messagePreview)}"</p>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      ${ctaButton('View Conversation', data.conversationUrl || `${getBaseUrl()}/inbox`)}
    </td>`;

  return emailShell(subject, body, {
    preheader: `${data.senderName}: "${(data.messagePreview || '').substring(0, 80)}"`,
  });
}

// ─── Template Registry ───────────────────────────────────────────────────────

/**
 * Map of notification type → template function.
 * Each function takes (data) and returns a full HTML email string.
 */
const EMAIL_TEMPLATES = {
  'new-application': newApplication,
  'application-received': applicationReceived,
  'application-accepted': applicationAccepted,
  'application-declined': applicationDeclined,
  'application-withdrawn': applicationWithdrawn,
  'invitation-declined': invitationDeclined,
  'project-completed': projectCompleted,
  'invite-received': inviteReceived,
  'assessment-received': assessmentReceived,
  'new-message': newMessage,
  'student-accepted-invite': studentAcceptedInvite,
  'direct-message': directMessage,
};

/**
 * Generate an HTML email for the given notification type.
 *
 * @param {string} type - Notification type (e.g. 'application-received')
 * @param {string} subject - Email subject line
 * @param {Object} data - Template data
 * @returns {string|null} HTML string, or null if no template found (falls back to generic)
 */
function renderEmailTemplate(type, subject, data) {
  const templateFn = EMAIL_TEMPLATES[type];
  if (!templateFn) return null; // Caller should fall back to generic wrapInHtmlTemplate
  try {
    return templateFn(data);
  } catch (err) {
    console.error(`[EmailTemplates] Error rendering template for ${type}:`, err.message);
    return null;
  }
}

module.exports = {
  renderEmailTemplate,
  emailShell,
  escapeHtml,
};
