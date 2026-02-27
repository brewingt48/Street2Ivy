import type { Metadata } from 'next';
import { Navbar } from '@/components/home/Navbar';
import { Footer } from '@/components/home/Footer';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Proveground',
  description:
    'Proveground is committed to ensuring digital accessibility for people with disabilities. Learn about our conformance status, known limitations, and how to contact us.',
};

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto px-6 pt-28 pb-16 w-full">
        <div className="prose prose-slate max-w-none text-[#3a3a3a] leading-relaxed">
          <h1 className="text-4xl font-bold text-[#1a1a2e] mb-2">Accessibility Statement</h1>
          <p className="text-sm text-slate-400 mb-8 not-prose">
            Last updated: February 23, 2026
          </p>

          <h2>Our Commitment</h2>
          <p>
            Proveground is committed to ensuring digital accessibility for people with disabilities.
            We are continually improving the user experience for everyone and applying the relevant
            accessibility standards to ensure we provide equal access to all users, including those
            who rely on assistive technologies.
          </p>

          <h2>Conformance Status</h2>
          <p>
            We aim to conform to the{' '}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong>. These
            guidelines explain how to make web content more accessible for people with a wide range
            of disabilities, including visual, auditory, physical, speech, cognitive, language,
            learning, and neurological disabilities.
          </p>
          <p>
            Our current conformance status is <strong>partially conformant</strong> with WCAG 2.2
            Level AA. &quot;Partially conformant&quot; means that some parts of the content do not fully
            conform to the accessibility standard. We are actively working to address these gaps.
          </p>
          <p>
            A detailed Voluntary Product Accessibility Template (VPAT) is available upon request.
            Please contact us at{' '}
            <a href="mailto:accessibility@proveground.com">accessibility@proveground.com</a> to
            obtain a copy.
          </p>

          <h2>Technologies Used</h2>
          <p>
            Proveground is built with accessibility in mind using the following technologies:
          </p>
          <ul>
            <li>
              <strong>Radix UI Primitives:</strong> Our interactive components (dialogs, menus, tabs,
              tooltips, dropdowns) are built on Radix UI, which provides robust built-in accessibility
              including ARIA attributes, keyboard navigation, and focus management.
            </li>
            <li>
              <strong>Semantic HTML:</strong> We use proper HTML elements (headings, landmarks, lists,
              forms) to create a meaningful document structure.
            </li>
            <li>
              <strong>Responsive Design:</strong> Our platform adapts to different screen sizes,
              orientations, and zoom levels using CSS Flexbox and Grid layouts.
            </li>
          </ul>

          <h2>Known Limitations</h2>
          <p>
            Despite our efforts, some areas of the platform have known accessibility limitations.
            Below is a description of known issues and our planned remediation:
          </p>
          <ul>
            <li>
              <strong>Skip navigation:</strong> The platform does not yet provide a &quot;skip to main
              content&quot; link. We are adding skip navigation to all page layouts, with a target
              completion of Q2 2026.
            </li>
            <li>
              <strong>Focus indicators:</strong> Some custom interactive elements may not display
              sufficiently visible focus indicators. We are standardizing focus ring styles across
              all interactive elements, with a target completion of Q2 2026.
            </li>
            <li>
              <strong>Color contrast:</strong> Certain accent colors (particularly amber/gold tones)
              may not meet the 4.5:1 contrast ratio in all contexts. We are adjusting these color
              values, with a target completion of Q2 2026.
            </li>
            <li>
              <strong>Chart accessibility:</strong> Interactive charts in the analytics dashboard are
              not fully accessible via keyboard or screen reader. We are adding keyboard controls and
              text alternatives for chart data, with a target completion of Q3 2026.
            </li>
            <li>
              <strong>Star ratings:</strong> Some rating displays rely on visual differentiation
              without accompanying text values. We are adding numeric text labels to all rating
              components, with a target completion of Q2 2026.
            </li>
          </ul>

          <h2>Alternative Access Methods</h2>
          <p>
            If you encounter accessibility barriers on our platform, we offer the following
            alternative methods to access our services:
          </p>
          <ul>
            <li>
              <strong>Email support:</strong> Contact{' '}
              <a href="mailto:support@proveground.com">support@proveground.com</a> to request
              assistance with any platform functionality that is not fully accessible.
            </li>
            <li>
              <strong>Phone support:</strong> Call us during business hours for direct assistance
              with account management, applications, or other platform features.
            </li>
            <li>
              <strong>Data export:</strong> You can export your profile and application data in
              machine-readable formats (JSON, CSV) for use with your preferred accessible tools.
            </li>
            <li>
              <strong>Screen reader compatibility:</strong> The platform is tested with NVDA
              (Windows), VoiceOver (macOS/iOS), and TalkBack (Android). If you experience issues
              with your specific screen reader, please let us know.
            </li>
          </ul>

          <h2>Feedback and Contact Information</h2>
          <p>
            We welcome your feedback on the accessibility of Proveground. If you encounter
            accessibility barriers, have suggestions for improvement, or need assistance:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:accessibility@proveground.com">accessibility@proveground.com</a>
            </li>
            <li>
              <strong>Response time:</strong> We will acknowledge your feedback within 2 business
              days and provide a substantive response within 10 business days.
            </li>
          </ul>

          <h2>Compatibility with Browsers and Assistive Technologies</h2>
          <p>Proveground is designed to be compatible with the following:</p>
          <ul>
            <li>Recent versions of Chrome, Firefox, Safari, and Edge</li>
            <li>Screen readers: NVDA, VoiceOver, TalkBack</li>
            <li>Screen magnification software</li>
            <li>Speech recognition software</li>
            <li>Operating system accessibility features (high contrast, reduced motion, text scaling)</li>
          </ul>
          <p>
            Proveground is not compatible with browsers older than 3 major versions or with Internet
            Explorer.
          </p>

          <h2>Assessment Approach</h2>
          <p>
            Proveground assesses the accessibility of our platform through the following methods:
          </p>
          <ul>
            <li>Automated testing using axe-core integrated into our development workflow</li>
            <li>Manual testing with keyboard-only navigation</li>
            <li>Manual testing with screen readers (NVDA and VoiceOver)</li>
            <li>Regular accessibility audits performed by team members trained in WCAG requirements</li>
            <li>Usability feedback from users with disabilities</li>
          </ul>

          <h2>Formal Complaints</h2>
          <p>
            If you are not satisfied with our response to your accessibility concern, you may
            escalate the matter by contacting:
          </p>
          <ul>
            <li>
              <strong>Your educational institution&apos;s disability services office</strong> if you are a
              student user accessing Proveground through your institution.
            </li>
            <li>
              <strong>The U.S. Department of Justice, Civil Rights Division</strong> for complaints
              regarding web accessibility under the Americans with Disabilities Act (ADA).
            </li>
            <li>
              <strong>The Office for Civil Rights (OCR), U.S. Department of Education</strong> for
              complaints regarding accessibility in the educational context under Section 504 and
              Section 508.
            </li>
          </ul>
        </div>

        {/* Last updated */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            This accessibility statement was last reviewed on February 23, 2026.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
