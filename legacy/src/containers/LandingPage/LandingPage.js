import React, { useState, useEffect, useRef, useCallback } from 'react';
import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LayoutComposer, NamedLink, NamedRedirect, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { fetchPublicContent, fetchPublicCoachingConfig, fetchPublicTenantContent, apiBaseUrl } from '../../util/api';

import css from './LandingPage.module.css';

// ─── Counter animation hook ────────────────────────────────────────────────────
const useCountUp = (end, duration = 2000, startOnView = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView || hasStarted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, startOnView]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime = null;
    const isDecimal = end % 1 !== 0;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = progress * end;
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, end, duration]);

  return { count, ref };
};

// ─── Scroll visibility hook ─────────────────────────────────────────────────────
const useScrollVisibility = (threshold = 0.15) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { isVisible, ref };
};

// ─── Tenant detection helper ────────────────────────────────────────────────────
const getTenantInfo = () => {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  // Match school subdomains: e.g., howard.street2ivy.com
  const match = hostname.match(/^([a-z0-9-]+)\.street2ivy\.com$/);
  if (match && match[1] !== 'www' && match[1] !== 'app') {
    return { slug: match[1] };
  }
  return null;
};

// ─── Main Landing Page Component ────────────────────────────────────────────────
const LandingPageComponent = props => {
  const { currentUser } = props;
  const intl = useIntl();
  const [dynamicContent, setDynamicContent] = useState(null);
  const [coachingConfig, setCoachingConfig] = useState(null);
  const [isLoadingCoaching, setIsLoadingCoaching] = useState(true);
  const [activeHowTab, setActiveHowTab] = useState('companies');
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(true);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantContent, setTenantContent] = useState(null);

  const isAuthenticated = !!currentUser;
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isStudent = userType === 'student';

  // Scroll visibility refs for each section
  const heroVis = useScrollVisibility(0.1);
  const howVis = useScrollVisibility(0.15);
  const trustVis = useScrollVisibility(0.15);
  const valueVis = useScrollVisibility(0.15);
  const statsVis = useScrollVisibility(0.15);
  const aiVis = useScrollVisibility(0.15);
  const ctaVis = useScrollVisibility(0.15);

  // Detect tenant
  useEffect(() => {
    const info = getTenantInfo();
    setTenantInfo(info);

    // Fetch tenant-specific content if on a subdomain
    if (info?.slug) {
      fetchPublicTenantContent(info.slug)
        .then(response => {
          if (response.data) {
            setTenantContent(response);
          }
        })
        .catch(err => {
          console.log('No tenant customization found, using default content:', err);
        });
    }
  }, []);

  // Fetch dynamic content from API
  useEffect(() => {
    fetchPublicContent()
      .then(response => {
        setDynamicContent(response.data);
      })
      .catch(err => {
        console.log('Using static content - dynamic content not available:', err);
      });
  }, []);

  // Fetch AI coaching config
  useEffect(() => {
    fetchPublicCoachingConfig()
      .then(response => {
        setCoachingConfig(response.data);
      })
      .catch(err => {
        console.log('Using default coaching config:', err);
        // Set default config so the section renders with sensible defaults
        setCoachingConfig({
          platformName: 'AI Career Coach',
          platformStatus: false,
          platformUrl: '',
        });
      })
      .finally(() => {
        setIsLoadingCoaching(false);
      });
  }, []);

  // Fetch institution info for logged-in students
  useEffect(() => {
    const fetchInstitutionInfoFn = async () => {
      if (!isStudent) {
        setIsLoadingInstitution(false);
        return;
      }
      try {
        const baseUrl = apiBaseUrl();
        const response = await fetch(`${baseUrl}/api/institutions/my-institution`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setInstitutionInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch institution info:', error);
      } finally {
        setIsLoadingInstitution(false);
      }
    };

    if (currentUser && isStudent) {
      fetchInstitutionInfoFn();
    } else {
      setIsLoadingInstitution(false);
    }
  }, [currentUser, isStudent]);

  const canAccessAICoaching = isStudent
    ? institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl
    : true;

  const title = intl.formatMessage({ id: 'LandingPage.title' });
  const description = intl.formatMessage({ id: 'LandingPage.description' });

  // Get content from dynamic data or use static fallback
  const heroContent = dynamicContent?.hero || null;
  const statisticsContent = dynamicContent?.statistics || null;
  const testimonialsContent = dynamicContent?.testimonials || null;

  // Tenant content overrides (from educational admin customization)
  const tc = tenantContent?.data || null;
  const tcInstitution = tenantContent?.institution || null;

  // Section visibility: system admin isActive flags are the global defaults,
  // tenant visibility overrides on subdomains
  const sectionVisible = (sectionKey, tcKey) => {
    // If on a tenant subdomain, tenant visibility takes priority
    if (tc?.visibility && tc.visibility[tcKey] !== undefined) {
      return tc.visibility[tcKey] !== false;
    }
    // Otherwise, check the global admin content isActive flag
    if (dynamicContent?.[sectionKey]?.isActive !== undefined) {
      return dynamicContent[sectionKey].isActive !== false;
    }
    return true; // Default visible
  };

  // Dynamic stats — tenant overrides take priority
  const tenantStats = tc?.stats?.items || [];
  const statsItems = tenantStats.length > 0 ? tenantStats : (statisticsContent?.items || []);
  const stat1 = statsItems.find(s => s.id === 'stat-1') || { value: 5000, label: null, suffix: '+' };
  const stat2 = statsItems.find(s => s.id === 'stat-2') || { value: 850, label: null, suffix: '+' };
  const stat3 = statsItems.find(s => s.id === 'stat-3') || { value: 200, label: null, suffix: '+' };
  const stat4 = statsItems.find(s => s.id === 'stat-4') || statsItems[3] || { value: 4.9, label: null, suffix: '' };

  const studentsCount = useCountUp(stat1.value);
  const projectsCount = useCountUp(stat2.value);
  const companiesCount = useCountUp(stat3.value);
  const ratingCount = useCountUp(stat4.value);

  // Redirect logged-in users to their dashboard (placed after all hooks)
  if (isAuthenticated && userType) {
    if (userType === 'student') {
      return <NamedRedirect name="StudentDashboardPage" />;
    } else if (userType === 'corporate-partner') {
      return <NamedRedirect name="CorporateDashboardPage" />;
    } else if (userType === 'educational-institution-admin') {
      return <NamedRedirect name="EducationDashboardPage" />;
    }
  }

  // ─── Tenant-aware heading ─────────────────────────────────────────────────
  const tenantHeroTitle = tc?.hero?.title || null;
  const tenantHeroSubtitle = tc?.hero?.subtitle || null;
  const tenantHeading = tenantHeroTitle
    ? tenantHeroTitle
    : tenantInfo
      ? intl.formatMessage({ id: 'LandingPage.hero.titleTenant' }, { school: tcInstitution?.name || tenantInfo.slug.replace(/-/g, ' ') })
      : null;

  // ─── How It Works steps per audience ──────────────────────────────────────
  const howItWorksSteps = {
    companies: [
      { num: '1', titleId: 'LandingPage.how.companies.step1Title', descId: 'LandingPage.how.companies.step1Desc' },
      { num: '2', titleId: 'LandingPage.how.companies.step2Title', descId: 'LandingPage.how.companies.step2Desc' },
      { num: '3', titleId: 'LandingPage.how.companies.step3Title', descId: 'LandingPage.how.companies.step3Desc' },
      { num: '4', titleId: 'LandingPage.how.companies.step4Title', descId: 'LandingPage.how.companies.step4Desc' },
      { num: '5', titleId: 'LandingPage.how.companies.step5Title', descId: 'LandingPage.how.companies.step5Desc' },
    ],
    students: [
      { num: '1', titleId: 'LandingPage.how.students.step1Title', descId: 'LandingPage.how.students.step1Desc' },
      { num: '2', titleId: 'LandingPage.how.students.step2Title', descId: 'LandingPage.how.students.step2Desc' },
      { num: '3', titleId: 'LandingPage.how.students.step3Title', descId: 'LandingPage.how.students.step3Desc' },
      { num: '4', titleId: 'LandingPage.how.students.step4Title', descId: 'LandingPage.how.students.step4Desc' },
      { num: '5', titleId: 'LandingPage.how.students.step5Title', descId: 'LandingPage.how.students.step5Desc' },
    ],
    universities: [
      { num: '1', titleId: 'LandingPage.how.universities.step1Title', descId: 'LandingPage.how.universities.step1Desc' },
      { num: '2', titleId: 'LandingPage.how.universities.step2Title', descId: 'LandingPage.how.universities.step2Desc' },
      { num: '3', titleId: 'LandingPage.how.universities.step3Title', descId: 'LandingPage.how.universities.step3Desc' },
      { num: '4', titleId: 'LandingPage.how.universities.step4Title', descId: 'LandingPage.how.universities.step4Desc' },
      { num: '5', titleId: 'LandingPage.how.universities.step5Title', descId: 'LandingPage.how.universities.step5Desc' },
    ],
  };

  // ─── Trust differentiators ────────────────────────────────────────────────
  const trustItems = [
    { icon: '🔒', titleId: 'LandingPage.trust.item1Title', descId: 'LandingPage.trust.item1Desc' },
    { icon: '⭐', titleId: 'LandingPage.trust.item2Title', descId: 'LandingPage.trust.item2Desc' },
    { icon: '🤝', titleId: 'LandingPage.trust.item3Title', descId: 'LandingPage.trust.item3Desc' },
    { icon: '📊', titleId: 'LandingPage.trust.item4Title', descId: 'LandingPage.trust.item4Desc' },
  ];

  // ─── Value propositions per audience ──────────────────────────────────────
  const valueProps = [
    {
      audienceId: 'LandingPage.value.companies.audience',
      titleId: 'LandingPage.value.companies.title',
      descId: 'LandingPage.value.companies.desc',
      features: [
        'LandingPage.value.companies.feature1',
        'LandingPage.value.companies.feature2',
        'LandingPage.value.companies.feature3',
        'LandingPage.value.companies.feature4',
      ],
      ctaId: 'LandingPage.value.companies.cta',
      ctaLink: 'SignupPage',
      theme: 'navy',
    },
    {
      audienceId: 'LandingPage.value.students.audience',
      titleId: 'LandingPage.value.students.title',
      descId: 'LandingPage.value.students.desc',
      features: [
        'LandingPage.value.students.feature1',
        'LandingPage.value.students.feature2',
        'LandingPage.value.students.feature3',
        'LandingPage.value.students.feature4',
      ],
      ctaId: 'LandingPage.value.students.cta',
      ctaLink: 'SignupPage',
      theme: 'teal',
    },
    {
      audienceId: 'LandingPage.value.universities.audience',
      titleId: 'LandingPage.value.universities.title',
      descId: 'LandingPage.value.universities.desc',
      features: [
        'LandingPage.value.universities.feature1',
        'LandingPage.value.universities.feature2',
        'LandingPage.value.universities.feature3',
        'LandingPage.value.universities.feature4',
      ],
      ctaId: 'LandingPage.value.universities.cta',
      ctaLink: null, // external link
      theme: 'amber',
    },
  ];

  // ─── Testimonials ─────────────────────────────────────────────────────────
  const staticTestimonials = [
    {
      quoteId: 'LandingPage.testimonial1.quote',
      authorId: 'LandingPage.testimonial1.author',
      roleId: 'LandingPage.testimonial1.role',
      avatar: '👨‍💼',
    },
    {
      quoteId: 'LandingPage.testimonial2.quote',
      authorId: 'LandingPage.testimonial2.author',
      roleId: 'LandingPage.testimonial2.role',
      avatar: '👩‍🎓',
    },
    {
      quoteId: 'LandingPage.testimonial3.quote',
      authorId: 'LandingPage.testimonial3.author',
      roleId: 'LandingPage.testimonial3.role',
      avatar: '🏛️',
    },
  ];

  const layoutAreas = `
    topbar
    main
    footer
  `;

  return (
    <Page title={title} description={description} scrollingDisabled={false}>
      <LayoutComposer areas={layoutAreas} className={css.root}>
        {layoutProps => {
          const { Topbar, Main, Footer } = layoutProps;
          return (
            <>
              <Topbar as="header">
                <TopbarContainer currentPage="LandingPage" />
              </Topbar>
              <Main as="main" id="main-content">

                {/* ════════════════════════════════════════════════════════════
                    SECTION 1: HERO
                    ════════════════════════════════════════════════════════════ */}
                <section className={css.heroSection} ref={heroVis.ref}>
                  <div className={css.heroOverlay} />

                  {/* Subtle animated particles — deterministic positions to avoid SSR hydration mismatch */}
                  <div className={css.heroParticles} aria-hidden="true">
                    {[
                      { left: 8, top: 15, delay: 0, dur: 20 },
                      { left: 23, top: 72, delay: 3, dur: 24 },
                      { left: 45, top: 30, delay: 7, dur: 19 },
                      { left: 67, top: 85, delay: 11, dur: 26 },
                      { left: 82, top: 42, delay: 2, dur: 22 },
                      { left: 15, top: 55, delay: 14, dur: 28 },
                      { left: 55, top: 10, delay: 5, dur: 21 },
                      { left: 90, top: 68, delay: 9, dur: 25 },
                      { left: 35, top: 90, delay: 16, dur: 23 },
                      { left: 72, top: 20, delay: 8, dur: 27 },
                      { left: 50, top: 60, delay: 12, dur: 18 },
                      { left: 5, top: 35, delay: 18, dur: 29 },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className={css.particle}
                        style={{
                          left: `${p.left}%`,
                          top: `${p.top}%`,
                          animationDelay: `${p.delay}s`,
                          animationDuration: `${p.dur}s`,
                        }}
                      />
                    ))}
                  </div>

                  <div className={css.heroGrid}>
                    {/* Left — Copy */}
                    <div className={css.heroContent}>
                      {tc?.branding?.logoUrl && (
                        <div className={css.tenantLogo}>
                          <img
                            src={tc.branding.logoUrl}
                            alt={tc.branding.institutionName || 'Institution'}
                            className={css.tenantLogoImg}
                          />
                        </div>
                      )}
                      <div className={css.heroBadge}>
                        <span className={css.badgeDot} aria-hidden="true" />
                        <span>
                          {tc?.branding?.tagline || intl.formatMessage({ id: 'LandingPage.hero.badge' })}
                        </span>
                      </div>

                      <h1 className={css.heroTitle}>
                        {tenantHeading || (
                          <>
                            {intl.formatMessage({ id: 'LandingPage.hero.titleLine1' })}{' '}
                            <span className={css.heroTitleGradient}>
                              {intl.formatMessage({ id: 'LandingPage.hero.titleHighlight' })}
                            </span>
                          </>
                        )}
                      </h1>

                      <p className={css.heroSubtitle}>
                        {tenantHeroSubtitle || intl.formatMessage({ id: 'LandingPage.hero.subtitle' })}
                      </p>

                      <div className={css.heroButtons}>
                        {!isAuthenticated ? (
                          <>
                            <NamedLink name="SignupPage" className={css.btnPrimary}>
                              {intl.formatMessage({ id: 'LandingPage.hero.ctaPrimary' })}
                              <span aria-hidden="true"> →</span>
                            </NamedLink>
                            <NamedLink name="SignupPage" className={css.btnSecondary}>
                              {intl.formatMessage({ id: 'LandingPage.hero.ctaSecondary' })}
                              <span aria-hidden="true"> →</span>
                            </NamedLink>
                          </>
                        ) : (
                          <NamedLink name="SearchPage" className={css.btnPrimary}>
                            {intl.formatMessage({ id: 'LandingPage.hero.ctaBrowse' })}
                            <span aria-hidden="true"> →</span>
                          </NamedLink>
                        )}
                      </div>

                      {/* "I am a…" quick links */}
                      {!isAuthenticated && (
                        <div className={css.userTypeLinks}>
                          <span className={css.userTypeLabel}>
                            {intl.formatMessage({ id: 'LandingPage.hero.iAmA' })}
                          </span>
                          <a href="#how-section" className={css.userTypeLink} onClick={() => setActiveHowTab('companies')}>
                            {intl.formatMessage({ id: 'LandingPage.hero.linkCompany' })}
                          </a>
                          <span className={css.userTypeDivider} aria-hidden="true">·</span>
                          <a href="#how-section" className={css.userTypeLink} onClick={() => setActiveHowTab('students')}>
                            {intl.formatMessage({ id: 'LandingPage.hero.linkStudent' })}
                          </a>
                          <span className={css.userTypeDivider} aria-hidden="true">·</span>
                          <a href="#how-section" className={css.userTypeLink} onClick={() => setActiveHowTab('universities')}>
                            {intl.formatMessage({ id: 'LandingPage.hero.linkUniversity' })}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Right — Visual: Connection Graph */}
                    <div className={css.heroVisual} aria-hidden="true">
                      <div className={css.connectionGraphic}>
                        <div className={css.orbitRing} />
                        <div className={css.orbitRing2} />
                        <div className={`${css.node} ${css.nodeCorporate}`}>🏢</div>
                        <div className={`${css.node} ${css.nodeProject}`}>🚀</div>
                        <div className={`${css.node} ${css.nodeStudent}`}>🎓</div>
                        <div className={`${css.node} ${css.nodeInstitution}`}>🏛️</div>
                        <div className={`${css.connectionLine} ${css.line1}`} />
                        <div className={`${css.connectionLine} ${css.line2}`} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ════════════════════════════════════════════════════════════
                    SECTION 2: HOW IT WORKS — Tabbed, 3 audiences × 5 steps
                    ════════════════════════════════════════════════════════════ */}
                {sectionVisible('howItWorks', 'showHowItWorks') && (
                <section className={css.howSection} id="how-section" ref={howVis.ref}>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>
                      {intl.formatMessage({ id: 'LandingPage.how.label' })}
                    </span>
                    <h2 className={css.sectionTitle}>
                      {intl.formatMessage({ id: 'LandingPage.how.title' })}
                    </h2>
                    <p className={css.sectionSubtitle}>
                      {intl.formatMessage({ id: 'LandingPage.how.subtitle' })}
                    </p>

                    {/* Audience Tabs */}
                    <div className={css.toggleTabs} role="tablist">
                      {['companies', 'students', 'universities'].map(tab => (
                        <button
                          key={tab}
                          role="tab"
                          aria-selected={activeHowTab === tab}
                          className={`${css.toggleTab} ${activeHowTab === tab ? css.toggleTabActive : ''}`}
                          onClick={() => setActiveHowTab(tab)}
                        >
                          {intl.formatMessage({ id: `LandingPage.how.tab.${tab}` })}
                        </button>
                      ))}
                    </div>

                    {/* Steps */}
                    <div className={css.stepsContainer}>
                      <div className={css.stepsLine} aria-hidden="true" />
                      {howItWorksSteps[activeHowTab].map((step, idx) => (
                        <div
                          key={`${activeHowTab}-${step.num}`}
                          className={`${css.howStep} ${howVis.isVisible ? css.visible : ''}`}
                          style={{ transitionDelay: `${idx * 0.1}s` }}
                        >
                          <div className={css.stepNumber}>{step.num}</div>
                          <div className={css.stepContent}>
                            <h4>{intl.formatMessage({ id: step.titleId })}</h4>
                            <p>{intl.formatMessage({ id: step.descId })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
                )}

                {/* ════════════════════════════════════════════════════════════
                    SECTION 3: TRUST & DIFFERENTIATION — "Your Work Stays Yours"
                    ════════════════════════════════════════════════════════════ */}
                <section className={css.trustSection} ref={trustVis.ref}>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabelLight}>
                      {intl.formatMessage({ id: 'LandingPage.trust.label' })}
                    </span>
                    <h2 className={css.sectionTitleLight}>
                      {intl.formatMessage({ id: 'LandingPage.trust.title' })}
                    </h2>
                    <p className={css.sectionSubtitleLight}>
                      {intl.formatMessage({ id: 'LandingPage.trust.subtitle' })}
                    </p>

                    <div className={css.trustGrid}>
                      {trustItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`${css.trustCard} ${trustVis.isVisible ? css.visible : ''}`}
                          style={{ transitionDelay: `${idx * 0.1}s` }}
                        >
                          <div className={css.trustIcon} aria-hidden="true">{item.icon}</div>
                          <h3 className={css.trustCardTitle}>
                            {intl.formatMessage({ id: item.titleId })}
                          </h3>
                          <p className={css.trustCardDesc}>
                            {intl.formatMessage({ id: item.descId })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ════════════════════════════════════════════════════════════
                    SECTION 4: VALUE PROPOSITIONS — One card per audience
                    ════════════════════════════════════════════════════════════ */}
                <section className={css.valueSection} ref={valueVis.ref}>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>
                      {intl.formatMessage({ id: 'LandingPage.value.label' })}
                    </span>
                    <h2 className={css.sectionTitle}>
                      {intl.formatMessage({ id: 'LandingPage.value.title' })}
                    </h2>
                    <p className={css.sectionSubtitle}>
                      {intl.formatMessage({ id: 'LandingPage.value.subtitle' })}
                    </p>

                    <div className={css.valueGrid}>
                      {valueProps.map((vp, idx) => (
                        <div
                          key={idx}
                          className={`${css.valueCard} ${css[`valueCard${vp.theme.charAt(0).toUpperCase() + vp.theme.slice(1)}`]} ${valueVis.isVisible ? css.visible : ''}`}
                          style={{ transitionDelay: `${idx * 0.15}s` }}
                        >
                          <span className={css.valueAudience}>
                            {intl.formatMessage({ id: vp.audienceId })}
                          </span>
                          <h3 className={css.valueCardTitle}>
                            {intl.formatMessage({ id: vp.titleId })}
                          </h3>
                          <p className={css.valueCardDesc}>
                            {intl.formatMessage({ id: vp.descId })}
                          </p>
                          <ul className={css.valueFeatures}>
                            {vp.features.map((fId, fIdx) => (
                              <li key={fIdx}>
                                <span className={css.valueCheck} aria-hidden="true">✓</span>
                                {intl.formatMessage({ id: fId })}
                              </li>
                            ))}
                          </ul>
                          {vp.ctaLink ? (
                            <NamedLink name={vp.ctaLink} className={css.valueBtn}>
                              {intl.formatMessage({ id: vp.ctaId })}
                              <span aria-hidden="true"> →</span>
                            </NamedLink>
                          ) : (
                            <a
                              href="https://calendly.com/tavares-brewington-street2ivy/demo"
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css.valueBtn}
                            >
                              {intl.formatMessage({ id: vp.ctaId })}
                              <span aria-hidden="true"> →</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ════════════════════════════════════════════════════════════
                    SECTION 5: SOCIAL PROOF — Stats + Testimonials
                    ════════════════════════════════════════════════════════════ */}
                {(sectionVisible('statistics', 'showStats') && sectionVisible('testimonials', 'showTestimonials')) && (
                <section className={css.socialSection} ref={statsVis.ref}>
                  <div className={css.sectionContainer}>
                    {/* Stats Row */}
                    <div className={css.statsGrid}>
                      <div className={css.statItem} ref={studentsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>
                            {studentsCount.count.toLocaleString()}
                          </span>
                          {stat1.suffix}
                        </div>
                        <div className={css.statLabel}>
                          {stat1.label || intl.formatMessage({ id: 'LandingPage.stats.students' })}
                        </div>
                      </div>
                      <div className={css.statItem} ref={projectsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>
                            {projectsCount.count.toLocaleString()}
                          </span>
                          {stat2.suffix}
                        </div>
                        <div className={css.statLabel}>
                          {stat2.label || intl.formatMessage({ id: 'LandingPage.stats.matches' })}
                        </div>
                      </div>
                      <div className={css.statItem} ref={companiesCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>
                            {companiesCount.count.toLocaleString()}
                          </span>
                          {stat3.suffix}
                        </div>
                        <div className={css.statLabel}>
                          {stat3.label || intl.formatMessage({ id: 'LandingPage.stats.companies' })}
                        </div>
                      </div>
                      <div className={css.statItem} ref={ratingCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>
                            {ratingCount.count}
                          </span>
                          <span className={css.statStar} aria-hidden="true">★</span>
                        </div>
                        <div className={css.statLabel}>
                          {stat4.label || intl.formatMessage({ id: 'LandingPage.stats.rating' })}
                        </div>
                      </div>
                    </div>

                    {/* Testimonials */}
                    <div className={css.testimonialsBlock}>
                      <h3 className={css.testimonialsHeading}>
                        {intl.formatMessage({ id: 'LandingPage.testimonials.title' })}
                      </h3>
                      <div className={css.testimonialsGrid}>
                        {staticTestimonials.map((t, idx) => (
                          <div
                            key={idx}
                            className={`${css.testimonialCard} ${statsVis.isVisible ? css.visible : ''}`}
                            style={{ transitionDelay: `${idx * 0.15}s` }}
                          >
                            <div className={css.testimonialQuoteMark} aria-hidden="true">"</div>
                            <p className={css.testimonialQuote}>
                              {intl.formatMessage({ id: t.quoteId })}
                            </p>
                            <div className={css.testimonialAuthor}>
                              <div className={css.authorAvatar} aria-hidden="true">{t.avatar}</div>
                              <div className={css.authorInfo}>
                                <h5 className={css.authorName}>
                                  {intl.formatMessage({ id: t.authorId })}
                                </h5>
                                <span className={css.authorRole}>
                                  {intl.formatMessage({ id: t.roleId })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className={css.testimonialsDisclaimer}>
                        {intl.formatMessage({ id: 'LandingPage.testimonialsDisclaimer' })}
                      </p>
                    </div>
                  </div>
                </section>
                )}

                {/* ════════════════════════════════════════════════════════════
                    SECTION 6: AI COACHING TEASER
                    ════════════════════════════════════════════════════════════ */}
                {(tc?.visibility?.showAICoaching !== undefined
                  ? tc.visibility.showAICoaching !== false
                  : coachingConfig?.platformStatus !== false
                ) && (
                <section className={css.aiSection} ref={aiVis.ref}>
                  <div className={css.sectionContainer}>
                    <div className={css.aiGrid}>
                      {/* Left — Text */}
                      <div className={css.aiText}>
                        <span className={css.sectionLabel} style={{ textAlign: 'left', display: 'block' }}>
                          {coachingConfig?.platformName
                            ? intl.formatMessage({ id: 'LandingPage.ai.labelDynamic' }, { platform: coachingConfig.platformName })
                            : intl.formatMessage({ id: 'LandingPage.ai.label' })}
                        </span>
                        <h2 className={css.sectionTitle} style={{ textAlign: 'left' }}>
                          {intl.formatMessage({ id: 'LandingPage.ai.title' })}
                        </h2>
                        <p className={css.aiDescription}>
                          {intl.formatMessage({ id: 'LandingPage.ai.desc' })}
                        </p>

                        <div className={css.aiFeatures}>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon} aria-hidden="true">📝</div>
                            <div>
                              <h4>{intl.formatMessage({ id: 'LandingPage.ai.feature1Title' })}</h4>
                              <p>{intl.formatMessage({ id: 'LandingPage.ai.feature1Desc' })}</p>
                            </div>
                          </div>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon} aria-hidden="true">🎤</div>
                            <div>
                              <h4>{intl.formatMessage({ id: 'LandingPage.ai.feature2Title' })}</h4>
                              <p>{intl.formatMessage({ id: 'LandingPage.ai.feature2Desc' })}</p>
                            </div>
                          </div>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon} aria-hidden="true">🗺️</div>
                            <div>
                              <h4>{intl.formatMessage({ id: 'LandingPage.ai.feature3Title' })}</h4>
                              <p>{intl.formatMessage({ id: 'LandingPage.ai.feature3Desc' })}</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Coaching CTA — context-dependent */}
                        {isStudent && !isLoadingInstitution ? (
                          canAccessAICoaching ? (
                            <a
                              href={institutionInfo?.aiCoachingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css.btnPrimary}
                            >
                              {intl.formatMessage({ id: 'LandingPage.ai.ctaAccess' })}
                              <span aria-hidden="true"> →</span>
                            </a>
                          ) : (
                            <div className={css.coachingBlocked}>
                              <span className={css.blockedIcon} aria-hidden="true">🔒</span>
                              <p>{intl.formatMessage({ id: 'LandingPage.ai.ctaBlocked' })}</p>
                            </div>
                          )
                        ) : isLoadingCoaching ? (
                          <div className={css.btnPrimary} style={{ opacity: 0.5, pointerEvents: 'none' }}>
                            {intl.formatMessage({ id: 'LandingPage.ai.ctaLoading' })}
                          </div>
                        ) : coachingConfig?.platformUrl && coachingConfig?.platformStatus ? (
                          <a
                            href={coachingConfig.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css.btnPrimary}
                          >
                            {intl.formatMessage({ id: 'LandingPage.ai.ctaStart' })}
                            <span aria-hidden="true"> →</span>
                          </a>
                        ) : (
                          <NamedLink name="SignupPage" className={css.btnPrimary}>
                            {intl.formatMessage({ id: 'LandingPage.ai.ctaSignup' })}
                            <span aria-hidden="true"> →</span>
                          </NamedLink>
                        )}
                      </div>

                      {/* Right — Chat mockup */}
                      <div className={css.aiVisual} aria-hidden="true">
                        <div className={css.chatMockup}>
                          <div className={css.chatGlow} />
                          <div className={css.chatHeader}>
                            <div className={css.chatAvatar}>🤖</div>
                            <div className={css.chatHeaderText}>
                              <h4>{coachingConfig?.platformName || intl.formatMessage({ id: 'LandingPage.ai.chatTitle' })}</h4>
                              <span>● {intl.formatMessage({ id: 'LandingPage.ai.chatOnline' })}</span>
                            </div>
                          </div>
                          <div className={css.chatMessages}>
                            <div className={`${css.chatMessage} ${css.chatBot}`}>
                              <div className={css.messageBubble}>
                                {intl.formatMessage({ id: 'LandingPage.ai.chatMsg1' })}
                              </div>
                            </div>
                            <div className={`${css.chatMessage} ${css.chatUser}`}>
                              <div className={css.messageBubble}>
                                {intl.formatMessage({ id: 'LandingPage.ai.chatMsg2' })}
                              </div>
                            </div>
                            <div className={`${css.chatMessage} ${css.chatBot}`}>
                              <div className={css.messageBubble}>
                                {intl.formatMessage({ id: 'LandingPage.ai.chatMsg3' })}
                              </div>
                            </div>
                          </div>
                          <div className={css.chatInput}>
                            <input
                              type="text"
                              placeholder={intl.formatMessage({ id: 'LandingPage.ai.chatPlaceholder' })}
                              readOnly
                              tabIndex={-1}
                            />
                            <button tabIndex={-1} aria-label="Send">→</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                )}

                {/* ════════════════════════════════════════════════════════════
                    SECTION 7: CLOSING CTA — Triple path
                    ════════════════════════════════════════════════════════════ */}
                {sectionVisible('cta', 'showCTA') && (
                <section className={css.tripleCtaSection} ref={ctaVis.ref}>
                  {/* Company CTA */}
                  <div className={css.ctaCompanies}>
                    <h2 className={css.ctaTitle}>
                      {intl.formatMessage({ id: 'LandingPage.cta.companiesTitle' })}
                    </h2>
                    <ul className={css.ctaList}>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.companiesItem1' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.companiesItem2' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.companiesItem3' })}</li>
                    </ul>
                    <NamedLink name="SignupPage" className={css.ctaBtn}>
                      {intl.formatMessage({ id: 'LandingPage.cta.companiesBtn' })}
                      <span aria-hidden="true"> →</span>
                    </NamedLink>
                    <p className={css.ctaUrgency}>
                      {intl.formatMessage({ id: 'LandingPage.cta.companiesUrgency' })}
                    </p>
                  </div>

                  {/* Student CTA */}
                  <div className={css.ctaStudents}>
                    <h2 className={css.ctaTitle}>
                      {intl.formatMessage({ id: 'LandingPage.cta.studentsTitle' })}
                    </h2>
                    <ul className={css.ctaList}>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.studentsItem1' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.studentsItem2' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.studentsItem3' })}</li>
                    </ul>
                    <NamedLink name="SignupPage" className={css.ctaBtnAlt}>
                      {intl.formatMessage({ id: 'LandingPage.cta.studentsBtn' })}
                      <span aria-hidden="true"> →</span>
                    </NamedLink>
                    <p className={css.ctaUrgency}>
                      {intl.formatMessage({ id: 'LandingPage.cta.studentsUrgency' })}
                    </p>
                  </div>

                  {/* University CTA */}
                  <div className={css.ctaInstitutions}>
                    <h2 className={css.ctaTitle}>
                      {intl.formatMessage({ id: 'LandingPage.cta.universitiesTitle' })}
                    </h2>
                    <ul className={css.ctaList}>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.universitiesItem1' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.universitiesItem2' })}</li>
                      <li>{intl.formatMessage({ id: 'LandingPage.cta.universitiesItem3' })}</li>
                    </ul>
                    <a
                      href="https://calendly.com/tavares-brewington-street2ivy/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css.ctaBtnInstitution}
                    >
                      {intl.formatMessage({ id: 'LandingPage.cta.universitiesBtn' })}
                      <span aria-hidden="true"> →</span>
                    </a>
                    <p className={css.ctaUrgency}>
                      {intl.formatMessage({ id: 'LandingPage.cta.universitiesUrgency' })}
                    </p>
                  </div>
                </section>
                )}

                {/* ════════════════════════════════════════════════════════════
                    DISCLAIMER
                    ════════════════════════════════════════════════════════════ */}
                <p className={css.disclaimer}>
                  {intl.formatMessage({ id: 'LandingPage.disclaimer' })}
                </p>

              </Main>
              <Footer>
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </Page>
  );
};

LandingPageComponent.propTypes = {
  currentUser: object,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  return { currentUser };
};

const LandingPage = compose(connect(mapStateToProps))(LandingPageComponent);

export default LandingPage;
