import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Proveground',
  description: 'Learn how Proveground collects, uses, and protects your personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-[#1a1a2e] mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-8 not-prose">
        Effective Date: February 23, 2026
      </p>

      <p>
        Proveground (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Proveground platform (the &quot;Service&quot;),
        a workforce readiness and talent-matching platform connecting students, educational institutions,
        and corporate partners. This Privacy Policy explains how we collect, use, share, and protect your
        personal information when you use our Service.
      </p>

      <p>
        If you are accessing the Service through an educational institution, references to
        &quot;[Institution Name]&quot; refer to your institution. For questions specific to your institution&apos;s
        data practices, contact your institution&apos;s privacy officer. For Proveground-specific inquiries,
        contact us at <strong>[Contact Email]</strong>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide</h3>
      <ul>
        <li>
          <strong>Account Information:</strong> Name, email address, password (stored as a salted hash),
          role (student, corporate partner, educational administrator, or platform admin).
        </li>
        <li>
          <strong>Profile Information:</strong> University, major, graduation year, GPA, bio, phone number,
          avatar image, sports played, and extracurricular activities.
        </li>
        <li>
          <strong>Academic Information:</strong> Coursework details, skills and competencies, project
          applications, cover letters, and portfolio content.
        </li>
        <li>
          <strong>Corporate Information:</strong> Company name, job title, department, company description,
          website, industry, company size, and stock ticker (if publicly traded).
        </li>
        <li>
          <strong>Project &amp; Application Data:</strong> Project listings, applications, messages between
          students and corporate partners, ratings, and feedback.
        </li>
        <li>
          <strong>AI Interaction Data:</strong> Conversations with our AI coaching features, career
          guidance queries, resume reviews, and interview preparation content.
        </li>
        <li>
          <strong>Communications:</strong> Direct messages, application messages, education messages, and
          notification preferences.
        </li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li>
          <strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and
          interaction patterns.
        </li>
        <li>
          <strong>Device Information:</strong> Browser type, operating system, IP address, and device
          identifiers.
        </li>
        <li>
          <strong>Cookies &amp; Similar Technologies:</strong> We use essential cookies (for authentication
          and security), analytics cookies (to understand usage patterns), and marketing cookies (for
          relevant advertising). See Section 8 for details.
        </li>
      </ul>

      <h3>1.3 Information from Third Parties</h3>
      <ul>
        <li>
          <strong>Educational Institutions:</strong> Enrollment verification, academic standing, and
          institutional domain information provided through SSO or administrative data sharing.
        </li>
        <li>
          <strong>Single Sign-On (SSO):</strong> If you authenticate via your institution&apos;s SSO
          provider, we receive basic profile information as configured by your institution.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>
          <strong>Talent Matching:</strong> Our proprietary ProveGround Match Engine uses your skills,
          availability, academic profile, and preferences to match you with relevant project opportunities
          and corporate partners.
        </li>
        <li>
          <strong>AI Coaching &amp; Career Services:</strong> We use your profile data and interaction
          history to provide personalized AI-powered career coaching, resume review, interview preparation,
          and portfolio intelligence reports through our integration with Anthropic&apos;s Claude AI.
        </li>
        <li>
          <strong>Analytics &amp; Reporting:</strong> Aggregated and anonymized data is used to generate
          institutional analytics, skills-gap analysis, and outcome reports for educational partners.
        </li>
        <li>
          <strong>Platform Operations:</strong> Account management, authentication, security monitoring,
          fraud prevention, and customer support.
        </li>
        <li>
          <strong>Communications:</strong> Transactional emails (application updates, new messages,
          project completions), and platform notifications.
        </li>
        <li>
          <strong>Improvement:</strong> To improve our Service, develop new features, and fix bugs.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>3. How We Share Your Information</h2>

      <h3>3.1 With Corporate Partners</h3>
      <p>
        When you apply to a project, your application information (name, email, skills, cover letter,
        relevant coursework, and GPA) is shared with the corporate partner posting the project. Corporate
        partners may rate your performance, which is visible to you and your educational administrators.
      </p>

      <h3>3.2 With Educational Institutions</h3>
      <p>
        If you are associated with an educational institution through the platform, your institution&apos;s
        administrators may access aggregated and individual student data including application activity,
        project outcomes, skills progression, and performance ratings to fulfill their educational mission.
      </p>

      <h3>3.3 With AI Service Providers</h3>
      <p>
        We use Anthropic&apos;s Claude AI to power our coaching and intelligence features. When you use AI
        features, relevant context (such as your profile, skills, and conversation history) is sent to
        Anthropic for processing. Anthropic processes this data under our data processing agreement and
        does not use your data to train their models. You can opt out of AI model training in your
        privacy settings.
      </p>

      <h3>3.4 With Service Providers</h3>
      <p>
        We use third-party service providers for email delivery (Mailgun), file storage (Cloudinary),
        hosting (Heroku), and database services (PostgreSQL). These providers process data on our behalf
        under data processing agreements.
      </p>

      <h3>3.5 Legal Requirements</h3>
      <p>
        We may disclose your information if required by law, regulation, legal process, or governmental
        request, or to protect the rights, property, or safety of Proveground, our users, or the public.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>4. FERPA Rights (Student Users)</h2>
      <p>
        If you are a student user, certain information you provide may constitute &quot;education records&quot;
        under the Family Educational Rights and Privacy Act (FERPA). Your educational institution
        (&quot;[Institution Name]&quot;) is the custodian of your education records, and Proveground acts as a
        &quot;school official&quot; with a legitimate educational interest under FERPA.
      </p>
      <p>As a student, you have the right to:</p>
      <ul>
        <li>Inspect and review your education records held by the platform.</li>
        <li>Request correction of records you believe are inaccurate or misleading.</li>
        <li>
          Consent to disclosure of personally identifiable information from your education records,
          except to the extent that FERPA authorizes disclosure without consent.
        </li>
        <li>
          File a complaint with the U.S. Department of Education if you believe your FERPA rights
          have been violated.
        </li>
      </ul>
      <p>
        Your institution&apos;s privacy officer can provide additional information about your FERPA rights.
        Contact your institution directly or reach out to us at <strong>[Contact Email]</strong>.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>5. CCPA Rights (California Residents)</h2>
      <p>
        If you are a California resident, the California Consumer Privacy Act (CCPA) and the California
        Privacy Rights Act (CPRA) provide you with additional rights regarding your personal information:
      </p>
      <ul>
        <li>
          <strong>Right to Know:</strong> You can request details about the categories and specific pieces
          of personal information we have collected, the sources, the business purposes, and the categories
          of third parties with whom we share it.
        </li>
        <li>
          <strong>Right to Delete:</strong> You can request deletion of your personal information, subject
          to certain exceptions. Use the account deletion feature in Settings or contact us at{' '}
          <strong>[Contact Email]</strong>.
        </li>
        <li>
          <strong>Right to Opt-Out of Sale/Sharing:</strong> We do not sell your personal information.
          We do not share your personal information for cross-context behavioral advertising purposes.
        </li>
        <li>
          <strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising
          your CCPA rights.
        </li>
        <li>
          <strong>Right to Correct:</strong> You can request correction of inaccurate personal information
          through your profile settings or by contacting us.
        </li>
      </ul>
      <p>
        To exercise your CCPA rights, email <strong>[Contact Email]</strong> with the subject line
        &quot;CCPA Request.&quot; We will verify your identity before processing your request.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>6. Data Retention</h2>
      <ul>
        <li>
          <strong>Account Data:</strong> Retained for the duration of your account. Upon account deletion,
          your personal data is removed or anonymized within 30 days, except where retention is required by
          law or for legitimate business purposes (e.g., audit logs, anonymized analytics).
        </li>
        <li>
          <strong>AI Conversation Data:</strong> AI coaching conversations are retained for the duration of
          your account to provide continuity. They are deleted when your account is deleted.
        </li>
        <li>
          <strong>Audit Logs:</strong> Security-related audit logs (login attempts, account changes) are
          retained for a minimum of 2 years for compliance and security purposes.
        </li>
        <li>
          <strong>Anonymized Data:</strong> Aggregated, de-identified data may be retained indefinitely
          for research, analytics, and platform improvement.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>7. Data Security</h2>
      <p>
        We implement industry-standard security measures to protect your information, including:
      </p>
      <ul>
        <li>Passwords hashed with bcrypt (salted, high cost factor).</li>
        <li>CSRF protection on all state-changing API endpoints.</li>
        <li>Rate limiting on authentication and sensitive endpoints.</li>
        <li>Session management with idle timeouts and absolute TTLs.</li>
        <li>Encrypted data in transit (TLS/HTTPS) and at rest.</li>
        <li>Row-level security (RLS) for multi-tenant data isolation.</li>
        <li>Comprehensive audit logging of security events.</li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>8. Cookies</h2>
      <p>We use the following categories of cookies:</p>
      <ul>
        <li>
          <strong>Essential Cookies:</strong> Required for core functionality including authentication
          sessions, CSRF tokens, and cookie consent preferences. These cannot be disabled.
        </li>
        <li>
          <strong>Analytics Cookies:</strong> Help us understand how visitors use the platform so we can
          improve the user experience. You can opt in or out via our cookie consent banner.
        </li>
        <li>
          <strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and measure campaign
          effectiveness. You can opt in or out via our cookie consent banner.
        </li>
      </ul>
      <p>
        You can manage your cookie preferences at any time by clearing your browser&apos;s cookies, which
        will trigger the consent banner to appear again on your next visit.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>9. Data Portability &amp; Export</h2>
      <p>
        You can export a copy of all your personal data at any time through the Settings page. The export
        includes your profile information, applications, ratings, messages, portfolio data, and AI
        conversation history in a machine-readable JSON format.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>10. Account Deletion</h2>
      <p>
        You can permanently delete your account through Settings &gt; Delete Account. Account deletion:
      </p>
      <ul>
        <li>Removes all personal data including profile, messages, applications, and AI conversations.</li>
        <li>Anonymizes any denormalized references to your name and email in shared records.</li>
        <li>Invalidates all active sessions immediately.</li>
        <li>Sends a confirmation email to your registered email address.</li>
        <li>Cannot be undone.</li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>11. Children&apos;s Privacy</h2>
      <p>
        Our Service is not directed to individuals under the age of 16. We do not knowingly collect
        personal information from children under 16. If we learn we have collected such information,
        we will promptly delete it.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>12. International Users</h2>
      <p>
        Our Service is primarily operated in the United States. If you are accessing the Service from
        outside the United States, please be aware that your information may be transferred to, stored,
        and processed in the United States where our servers are located. By using the Service, you
        consent to such transfer and processing.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes by
        posting the updated policy on this page and updating the &quot;Effective Date&quot; at the top.
        Continued use of the Service after changes constitutes acceptance of the updated policy.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>14. Contact Us</h2>
      <p>
        If you have questions or concerns about this Privacy Policy, your data, or your rights, please
        contact us:
      </p>
      <ul>
        <li>
          <strong>Email:</strong> <strong>[Contact Email]</strong>
        </li>
        <li>
          <strong>Institution Privacy Officer:</strong> Contact your educational institution
          (&quot;[Institution Name]&quot;) directly for FERPA-related inquiries.
        </li>
      </ul>
    </>
  );
}
