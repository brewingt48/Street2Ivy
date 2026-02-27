import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Proveground',
  description: 'Terms and conditions governing your use of the Proveground platform.',
};

export default function TermsOfServicePage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-[#1a1a2e] mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-8 not-prose">
        Effective Date: February 23, 2026
      </p>

      <p>
        Welcome to Proveground. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        Proveground platform (the &quot;Service&quot;), operated by Proveground (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        By creating an account or using the Service, you agree to be bound by these Terms.
      </p>
      <p>
        If you are using the Service on behalf of an organization (such as an educational institution
        or corporation), you represent that you have the authority to bind that organization to these
        Terms, and &quot;you&quot; refers to both you individually and the organization.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>1. Eligibility &amp; Account Responsibilities</h2>
      <p>
        You must be at least 16 years old to use the Service. By registering, you represent that:
      </p>
      <ul>
        <li>You are at least 16 years of age.</li>
        <li>The information you provide during registration is accurate and complete.</li>
        <li>You will maintain the accuracy of your account information.</li>
        <li>
          You are responsible for safeguarding your password and for all activity that occurs under
          your account.
        </li>
        <li>
          You will notify us immediately at <a href="mailto:legal@proveground.com" className="text-teal-600 hover:underline">legal@proveground.com</a> if you suspect
          unauthorized access to your account.
        </li>
      </ul>
      <p>
        We reserve the right to suspend or terminate accounts that violate these Terms, provide false
        information, or remain inactive for an extended period.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>2. Acceptable Use</h2>
      <p>You agree to use the Service only for lawful purposes. You may not:</p>
      <ul>
        <li>
          Misrepresent your identity, qualifications, academic standing, or affiliation with any
          educational institution or organization.
        </li>
        <li>
          Submit fraudulent applications, fabricated coursework, or plagiarized content.
        </li>
        <li>
          Harass, abuse, or discriminate against other users, including students, corporate partners,
          and administrators.
        </li>
        <li>
          Attempt to access accounts, data, or systems belonging to other users without authorization.
        </li>
        <li>
          Use automated scripts, bots, or scraping tools to access the Service or extract data.
        </li>
        <li>
          Reverse-engineer, decompile, or attempt to extract the source code of the Service or its
          proprietary algorithms (including the ProveGround Match Engine).
        </li>
        <li>
          Upload or transmit malware, viruses, or any harmful content.
        </li>
        <li>
          Use the AI coaching features to generate content that is misleading, harmful, or intended to
          deceive others (e.g., fabricating experience or credentials).
        </li>
        <li>
          Circumvent rate limits, security controls, or access restrictions.
        </li>
      </ul>
      <p>
        Violations may result in immediate account suspension or termination at our sole discretion.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>3. Intellectual Property</h2>

      <h3>3.1 Your Content</h3>
      <p>
        You retain ownership of all content you create and submit to the Service, including but not
        limited to: cover letters, project work, portfolio entries, reflections, ratings, reviews,
        messages, and AI coaching conversations (&quot;Your Content&quot;).
      </p>
      <p>
        By submitting Your Content, you grant Proveground a non-exclusive, worldwide, royalty-free
        license to use, display, and distribute Your Content solely as necessary to operate and improve
        the Service. This license terminates when you delete your account, except for content that has
        been shared with or relied upon by other users (e.g., ratings you gave to corporate partners).
      </p>

      <h3>3.2 Student Work Ownership</h3>
      <p>
        <strong>Students retain full ownership of all work product created during projects facilitated
        through the Service,</strong> unless a separate written agreement (such as an NDA or work-for-hire
        agreement) is executed between the student and the corporate partner. Proveground does not claim
        any ownership interest in student work product.
      </p>

      <h3>3.3 Our Intellectual Property</h3>
      <p>
        The Service, including its design, code, algorithms (including the ProveGround Match Engine),
        branding, trademarks, and all associated intellectual property, is owned by Proveground and
        protected by applicable intellectual property laws. You may not copy, modify, distribute, or
        create derivative works of any part of the Service without our prior written consent.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>4. AI Features &amp; Disclaimers</h2>
      <p>
        The Service includes AI-powered features such as career coaching, resume review, interview
        preparation, portfolio intelligence, and talent insights, powered by Anthropic&apos;s Claude AI.
      </p>
      <ul>
        <li>
          <strong>AI output is not professional advice.</strong> AI coaching is provided for informational
          and educational purposes only. It does not constitute career counseling, legal advice, financial
          advice, or any form of professional guidance.
        </li>
        <li>
          <strong>Accuracy is not guaranteed.</strong> AI-generated content may contain errors, omissions,
          or outdated information. You are responsible for verifying any AI-generated content before
          relying on it.
        </li>
        <li>
          <strong>AI does not make decisions.</strong> Match scores, talent insights, and coaching
          suggestions are recommendations only. All hiring, admissions, and partnership decisions are
          made by humans.
        </li>
        <li>
          <strong>Data usage.</strong> Your interactions with AI features are processed by Anthropic under
          our data processing agreement. You can opt out of AI model training in your privacy settings.
          See our Privacy Policy for full details.
        </li>
        <li>
          <strong>No liability for AI output.</strong> Proveground is not liable for any decisions made
          based on AI-generated recommendations or content.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>5. Platform Liability Limitations</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
      </p>
      <ul>
        <li>
          <strong>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;</strong> without warranties of
          any kind, whether express or implied, including warranties of merchantability, fitness for a
          particular purpose, and non-infringement.
        </li>
        <li>
          <strong>Proveground does not guarantee</strong> that the Service will be uninterrupted,
          error-free, secure, or free of harmful components.
        </li>
        <li>
          <strong>Proveground is not responsible</strong> for the conduct of any user, including corporate
          partners, students, or educational administrators. We facilitate connections but are not a party
          to any agreements, internships, or employment relationships formed through the Service.
        </li>
        <li>
          <strong>IN NO EVENT SHALL PROVEGROUND BE LIABLE</strong> for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits, data, or goodwill, arising from
          your use of or inability to use the Service.
        </li>
        <li>
          <strong>OUR TOTAL LIABILITY</strong> for any claim arising from or relating to the Service shall
          not exceed the greater of (a) the amount you paid to Proveground in the 12 months preceding the
          claim, or (b) $100 USD.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>6. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Proveground, its officers, directors,
        employees, and agents from any claims, damages, losses, liabilities, costs, or expenses
        (including reasonable attorneys&apos; fees) arising from: (a) your use of the Service; (b) your
        violation of these Terms; (c) your violation of any third-party rights; or (d) Your Content.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>7. Dispute Resolution</h2>

      <h3>7.1 Informal Resolution</h3>
      <p>
        Before filing any formal legal proceeding, you agree to first attempt to resolve any dispute
        informally by contacting us at <a href="mailto:legal@proveground.com" className="text-teal-600 hover:underline">legal@proveground.com</a>. We will attempt to resolve
        the dispute within 30 days.
      </p>

      <h3>7.2 Binding Arbitration</h3>
      <p>
        If informal resolution fails, any dispute arising from or relating to these Terms or the Service
        shall be resolved by binding arbitration administered by the American Arbitration Association (AAA)
        under its Consumer Arbitration Rules. Arbitration shall take place in the state of Delaware, USA,
        unless otherwise agreed. The arbitrator&apos;s decision shall be final and binding.
      </p>

      <h3>7.3 Class Action Waiver</h3>
      <p>
        YOU AND PROVEGROUND AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN AN INDIVIDUAL
        CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE
        PROCEEDING.
      </p>

      <h3>7.4 Exceptions</h3>
      <p>
        Either party may seek injunctive or other equitable relief in any court of competent jurisdiction
        to prevent the actual or threatened infringement of intellectual property rights.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>8. Termination</h2>
      <ul>
        <li>
          <strong>By You:</strong> You may terminate your account at any time through Settings &gt;
          Delete Account or by contacting us at <a href="mailto:legal@proveground.com" className="text-teal-600 hover:underline">legal@proveground.com</a>.
        </li>
        <li>
          <strong>By Us:</strong> We may suspend or terminate your access to the Service at any time,
          with or without cause, with or without notice. Reasons for termination include but are not
          limited to: violation of these Terms, fraudulent activity, extended inactivity, or at the
          request of your educational institution.
        </li>
        <li>
          <strong>Effect of Termination:</strong> Upon termination, your right to use the Service ceases
          immediately. We will delete or anonymize your personal data in accordance with our Privacy
          Policy and applicable law. Provisions that by their nature should survive termination
          (including intellectual property, limitation of liability, indemnification, and dispute
          resolution) shall survive.
        </li>
      </ul>

      {/* ------------------------------------------------------------------ */}
      <h2>9. Third-Party Services</h2>
      <p>
        The Service may integrate with or contain links to third-party services, including but not
        limited to: Anthropic (AI), Mailgun (email), Cloudinary (media), and Handshake (career
        services). Your use of third-party services is governed by their respective terms and privacy
        policies. Proveground is not responsible for third-party services.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>10. Modifications to the Service &amp; Terms</h2>
      <p>
        We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
        We may update these Terms from time to time. Material changes will be communicated via email
        or an in-platform notice at least 30 days before they take effect. Continued use of the
        Service after the effective date of updated Terms constitutes acceptance.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>11. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the State of
        Delaware, USA, without regard to its conflict-of-law principles.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>12. Severability</h2>
      <p>
        If any provision of these Terms is found to be unenforceable, that provision shall be enforced
        to the maximum extent permissible, and the remaining provisions shall remain in full force and
        effect.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>13. Entire Agreement</h2>
      <p>
        These Terms, together with our Privacy Policy and any additional agreements you enter into with
        Proveground (such as NDAs or institutional service agreements), constitute the entire agreement
        between you and Proveground regarding the Service.
      </p>

      {/* ------------------------------------------------------------------ */}
      <h2>14. Contact Us</h2>
      <p>
        If you have questions about these Terms, please contact us at <a href="mailto:legal@proveground.com" className="text-teal-600 hover:underline">legal@proveground.com</a>.
      </p>
    </>
  );
}
