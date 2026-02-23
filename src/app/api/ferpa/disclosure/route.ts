/**
 * GET /api/ferpa/disclosure — Return FERPA disclosure notice text
 *
 * Static content describing student rights under FERPA.
 * Displayed during registration and annually for acknowledgment.
 */

import { NextResponse } from 'next/server';

const FERPA_DISCLOSURE = {
  version: '1.0',
  effectiveDate: '2026-02-23',
  title: 'Family Educational Rights and Privacy Act (FERPA) Notice',
  summary:
    'The Family Educational Rights and Privacy Act (FERPA) affords eligible students certain rights with respect to their education records. Proveground operates as a school official with a legitimate educational interest under agreements with participating educational institutions.',
  rights: [
    {
      title: 'Right to Inspect and Review',
      description:
        'You have the right to inspect and review your education records maintained by Proveground within 45 days of submitting a request. To request access, contact your educational institution\'s registrar or Proveground support at privacy@proveground.com. We will arrange for access and notify you of the time and place where records may be inspected.',
    },
    {
      title: 'Right to Request Amendment',
      description:
        'You have the right to request the amendment of your education records that you believe are inaccurate, misleading, or in violation of your privacy rights. To request an amendment, submit a written request to privacy@proveground.com clearly identifying the part of the record you want changed and specifying why it is inaccurate or misleading. If we decide not to amend the record as requested, we will notify you of the decision and advise you of your right to a hearing.',
    },
    {
      title: 'Right to Consent to Disclosure',
      description:
        'You have the right to provide written consent before Proveground discloses personally identifiable information (PII) from your education records, except to the extent that FERPA authorizes disclosure without consent. Proveground discloses education records without student consent to officials at your educational institution with legitimate educational interests, as defined in your institution\'s annual FERPA notification.',
    },
    {
      title: 'Right to File a Complaint',
      description:
        'You have the right to file a complaint with the U.S. Department of Education concerning alleged failures by Proveground or your educational institution to comply with the requirements of FERPA. The office that administers FERPA is: Family Policy Compliance Office, U.S. Department of Education, 400 Maryland Avenue, SW, Washington, DC 20202.',
    },
  ],
  directoryInformation: {
    title: 'Directory Information',
    description:
      'Under FERPA, your educational institution may designate certain information as "directory information," which may be disclosed without your prior consent. On Proveground, directory information may include: your name, major field of study, enrollment status (year), participation in officially recognized activities and sports, and dates of attendance. You have the right to restrict the disclosure of your directory information by updating your directory information preferences in your account settings.',
  },
  dataSharing: {
    title: 'Data Sharing with Corporate Partners',
    description:
      'When you apply to project listings posted by corporate partners on Proveground, certain information from your profile is shared with those partners to facilitate the project matching and collaboration process. You can control which directory information fields are visible to corporate partners through your directory information preferences. By consenting to data sharing, you authorize Proveground to share your consented profile information with corporate partners who post project listings on this platform.',
  },
  aiProcessing: {
    title: 'AI-Powered Analysis',
    description:
      'Proveground uses AI-powered tools (powered by Anthropic\'s Claude) to provide career coaching, skills analysis, and profile matching. By consenting to AI processing, you authorize Proveground to use your academic and professional development records for AI-powered analysis, including match scoring, skills gap analysis, and personalized career coaching. Anthropic processes this data under a data processing agreement and does not use your data to train their models.',
  },
  contact: {
    email: 'privacy@proveground.com',
    ferpaOffice: {
      name: 'Family Policy Compliance Office',
      organization: 'U.S. Department of Education',
      address: '400 Maryland Avenue, SW, Washington, DC 20202',
    },
  },
};

export async function GET() {
  return NextResponse.json({ disclosure: FERPA_DISCLOSURE });
}
