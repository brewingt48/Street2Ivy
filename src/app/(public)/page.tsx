'use client';

/**
 * Campus2Career Landing Page — Enterprise Fortune 50 Design
 *
 * 9 sections: Hero, Problem, How It Works, Value Props,
 * White Label, AI Coaching, Social Proof, Video, CTA Footer
 */

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ChevronDown,
  Briefcase,
  GraduationCap,
  Building2,
  ArrowRight,
  Users,
  BarChart3,
  Shield,
  Palette,
  Globe,
  Sparkles,
  Award,
  TrendingUp,
  Brain,
  Play,
  Monitor,
  Zap,
} from 'lucide-react';

/* ─── Animation helpers ─── */
function FadeInSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── SECTION 1: Hero ─── */
function HeroSection() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

  return (
    <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://videos.pexels.com/video-files/3255275/3255275-uhd_2560_1440_25fps.mp4"
          type="video/mp4"
        />
      </video>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(10,22,40,0.92)] via-[rgba(10,22,40,0.55)] to-[rgba(10,22,40,0.35)]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gold-300 font-medium tracking-wider text-sm uppercase mb-6"
        >
          From Campus to Career
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.05] tracking-tight"
        >
          Where Talent Meets{' '}
          <span className="text-gold-300">Opportunity</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-6 text-lg md:text-xl text-navy-200 max-w-2xl mx-auto leading-relaxed"
        >
          Campus2Career connects students with real corporate projects — building careers before graduation.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-gold-500 px-8 py-3.5 text-base font-semibold text-navy-900 hover:bg-gold-400 transition-all shadow-xl shadow-gold-500/30 hover:shadow-gold-500/50"
          >
            Request a Demo
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all"
          >
            See How It Works
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="h-6 w-6 text-white/50 animate-scroll-indicator" />
      </motion.div>
    </section>
  );
}

/* ─── SECTION 2: The Problem / Opportunity ─── */
function ProblemSection() {
  const stats = [
    {
      icon: GraduationCap,
      number: '78%',
      label: 'of graduates feel unprepared for the workforce',
      description: 'Traditional internships reach only a fraction of students, leaving most without meaningful professional experience.',
    },
    {
      icon: Briefcase,
      number: '$4,700',
      label: 'average cost per hire',
      description: 'Companies struggle to find candidates with real-world skills. The resume-and-interview pipeline is broken.',
    },
    {
      icon: Building2,
      number: '3x',
      label: 'pressure on employment outcomes',
      description: 'Universities are measured by employment outcomes, yet lack scalable tools to connect students with industry.',
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-gold-600 font-medium tracking-wider text-sm uppercase mb-4">The Challenge</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy-900 leading-tight">
            The Talent Gap Is Real
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {stats.map((stat, i) => (
            <FadeInSection key={i} delay={i * 0.15}>
              <div className="text-center p-8 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-navy-50 mb-6">
                  <stat.icon className="h-7 w-7 text-navy-600" />
                </div>
                <p className="text-5xl font-bold text-gold-600 font-serif">{stat.number}</p>
                <p className="text-sm font-semibold text-navy-800 mt-2 uppercase tracking-wide">{stat.label}</p>
                <p className="text-sm text-navy-500 mt-3 leading-relaxed">{stat.description}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 3: How It Works ─── */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: Briefcase,
      title: 'Corporations Post Projects',
      description: 'Define scoped, paid projects with clear deliverables, timelines, and skill requirements. Set your budget and watch qualified applicants come to you.',
    },
    {
      number: '02',
      icon: Users,
      title: 'Students Apply & Match',
      description: 'Students are matched based on skills, interests, and availability. Our algorithm surfaces the best candidates so you can focus on the work, not the search.',
    },
    {
      number: '03',
      icon: BarChart3,
      title: 'Institutions Track Impact',
      description: 'University partners oversee student participation, track outcomes, and measure career readiness — all from a dedicated admin dashboard.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection className="text-center max-w-3xl mx-auto mb-20">
          <p className="text-gold-600 font-medium tracking-wider text-sm uppercase mb-4">The Platform</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy-900 leading-tight">
            One Platform. Three Powerful Connections.
          </h2>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-0">
          {steps.map((step, i) => (
            <FadeInSection key={i} delay={i * 0.2}>
              <div className={`relative p-10 ${i < 2 ? 'lg:border-r border-navy-100' : ''}`}>
                <span className="text-6xl font-serif font-bold text-navy-100">{step.number}</span>
                <div className="mt-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gold-50">
                  <step.icon className="h-6 w-6 text-gold-600" />
                </div>
                <h3 className="mt-5 text-xl font-bold text-navy-900">{step.title}</h3>
                <p className="mt-3 text-navy-500 leading-relaxed">{step.description}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 4: Value Propositions by Audience ─── */
function ValuePropsSection() {
  const [activeTab, setActiveTab] = useState(0);

  const audiences = [
    {
      tab: 'For Students',
      icon: GraduationCap,
      headline: 'Build your portfolio before you graduate',
      points: [
        { icon: Briefcase, text: 'Paid project work with real companies' },
        { icon: Brain, text: 'AI-powered career coaching to develop your skills' },
        { icon: Award, text: 'Skills-verified profile that showcases what you can actually do' },
        { icon: TrendingUp, text: 'Direct path from project work to job offers' },
        { icon: Shield, text: 'NDA-protected collaboration on professional projects' },
      ],
    },
    {
      tab: 'For Corporate Partners',
      icon: Briefcase,
      headline: 'Access pre-vetted, project-ready talent',
      points: [
        { icon: Users, text: 'Post projects and receive skills-matched applicants' },
        { icon: BarChart3, text: 'Milestone-based workflow with built-in deliverable tracking' },
        { icon: Zap, text: 'Reduce time-to-productivity for entry-level hires' },
        { icon: Award, text: 'Build your employer brand on campus before students graduate' },
        { icon: Shield, text: 'Enterprise-grade security with integrated NDA management' },
      ],
    },
    {
      tab: 'For Institutions',
      icon: Building2,
      headline: 'Your own branded career development marketplace',
      points: [
        { icon: Palette, text: 'White-label platform customized to your institution\'s brand' },
        { icon: BarChart3, text: 'Real-time dashboards tracking student engagement and outcomes' },
        { icon: Brain, text: 'AI coaching that supplements your career services team' },
        { icon: TrendingUp, text: 'Data-driven proof of career readiness for accreditation' },
        { icon: Globe, text: 'Custom domain and full brand theming' },
      ],
    },
  ];

  const active = audiences[activeTab];

  return (
    <section id="for-you" className="py-24 md:py-32 bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-gold-400 font-medium tracking-wider text-sm uppercase mb-4">Solutions</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white leading-tight">
            Built for Everyone in the Ecosystem
          </h2>
        </FadeInSection>

        {/* Tabs */}
        <FadeInSection delay={0.2}>
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-navy-800 rounded-full p-1.5 gap-1">
              {audiences.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === i
                      ? 'bg-gold-500 text-navy-900 shadow-lg'
                      : 'text-navy-300 hover:text-white'
                  }`}
                >
                  {a.tab}
                </button>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <active.icon className="h-7 w-7 text-gold-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-white">{active.headline}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {active.points.map((point, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-navy-800/60 border border-navy-700/50">
                <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
                  <point.icon className="h-5 w-5 text-gold-400" />
                </div>
                <p className="text-navy-200 leading-relaxed">{point.text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── SECTION 5: White Label ─── */
function WhiteLabelSection() {
  const [brandIndex, setBrandIndex] = useState(0);
  const brands = [
    { name: 'Howard University Talent Hub', color: '#003A63', accent: '#E4002B' },
    { name: 'Spelman Career Connect', color: '#1C2957', accent: '#C19A6B' },
    { name: 'MIT Project Exchange', color: '#750014', accent: '#8B8B8B' },
  ];

  useEffect(() => {
    const interval = setInterval(() => setBrandIndex((i) => (i + 1) % brands.length), 3000);
    return () => clearInterval(interval);
  }, [brands.length]);

  const brand = brands[brandIndex];

  return (
    <section id="white-label" className="py-24 md:py-32 bg-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeInSection>
            <p className="text-gold-600 font-medium tracking-wider text-sm uppercase mb-4">White Label</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy-900 leading-tight">
              Your Platform. Your Brand. Your Students.
            </h2>
            <p className="mt-6 text-lg text-navy-500 leading-relaxed">
              Every institution is unique. Campus2Career gives you a fully customizable, white-label marketplace — your logo, your colors, your domain. Students see your brand, not ours.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Globe, text: 'Custom domain (marketplace.youruniversity.edu)' },
                { icon: Palette, text: 'Full brand theming — colors, logos, fonts' },
                { icon: Play, text: 'Video content hosting for orientation and training' },
                { icon: Monitor, text: 'Configurable features — enable what you need' },
                { icon: BarChart3, text: 'Dedicated admin dashboard with real-time analytics' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4 text-gold-600" />
                  </div>
                  <span className="text-navy-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </FadeInSection>

          <FadeInSection delay={0.3}>
            {/* Browser mockup */}
            <div className="relative">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-navy-100">
                <div className="bg-navy-100 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-navy-400 font-mono">
                    marketplace.university.edu
                  </div>
                </div>
                <motion.div
                  key={brandIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="p-8 min-h-[320px]"
                  style={{ backgroundColor: brand.color }}
                >
                  <div className="space-y-4">
                    <div className="h-6 w-48 rounded" style={{ backgroundColor: brand.accent, opacity: 0.8 }} />
                    <div className="h-8 w-72 bg-white/20 rounded" />
                    <div className="h-4 w-56 bg-white/10 rounded" />
                    <div className="mt-8 flex gap-3">
                      <div className="h-10 w-32 rounded-full" style={{ backgroundColor: brand.accent }} />
                      <div className="h-10 w-32 rounded-full border-2 border-white/30" />
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="h-20 rounded-lg bg-white/10" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
              {/* Brand label */}
              <motion.div
                key={brandIndex + '-label'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute -bottom-4 -right-4 bg-white shadow-lg rounded-lg px-4 py-2 border border-navy-100"
              >
                <p className="text-sm font-semibold text-navy-800">{brand.name}</p>
              </motion.div>
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 6: AI Coaching ─── */
function AICoachingSection() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeInSection className="order-2 lg:order-1">
            {/* Chat mockup */}
            <div className="bg-navy-50 rounded-2xl p-6 shadow-sm max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-gold-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">AI Career Coach</p>
                  <p className="text-xs text-navy-400">Always available</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-xl rounded-tl-sm p-4 shadow-sm max-w-[85%]">
                  <p className="text-sm text-navy-700">Based on your work on the marketing analytics project, I&apos;d recommend focusing on data storytelling skills for your next project.</p>
                </div>
                <div className="bg-gold-50 rounded-xl rounded-tr-sm p-4 shadow-sm max-w-[85%] ml-auto">
                  <p className="text-sm text-navy-700">That makes sense! Can you help me prep for the interview with Deloitte?</p>
                </div>
                <div className="bg-white rounded-xl rounded-tl-sm p-4 shadow-sm max-w-[85%]">
                  <p className="text-sm text-navy-700">Absolutely. I&apos;ll create a tailored interview prep plan based on Deloitte&apos;s consulting analyst role requirements and your project portfolio.</p>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection className="order-1 lg:order-2" delay={0.2}>
            <p className="text-gold-600 font-medium tracking-wider text-sm uppercase mb-4">AI-Powered</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy-900 leading-tight">
              AI Career Coaching, Built In
            </h2>
            <p className="mt-6 text-lg text-navy-500 leading-relaxed">
              Every student deserves a career coach. Campus2Career&apos;s AI coaching engine provides personalized guidance — available 24/7, at scale.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Personalized skills assessments that evolve with each project',
                'Interview prep tailored to the student\'s target industry',
                'Career readiness scoring that institutions can track',
                'Funded by corporate sponsorships — free for students',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-gold-500 mt-0.5 flex-shrink-0" />
                  <span className="text-navy-600">{text}</span>
                </li>
              ))}
            </ul>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 7: Social Proof / Numbers ─── */
function SocialProofSection() {
  const stats = [
    { number: '500+', label: 'Corporate Partners' },
    { number: '$2.4M+', label: 'Paid to Students' },
    { number: '45+', label: 'University Partners' },
    { number: '92%', label: 'Student Satisfaction' },
  ];

  return (
    <section className="py-24 md:py-32 bg-navy-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Stats band */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, i) => (
            <FadeInSection key={i} delay={i * 0.1} className="text-center">
              <p className="text-4xl md:text-5xl font-serif font-bold text-gold-400">{stat.number}</p>
              <p className="text-sm text-navy-300 mt-2 uppercase tracking-wider font-medium">{stat.label}</p>
            </FadeInSection>
          ))}
        </div>

        {/* Partner logos placeholder */}
        <FadeInSection delay={0.3}>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 mb-16">
            {['Partner University', 'Partner University', 'Corporate Partner', 'Corporate Partner', 'Partner University', 'Corporate Partner'].map((label, i) => (
              <div key={i} className="flex items-center justify-center h-16 rounded-lg bg-navy-800/60 border border-navy-700/30">
                <span className="text-xs text-navy-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* Testimonial */}
        <FadeInSection delay={0.4} className="text-center max-w-3xl mx-auto">
          <blockquote className="font-serif text-2xl md:text-3xl text-white/90 italic leading-relaxed">
            &ldquo;Campus2Career didn&apos;t just give our students internships — it gave them real project ownership. Our employment outcomes improved 34% in the first year.&rdquo;
          </blockquote>
          <div className="mt-6">
            <p className="text-gold-400 font-semibold">Dr. Sarah Chen</p>
            <p className="text-navy-400 text-sm">VP of Career Services, Partner University</p>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─── SECTION 8: Video Content ─── */
function VideoSection() {
  return (
    <section className="py-24 md:py-32 bg-ivory">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <FadeInSection className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-gold-600 font-medium tracking-wider text-sm uppercase mb-4">See It in Action</p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-navy-900 leading-tight">
            See Campus2Career in Action
          </h2>
        </FadeInSection>

        {/* Main video player */}
        <FadeInSection delay={0.2}>
          <div className="relative aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-navy-900 group cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1280"
              alt="Campus2Career platform demo"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gold-500 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-navy-900 ml-1" />
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Thumbnail cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 max-w-4xl mx-auto">
          {[
            { title: 'How It Works for Students', icon: GraduationCap },
            { title: 'Corporate Partner Overview', icon: Briefcase },
            { title: 'Institution Setup Guide', icon: Building2 },
          ].map((video, i) => (
            <FadeInSection key={i} delay={0.3 + i * 0.1}>
              <div className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow border border-navy-100/50">
                <div className="h-32 bg-navy-100 flex items-center justify-center relative">
                  <video.icon className="h-10 w-10 text-navy-300" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-navy-900/40">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-navy-800">{video.title}</p>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── SECTION 9: CTA Footer ─── */
function CTASection() {
  return (
    <section id="demo" className="py-24 md:py-32 bg-navy">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
        <FadeInSection>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Ready to Bridge the Gap Between{' '}
            <span className="text-gold-300">Campus and Career?</span>
          </h2>
          <p className="mt-6 text-lg text-navy-300 max-w-2xl mx-auto">
            Whether you&apos;re a student, corporation, or institution — Campus2Career has a solution designed for you.
          </p>
        </FadeInSection>

        <FadeInSection delay={0.3}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register?role=student"
              className="inline-flex items-center justify-center rounded-full bg-gold-500 px-8 py-3.5 text-base font-semibold text-navy-900 hover:bg-gold-400 transition-all shadow-xl shadow-gold-500/30 w-full sm:w-auto gap-2"
            >
              <GraduationCap className="h-5 w-5" />
              I&apos;m a Student
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register?role=corporate_partner"
              className="inline-flex items-center justify-center rounded-full border-2 border-gold-500/40 px-8 py-3.5 text-base font-semibold text-gold-300 hover:bg-gold-500/10 transition-all w-full sm:w-auto gap-2"
            >
              <Briefcase className="h-5 w-5" />
              Corporate Partner
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register?role=educational_admin"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/20 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all w-full sm:w-auto gap-2"
            >
              <Building2 className="h-5 w-5" />
              Institution
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

/* ─── PAGE COMPONENT ─── */
export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <ValuePropsSection />
      <WhiteLabelSection />
      <AICoachingSection />
      <SocialProofSection />
      <VideoSection />
      <CTASection />
    </>
  );
}
