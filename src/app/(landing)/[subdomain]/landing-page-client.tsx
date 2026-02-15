'use client';

import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Rocket,
  Users,
  Briefcase,
  Award,
  ArrowRight,
  Twitter,
  Instagram,
  Globe,
  Mail,
  Phone,
  Shield,
  Target,
  Trophy,
  Handshake,
} from 'lucide-react';

/* --- Types --- */

interface Branding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
}

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  [key: string]: string | undefined;
}

interface ContactInfo {
  email?: string;
  phone?: string;
  [key: string]: string | undefined;
}

interface Tenant {
  id: string;
  name: string;
  display_name: string | null;
  subdomain: string;
  marketplace_type: string | null;
  sport: string | null;
  team_name: string | null;
  conference: string | null;
  hero_video_url: string | null;
  hero_video_poster_url: string | null;
  hero_headline: string | null;
  hero_subheadline: string | null;
  gallery_images: unknown[];
  social_links: SocialLinks | null;
  about_content: string | null;
  contact_info: ContactInfo | null;
  branding: Branding | null;
  features: Record<string, unknown>;
}

interface Stats {
  student_count: string | number;
  listing_count: string | number;
  partner_count: string | number;
}

interface Partner {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  industry: string | null;
  alumni_graduation_year: number | null;
  alumni_position: string | null;
  alumni_years_on_team: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  alumni_bio: string | null;
}

interface LandingPageClientProps {
  tenant: Tenant;
  stats: Stats;
  partners: Partner[];
}

/* --- Animation helpers --- */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* --- Component --- */

export function LandingPageClient({ tenant, stats, partners }: LandingPageClientProps) {
  const branding = tenant.branding ?? {};
  const primary = branding.primaryColor ?? '#0f766e';
  const secondary = branding.secondaryColor ?? '#f8fafc';
  const socialLinks = tenant.social_links ?? {};
  const contactInfo = tenant.contact_info ?? {};

  const displayName = tenant.display_name ?? tenant.name;
  const headline =
    tenant.hero_headline ??
    'The discipline that built you doesn\u2019t stop at the field.';
  const subheadline =
    tenant.hero_subheadline ??
    'Campus2Career connects student-athletes and program alumni through real projects, real deliverables, and real reputation \u2014 built on the same competitive edge that drives performance on game day.';

  const studentCount = Number(stats.student_count) || 0;
  const listingCount = Number(stats.listing_count) || 0;
  const partnerCount = Number(stats.partner_count) || 0;

  /* --- Social icon map --- */
  function socialIcon(key: string) {
    switch (key) {
      case 'twitter':
        return <Twitter className="h-5 w-5" />;
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      case 'linkedin':
        return <Globe className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ================================================================
          SECTION 1 -- HERO
         ================================================================ */}
      <section
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 50%, ${primary}aa 100%)`,
        }}
      >
        {/* Video background (if provided) */}
        {tenant.hero_video_url && (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={tenant.hero_video_poster_url ?? undefined}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          >
            <source src={tenant.hero_video_url} type="video/mp4" />
          </video>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-black/20" />

        <motion.div
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Conference badge */}
          {tenant.conference && (
            <motion.div variants={fadeUp} className="mb-6">
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase"
                style={{ backgroundColor: `${secondary}22`, color: secondary }}
              >
                {tenant.conference}
              </span>
            </motion.div>
          )}

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6"
            style={{ color: secondary }}
          >
            {headline}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl md:text-2xl mb-10 max-w-2xl mx-auto"
            style={{ color: `${secondary}cc` }}
          >
            {subheadline}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`/register?tenant=${tenant.subdomain}&role=student`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              style={{ backgroundColor: secondary, color: primary }}
            >
              Find Projects
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href={`/register?tenant=${tenant.subdomain}&role=alumni`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 border-2"
              style={{ borderColor: secondary, color: secondary, backgroundColor: 'transparent' }}
            >
              Find Talent
              <ArrowRight className="h-5 w-5" />
            </a>
          </motion.div>

          {/* Tertiary link for universities */}
          <motion.div variants={fadeUp} className="mt-6">
            <a
              href="/for-universities"
              className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:underline"
              style={{ color: `${secondary}99` }}
            >
              For Universities &amp; Programs
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================
          SECTION 2 -- STATS BAR
         ================================================================ */}
      <section className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold" style={{ color: primary }}>
                {studentCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">Student Athletes</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: primary }}>
                {listingCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">Active Projects</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: primary }}>
                {partnerCount}
              </p>
              <p className="text-sm text-gray-500 mt-1">Alumni Partners</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-gray-500">
                Powered by <span className="font-semibold text-gray-700">Campus2Career</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          SECTION 3 -- HOW IT WORKS (4-step flow)
         ================================================================ */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Built for performers. Designed for results.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-2xl mx-auto">
              Every marketplace on Campus2Career follows the same competitive loop &mdash; launch, post,
              perform, earn.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {/* Step 1 */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Rocket className="h-7 w-7" style={{ color: primary }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: primary }}>
                Step 1
              </p>
              <h3 className="text-xl font-semibold mb-3">Your Program Launches a Marketplace</h3>
              <p className="text-gray-500 leading-relaxed">
                A coach, administrator, or department head activates the program&rsquo;s branded
                marketplace &mdash; built to compete from day one.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Briefcase className="h-7 w-7" style={{ color: primary }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: primary }}>
                Step 2
              </p>
              <h3 className="text-xl font-semibold mb-3">Alumni &amp; Partners Post Real Projects</h3>
              <p className="text-gray-500 leading-relaxed">
                Alumni-owned businesses and corporate partners post paid projects, consulting
                engagements, and contract work &mdash; not busy work.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Target className="h-7 w-7" style={{ color: primary }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: primary }}>
                Step 3
              </p>
              <h3 className="text-xl font-semibold mb-3">Students Get Matched &amp; Get to Work</h3>
              <p className="text-gray-500 leading-relaxed">
                AI-powered matching pairs student-athletes with the right projects based on skill,
                availability, and competitive drive. Then they deliver.
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Award className="h-7 w-7" style={{ color: primary }} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: primary }}>
                Step 4
              </p>
              <h3 className="text-xl font-semibold mb-3">Reputation Builds With Every Project</h3>
              <p className="text-gray-500 leading-relaxed">
                Every completed project earns reviews, builds a verified portfolio, and proves
                performance &mdash; the same way stats speak on the field.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SECTION 4 -- VALUE PROPOSITION CARDS
         ================================================================ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              One platform. Three competitive advantages.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {/* Card 1 -- Student-Athletes & Students */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Trophy className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Student-Athletes &amp; Students</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Your competitive edge doesn&rsquo;t expire when you leave the field. Compete for real
                projects, deliver professional-grade work, and build a reputation that proves you
                perform under pressure &mdash; not just on a resume, but on the scoreboard that matters.
              </p>
              <a
                href={`/register?tenant=${tenant.subdomain}&role=student`}
                className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: primary }}
              >
                Find Projects <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Card 2 -- Alumni & Corporate Partners */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Handshake className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Alumni &amp; Corporate Partners</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Invest in talent you already believe in. Post real projects, tap into a pipeline of
                disciplined performers who know how to compete, and build your bench of future hires
                &mdash; all while strengthening the program that built you.
              </p>
              <a
                href={`/register?tenant=${tenant.subdomain}&role=alumni`}
                className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: primary }}
              >
                Join as a Partner <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Card 3 -- Universities & Athletic Programs */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Shield className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">For Universities &amp; Athletic Programs</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                A recruiting advantage that extends beyond the field. Launch a branded career
                marketplace that proves your program develops complete competitors &mdash; athletes who
                perform in the classroom, in the market, and in life.
              </p>
              <a
                href="/for-universities"
                className="inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: primary }}
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SECTION 5 -- ALUMNI PARTNERS SHOWCASE
         ================================================================ */}
      {partners.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={stagger}
              className="text-center mb-14"
            >
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
                Alumni Partners
              </motion.h2>
              <motion.p variants={fadeUp} className="text-gray-500 max-w-xl mx-auto">
                Real businesses. Run by alumni who played on this field.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {partners.map((partner) => {
                const ownerName =
                  partner.first_name && partner.last_name
                    ? `${partner.first_name} ${partner.last_name}`
                    : null;

                return (
                  <motion.div
                    key={partner.slug}
                    variants={fadeUp}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Avatar placeholder */}
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: `${primary}20`, color: primary }}
                      >
                        {partner.avatar_url ? (
                          <img
                            src={partner.avatar_url}
                            alt={ownerName ?? partner.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          (ownerName ?? partner.name).charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        {ownerName && (
                          <p className="font-semibold text-gray-900">{ownerName}</p>
                        )}
                        <p className="text-sm text-gray-500">{partner.name}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {partner.alumni_graduation_year && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          Class of {partner.alumni_graduation_year}
                        </span>
                      )}
                      {partner.alumni_position && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {partner.alumni_position}
                        </span>
                      )}
                      {partner.industry && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${primary}12`, color: primary }}
                        >
                          {partner.industry}
                        </span>
                      )}
                    </div>

                    {/* Bio / Description */}
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                      {partner.alumni_bio ?? partner.description ?? ''}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* ================================================================
          SECTION 6 -- ABOUT
         ================================================================ */}
      {tenant.about_content && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={stagger}
            >
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-6">
                About {displayName}
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-gray-600 text-lg leading-relaxed whitespace-pre-line"
              >
                {tenant.about_content}
              </motion.p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ================================================================
          SECTION 7 -- SOCIAL LINKS + CONTACT
         ================================================================ */}
      {(Object.keys(socialLinks).length > 0 || contactInfo.email || contactInfo.phone) && (
        <section className="py-12 px-6 bg-gray-50 border-t border-gray-200">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* Social icons */}
            {Object.entries(socialLinks).map(
              ([key, url]) =>
                url && (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {socialIcon(key)}
                    <span className="text-sm capitalize">{key}</span>
                  </a>
                )
            )}

            {/* Contact info */}
            {contactInfo.email && (
              <a
                href={`mailto:${contactInfo.email}`}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="text-sm">{contactInfo.email}</span>
              </a>
            )}
            {contactInfo.phone && (
              <a
                href={`tel:${contactInfo.phone}`}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Phone className="h-5 w-5" />
                <span className="text-sm">{contactInfo.phone}</span>
              </a>
            )}
          </div>
        </section>
      )}

      {/* ================================================================
          SECTION 8 -- NETWORK EFFECT CALLOUT
         ================================================================ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-6">
              One program starts it. The whole network benefits.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 text-lg leading-relaxed max-w-3xl mx-auto mb-8"
            >
              When {displayName} launches its marketplace, it doesn&rsquo;t stay siloed. Football
              connects to the athletic department. The athletic department connects to career services.
              Career services connects to the entire Campus2Career Network &mdash; unlocking a
              cross-program, cross-school talent pipeline that compounds with every new partner and
              every completed project.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-6">
              {[
                { icon: <Trophy className="h-5 w-5" />, label: 'Athletic Programs' },
                { icon: <Shield className="h-5 w-5" />, label: 'Career Services' },
                { icon: <Users className="h-5 w-5" />, label: 'Alumni Networks' },
                { icon: <Globe className="h-5 w-5" />, label: 'Campus2Career Network' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200"
                >
                  <span style={{ color: primary }}>{item.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================
          SECTION 9 -- CTA FOOTER
         ================================================================ */}
      <section
        className="py-20 px-6"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`,
        }}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: secondary }}
          >
            The best talent doesn&rsquo;t wait to be discovered.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-lg mb-10 max-w-xl mx-auto"
            style={{ color: `${secondary}bb` }}
          >
            They compete, deliver, and prove it &mdash; project by project. Whether you are a
            student-athlete ready to perform or an alumni partner ready to build your bench,
            the marketplace is open.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`/register?tenant=${tenant.subdomain}&role=student`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
              style={{ backgroundColor: secondary, color: primary }}
            >
              <Search className="h-5 w-5" />
              Find Projects
            </a>
            <a
              href={`/register?tenant=${tenant.subdomain}&role=alumni`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 border-2"
              style={{ borderColor: secondary, color: secondary, backgroundColor: 'transparent' }}
            >
              <Handshake className="h-5 w-5" />
              Join as a Partner
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ================================================================
          FOOTER
         ================================================================ */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} {displayName}. Powered by{' '}
          <a
            href="https://campus2career.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline"
          >
            Campus2Career
          </a>
        </p>
      </footer>
    </div>
  );
}
