'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
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
  Lock,
  Share2,
  Brain,
  MessageSquare,
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
    'You didn\u2019t train this hard to sit on the sideline.';
  const subheadline =
    tenant.hero_subheadline ??
    'Real projects. Verified results. Career momentum \u2014 earned, not assumed.';

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

        {/* Image background (if no video but poster/image provided) */}
        {!tenant.hero_video_url && tenant.hero_video_poster_url && (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-40"
            style={{ backgroundImage: `url(${tenant.hero_video_poster_url})` }}
          />
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

          {/* AI competitive edge highlights */}
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { icon: Trophy, text: 'Prove it with real work' },
              { icon: Target, text: 'Skills AI can\u2019t replace' },
              { icon: Rocket, text: 'From the field to the boardroom' },
            ].map((item) => (
              <span
                key={item.text}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-sm"
                style={{
                  backgroundColor: `${secondary}15`,
                  border: `1px solid ${secondary}33`,
                  color: `${secondary}dd`,
                }}
              >
                <item.icon className="h-4 w-4" style={{ color: secondary }} />
                {item.text}
              </span>
            ))}
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
                Powered by <span className="font-semibold text-gray-700">Proveground</span>
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
              Four steps. Real work. Earned reputation.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 max-w-2xl mx-auto">
              The same competitive loop that built you on the field &mdash; now applied to your career.
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
              <h3 className="text-xl font-semibold mb-3">Launch Your Marketplace</h3>
              <p className="text-gray-500 leading-relaxed">
                Your program gets a fully branded marketplace — your colors, your identity, your competitive advantage.
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
              <h3 className="text-xl font-semibold mb-3">Partners Post Real Work</h3>
              <p className="text-gray-500 leading-relaxed">
                Alumni and corporate partners bring real internships and scoped projects. No simulations.
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
              <h3 className="text-xl font-semibold mb-3">Students Deliver &amp; Earn Reviews</h3>
              <p className="text-gray-500 leading-relaxed">
                Real results. Verified reviews. Reputation built one engagement at a time.
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
              <h3 className="text-xl font-semibold mb-3">Reputation Opens Doors</h3>
              <p className="text-gray-500 leading-relaxed">
                A track record that speaks louder than a GPA. Verified work that proves what you can do.
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
              Three paths. One destination.
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
              <h3 className="text-xl font-semibold mb-3">For Students</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Your work speaks for itself. Our Match Engine&trade; pairs you with projects that fit your skills, schedule, and growth trajectory &mdash; so every engagement builds toward the career you want.
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
              <h3 className="text-xl font-semibold mb-3">For Alumni &amp; Partners</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Shape the talent pipeline. Post meaningful projects and let the Match Engine&trade; surface the right students for the work. Discover top talent through verified engagement &mdash; not guesswork.
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
              <h3 className="text-xl font-semibold mb-3">For Programs</h3>
              <p className="text-gray-500 leading-relaxed mb-4">
                Lead with vision. Launch a branded talent marketplace powered by the Match Engine&trade; &mdash; connecting your students to the right opportunities across the network, schedule-aware and data-driven.
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
          SECTION 6.5 -- PHOTO GALLERY
         ================================================================ */}
      {Array.isArray(tenant.gallery_images) && tenant.gallery_images.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
            >
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-center mb-12">
                Gallery
              </motion.h2>
              <motion.div
                variants={fadeUp}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {(tenant.gallery_images as string[]).map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`${displayName} gallery ${i + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                ))}
              </motion.div>
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
          SECTION 8 -- AI COACHING (feature-gated)
         ================================================================ */}
      {!!tenant.features?.aiCoaching && (
        <AICoachingSection primary={primary} subdomain={tenant.subdomain} />
      )}

      {/* ================================================================
          SECTION 8.5 -- NETWORK ECOSYSTEM
         ================================================================ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Stronger together.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 text-lg leading-relaxed max-w-3xl mx-auto"
            >
              When {displayName} launches its marketplace, it connects to the entire Proveground
              ecosystem &mdash; a unified talent network where institutions, alumni, and industry
              partners share opportunities and grow together.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8 mb-12"
          >
            {/* Exclusive */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Lock className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Exclusive Opportunities</h3>
              <p className="text-gray-500 leading-relaxed">
                Your marketplace is private to your program. Listings are visible only to your students, vetted by your team. Quality and trust, by design.
              </p>
            </motion.div>

            {/* Network Sharing */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Share2 className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Network Sharing</h3>
              <p className="text-gray-500 leading-relaxed">
                Choose to share select opportunities across the Proveground network. Partner institutions see what you publish, and you see theirs &mdash; expanding reach while preserving control.
              </p>
            </motion.div>

            {/* Open Ecosystem */}
            <motion.div
              variants={fadeUp}
              className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Globe className="h-7 w-7" style={{ color: primary }} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Open Ecosystem</h3>
              <p className="text-gray-500 leading-relaxed">
                Corporate partners and alumni post directly into the network. Every institution connected to Proveground gains access &mdash; creating a talent pipeline that grows stronger together.
              </p>
            </motion.div>
          </motion.div>

          {/* Credibility strip */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-6"
          >
            {([
              { Icon: Trophy, label: 'Athletic Programs' },
              { Icon: Shield, label: 'Career Services' },
              { Icon: Users, label: 'Alumni Networks' },
              { Icon: Globe, label: 'Proveground Network' },
            ] as const).map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200"
              >
                <item.Icon className="h-5 w-5" style={{ color: primary }} />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
            ))}
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
            This is your ground.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-lg mb-10 max-w-xl mx-auto"
            style={{ color: `${secondary}bb` }}
          >
            Where talent is proven, not presumed. Students, partners, and programs
            building the future &mdash; together.
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
            href="https://proveground.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline"
          >
            Proveground
          </a>
        </p>
      </footer>
    </div>
  );
}

/* ================================================================
   AI COACHING SUB-COMPONENT — renders when aiCoaching feature is on
   ================================================================ */

const coachMessages = [
  {
    type: 'user' as const,
    text: 'I have a consulting project presentation next week and I\u2019ve never presented to a C-suite audience before.',
  },
  {
    type: 'coach' as const,
    text: 'Let\u2019s get you ready. C-suite audiences care about three things: bottom-line impact, risk profile, and timeline. Let\u2019s restructure your deck around those pillars.',
  },
  {
    type: 'user' as const,
    text: 'Can we start with the opening?',
  },
];

function AICoachingSection({ primary, subdomain }: { primary: string; subdomain: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => setShowTyping(true), 2200);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  return (
    <section ref={ref} className="py-20 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-4"
            >
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: primary }}>
                AI-Powered
              </span>
              <span className="text-gray-300 text-xs">|</span>
              <span className="text-gray-400 text-xs font-medium tracking-wide">
                Powered by Anthropic
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl font-bold mb-5 leading-tight"
            >
              AI should prepare you for the future, not replace you.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500 text-base leading-relaxed mb-6"
            >
              Personalized career coaching powered by Anthropic&rsquo;s Claude &mdash; from interview
              prep to project strategy. Not a chatbot. A coach that meets you where you are.
            </motion.p>

            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              href={`/register?tenant=${subdomain}&role=student`}
              className="inline-flex items-center gap-2 font-semibold transition-colors group"
              style={{ color: primary }}
            >
              Explore AI Coaching
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>
          </div>

          {/* Right — Chat mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${primary}15` }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: primary }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Proveground Coach</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Online
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                Powered by Anthropic
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {coachMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.25 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-gray-100 text-gray-900 rounded-br-md'
                        : 'bg-white text-gray-700 border border-gray-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {showTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
