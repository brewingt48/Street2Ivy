# Voluntary Product Accessibility Template (VPAT)
## WCAG 2.2 Edition (VPAT 2.4)

**Product:** Proveground
**Version:** Current (February 2026)
**Date:** February 23, 2026
**Contact:** accessibility@proveground.com
**Evaluation Methods Used:**
- Automated testing with axe-core
- Manual keyboard navigation testing
- Screen reader testing (NVDA on Windows, VoiceOver on macOS/iOS)
- Color contrast analysis (WebAIM Contrast Checker)
- Manual review of ARIA attributes and roles

**Applicable Standards/Guidelines:** WCAG 2.2 Level A & AA

**Terms:**
- **Supports:** The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
- **Partially Supports:** Some functionality of the product does not meet the criterion.
- **Does Not Support:** The majority of product functionality does not meet the criterion.
- **Not Applicable:** The criterion is not relevant to the product.

---

## Table 1: WCAG 2.2 Level A

| Criteria | Conformance Level | Remarks and Explanations |
|----------|-------------------|--------------------------|
| **1.1.1 Non-text Content** | Supports | All informational images include descriptive alt text. Decorative images use empty alt attributes (`alt=""`). Icons from Lucide React library include `aria-hidden="true"` when used alongside visible text labels. User-uploaded avatar images are assigned default alt text. |
| **1.2.1 Audio-only and Video-only (Prerecorded)** | Not Applicable | The platform does not currently include prerecorded audio-only or video-only content. |
| **1.2.2 Captions (Prerecorded)** | Not Applicable | The platform does not currently include prerecorded video content with synchronized audio. |
| **1.2.3 Audio Description or Media Alternative (Prerecorded)** | Not Applicable | The platform does not currently include prerecorded video content. |
| **1.3.1 Info and Relationships** | Partially Supports | Form fields use associated `<label>` elements or `aria-label` attributes. Data tables include header markup. Headings follow a logical hierarchy in most pages. Some custom dashboard components use `div` elements where semantic landmarks or list markup would be more appropriate. **Remediation in progress:** Updating dashboard widgets to use proper semantic HTML. |
| **1.3.2 Meaningful Sequence** | Supports | DOM order matches the visual presentation order across all pages. CSS layout (Flexbox/Grid) does not alter the logical reading order. Tab order follows the visual flow. |
| **1.3.3 Sensory Characteristics** | Supports | Instructions do not rely solely on shape, color, size, or visual location. Form validation errors include text descriptions in addition to color indicators. |
| **1.4.1 Use of Color** | Partially Supports | Most information conveyed by color is also available through text or icons. Status badges include text labels alongside color coding. **Known issue:** Star ratings in some contexts rely on filled-vs-empty visual differentiation without accompanying text values. **Remediation planned:** Adding numeric text values alongside star ratings. |
| **1.4.2 Audio Control** | Not Applicable | The platform does not auto-play audio content. |
| **2.1.1 Keyboard** | Partially Supports | All Radix UI-based components (Dialog, DropdownMenu, Select, Tabs, Tooltip, Sheet, ScrollArea) fully support keyboard navigation. Standard form controls and links are keyboard accessible. **Known issues:** (1) Some custom interactive components built without Radix may lack complete keyboard support. (2) Custom chart interactions in the analytics dashboard are not fully keyboard accessible. **Remediation in progress.** |
| **2.1.2 No Keyboard Trap** | Partially Supports | Radix UI modals (Dialog, Sheet) correctly trap focus and release it on close. Standard page navigation does not trap keyboard focus. **Known issue:** One legacy custom modal component does not correctly return focus to the trigger element on close. **Remediation in progress.** |
| **2.1.4 Character Key Shortcuts** | Supports | The platform does not implement single-character keyboard shortcuts. |
| **2.2.1 Timing Adjustable** | Supports | Session timeouts provide a 4-hour idle timeout with automatic extension on activity. Users are not forced to complete timed tasks. The platform does not use time-limited interactions. |
| **2.2.2 Pause, Stop, Hide** | Supports | The platform does not use auto-updating content, blinking, or scrolling content that starts automatically and lasts more than 5 seconds. Loading spinners are the only animated elements and do not convey essential information. |
| **2.3.1 Three Flashes or Below Threshold** | Supports | No content on the platform flashes more than three times per second. |
| **2.4.1 Bypass Blocks** | Does Not Support | The platform does not currently provide a "skip to main content" link or other mechanism to bypass repeated navigation blocks. **Remediation planned:** Adding skip navigation links to all page layouts. Target completion: Q2 2026. |
| **2.4.2 Page Titled** | Supports | All pages have descriptive `<title>` elements that identify the page topic. Next.js metadata is used to set titles on all routes. |
| **2.4.3 Focus Order** | Partially Supports | Focus order generally follows a logical sequence matching the visual layout. Radix UI components manage focus order correctly. **Known issue:** Some dynamically loaded content areas may not receive focus in the expected order when new content appears. |
| **2.4.4 Link Purpose (In Context)** | Supports | Links are descriptive or can be determined from the link text together with its surrounding context. "Read more" links include `aria-label` attributes with full context where used. |
| **2.5.1 Pointer Gestures** | Supports | All functionality that uses multipoint or path-based gestures can be operated with a single pointer without a path-based gesture. The platform does not require complex gestures. |
| **2.5.2 Pointer Cancellation** | Supports | For functionality operated using a single pointer, at least one of the following is true: the down-event is not used to execute any part of the function, or the function is completed on the up-event with an abort/undo mechanism. |
| **2.5.3 Label in Name** | Supports | For UI components with labels that include text or images of text, the accessible name contains the text that is presented visually. Radix UI and standard HTML controls enforce this pattern. |
| **2.5.4 Motion Actuation** | Not Applicable | The platform does not use device motion or user motion for operation. |

---

## Table 2: WCAG 2.2 Level AA

| Criteria | Conformance Level | Remarks and Explanations |
|----------|-------------------|--------------------------|
| **1.2.4 Captions (Live)** | Not Applicable | The platform does not provide live audio content. |
| **1.2.5 Audio Description (Prerecorded)** | Not Applicable | The platform does not include prerecorded video content. |
| **1.3.4 Orientation** | Supports | Content is not restricted to a specific display orientation. All pages render correctly in both portrait and landscape orientations. Responsive layouts adapt to available viewport dimensions. |
| **1.3.5 Identify Input Purpose** | Supports | Input fields that collect user information (name, email, phone, etc.) use appropriate `autocomplete` attributes. Form fields use semantic input types (`email`, `tel`, `url`). |
| **1.4.3 Contrast (Minimum)** | Partially Supports | Most text meets or exceeds the 4.5:1 contrast ratio for normal text and 3:1 for large text. The primary teal (#0d9488) against white backgrounds meets AA requirements. **Known issues:** (1) The gold/amber accent color (#d97706) used for certain badge elements may fall below the 4.5:1 threshold against light backgrounds in some contexts. (2) Some placeholder text in form inputs has insufficient contrast. **Remediation in progress:** Adjusting amber tones and placeholder opacity values. |
| **1.4.4 Resize Text** | Supports | Text can be resized up to 200% without loss of content or functionality. The responsive layout built with Tailwind CSS adapts to text size changes. No content is clipped or overlapping at 200% text zoom. |
| **1.4.5 Images of Text** | Supports | The platform does not use images of text except for logos. All text content is rendered as real text using web fonts. |
| **1.4.10 Reflow** | Supports | Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions, at a width equivalent to 320 CSS pixels. The responsive design adapts from mobile (375px) to desktop widths. |
| **1.4.11 Non-text Contrast** | Partially Supports | Most UI components and graphical objects meet the 3:1 contrast ratio requirement against adjacent colors. **Known issues:** (1) Some chart elements in the analytics dashboard have lines or data points that may not meet the 3:1 ratio. (2) Inactive/disabled button states have intentionally reduced contrast. **Remediation in progress** for chart elements. |
| **1.4.12 Text Spacing** | Supports | Content adapts correctly when users override text spacing properties (line height, paragraph spacing, letter spacing, word spacing) to the values specified in WCAG 2.2. No content is clipped or overlapping. |
| **1.4.13 Content on Hover or Focus** | Supports | Tooltip content (via Radix UI Tooltip) is dismissible (Escape key), hoverable (users can move the pointer over the tooltip content without it disappearing), and persistent (remains visible until the hover or focus trigger is removed). |
| **2.4.5 Multiple Ways** | Supports | Users can reach pages through multiple mechanisms: primary navigation sidebar, search functionality, breadcrumb navigation on detail pages, and direct URL access. The dashboard provides links to frequently accessed areas. |
| **2.4.6 Headings and Labels** | Supports | Headings describe the topic or purpose of their section. Form labels describe the purpose of their associated input. Card titles identify card content. Page headers identify the current page. |
| **2.4.7 Focus Visible** | Partially Supports | Radix UI components provide visible focus indicators by default. Standard browser focus outlines are preserved. **Known issue:** Some custom-styled interactive elements override or suppress the default focus ring without providing a sufficiently visible alternative. **Remediation in progress:** Adding consistent `focus-visible:ring-2 focus-visible:ring-teal-500` utilities to all interactive elements. Target completion: Q2 2026. |
| **2.4.11 Focus Not Obscured (Minimum)** | Supports | Focused elements are not entirely hidden by other content. Sticky headers and footers do not overlap focused interactive elements in the main content area. Radix UI modals and sheets are rendered in portals above other content. |
| **2.5.7 Dragging Movements** | Supports | The platform does not require dragging for any core functionality. All operations that could involve drag-and-drop (such as file uploads) also provide click-based alternatives. |
| **2.5.8 Target Size (Minimum)** | Partially Supports | Most interactive targets meet the 24x24 CSS pixel minimum. Buttons, links in navigation, and form controls generally exceed this minimum. **Known issue:** Some inline text links and icon-only buttons in dense table layouts may fall below the 24x24 minimum target size. **Remediation planned.** |
| **3.1.1 Language of Page** | Supports | The `lang` attribute is set to `en` on the `<html>` element of all pages. |
| **3.1.2 Language of Parts** | Supports | The platform currently serves content in English only. If multi-language content is introduced, appropriate `lang` attributes will be applied to relevant elements. |
| **3.2.1 On Focus** | Supports | Receiving focus on any interactive element does not initiate a change of context. Focus events are used only for visual styling (focus rings). |
| **3.2.2 On Input** | Supports | Changing the setting of any UI component does not automatically cause a change of context unless the user has been advised of the behavior beforehand. Form submissions require explicit button activation. |
| **3.2.3 Consistent Navigation** | Supports | Navigation mechanisms that appear on multiple pages (sidebar, top bar) are presented in the same relative order each time. The navigation structure is consistent across the platform for each user role. |
| **3.2.4 Consistent Identification** | Supports | Components that have the same functionality are identified consistently across the platform. Icon usage, button labeling, and terminology are standardized. |
| **3.2.6 Consistent Help** | Supports | Help mechanisms (support email link, FAQ access) are available in consistent locations across the platform. Contact information is accessible from the footer on all pages. |
| **3.3.1 Error Identification** | Supports | Form validation errors are identified with descriptive text messages. Error messages appear adjacent to the relevant form field. The error text describes the nature of the error. Zod validation schemas provide specific field-level error descriptions. |
| **3.3.2 Labels or Instructions** | Supports | All form inputs have associated labels. Required fields are marked with an asterisk (*) and include `aria-required="true"`. Placeholder text provides additional guidance but does not replace labels. |
| **3.3.3 Error Suggestion** | Supports | When form validation errors are detected, suggestions for correction are provided where possible (e.g., "Email must be a valid email address," "Password must be at least 8 characters"). |
| **3.3.4 Error Prevention (Legal, Financial, Data)** | Supports | For actions that involve legal commitments (FERPA consent), data submissions (applications, profile updates), and deletions (account deletion), the platform provides confirmation steps. FERPA consent records include the exact text consented to and are reversible. Account deletion requires explicit confirmation. |
| **3.3.7 Redundant Entry** | Supports | Information previously entered by the user is auto-populated where applicable. Profile information is reused across application forms. Users do not need to re-enter the same information within a single session. |
| **3.3.8 Accessible Authentication (Minimum)** | Supports | The authentication process uses standard email/password login and SSO. No cognitive function test (such as CAPTCHA) is required. Password managers can auto-fill credentials. SSO provides an alternative authentication path. |
| **4.1.3 Status Messages** | Partially Supports | Success messages (e.g., "Profile updated," "Application submitted") are presented as visible text that can be programmatically determined. Toast notifications use `role="status"` or `role="alert"`. **Known issue:** Some dynamically loaded status updates in the dashboard may not be announced to screen readers via ARIA live regions. **Remediation in progress.** |

---

## Summary

| Conformance Level | Number of Criteria | Supports | Partially Supports | Does Not Support | Not Applicable |
|--------------------|-------------------|----------|--------------------|--------------------|----------------|
| Level A | 25 | 17 | 5 | 1 | 6 |
| Level AA | 28 | 21 | 5 | 0 | 2 |
| **Total** | **53** | **38** | **10** | **1** | **8** |

### Key Strengths
- **Radix UI foundation:** The platform is built on Radix UI primitives, which provide built-in accessibility support including ARIA attributes, keyboard navigation, and focus management for dialogs, menus, tabs, tooltips, and other complex components.
- **Semantic HTML:** Pages use semantic HTML elements (headings, landmarks, lists, forms) for structure.
- **Responsive design:** The platform is fully responsive and functions across mobile, tablet, and desktop viewports.
- **Form accessibility:** All forms use labeled inputs with descriptive error messages.
- **FERPA consent:** The consent flow is fully keyboard accessible with clear labeling and descriptions.

### Known Limitations and Remediation Plan

| Issue | Priority | Target Date |
|-------|----------|-------------|
| Add skip navigation links to all page layouts | High | Q2 2026 |
| Add visible focus indicators to all custom interactive elements | High | Q2 2026 |
| Add text values alongside star ratings | Medium | Q2 2026 |
| Fix focus return in legacy custom modal | Medium | Q2 2026 |
| Improve keyboard accessibility for analytics chart interactions | Medium | Q3 2026 |
| Adjust amber/gold contrast ratios on light backgrounds | Medium | Q2 2026 |
| Improve placeholder text contrast in form inputs | Low | Q3 2026 |
| Add ARIA live regions for dynamic dashboard status updates | Medium | Q2 2026 |
| Improve chart element non-text contrast ratios | Medium | Q3 2026 |
| Increase target sizes for dense table inline links | Low | Q3 2026 |
| Improve semantic HTML in dashboard widgets | Low | Q3 2026 |

### Testing Environment
- **Browsers:** Chrome 123+, Firefox 124+, Safari 17+, Edge 123+
- **Screen readers:** NVDA 2024.1 (Windows), VoiceOver (macOS Sequoia, iOS 18)
- **Automated tools:** axe-core 4.9+, Lighthouse
- **Assistive technologies:** Keyboard-only navigation, browser zoom (200%), high contrast mode

---

*This VPAT was prepared in accordance with the ITI VPAT 2.4 template. For questions about this document or to report an accessibility issue, contact accessibility@proveground.com.*
