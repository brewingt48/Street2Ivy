import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LayoutComposer, NamedLink, Page, HomeSkeletonLoader } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { fetchPublicContent, fetchPublicCoachingConfig, apiBaseUrl } from '../../util/api';
import { useTenant } from '../../context/tenantContext';
import { fetchHomeDataThunk, clearHomeData } from './LandingPage.duck';

import css from './LandingPage.module.css';

// Lazy-load authenticated home — code-split so anonymous visitors don't download it
const AuthenticatedHome = lazy(() =>
  import(/* webpackChunkName: "AuthenticatedHome" */ './AuthenticatedHome/AuthenticatedHome')
);

// Counter animation hook
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

// Street2Ivy Premium Landing Page
const LandingPageComponent = props => {
  const { currentUser, homeData, homeDataLoading, homeDataError, onFetchHomeData, onClearHomeData } = props;
  const intl = useIntl();
  const [dynamicContent, setDynamicContent] = useState(null);
  const [coachingConfig, setCoachingConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('companies');
  const [howItWorksTab, setHowItWorksTab] = useState('companies');
  const [visibleElements, setVisibleElements] = useState({});
  const [institutionInfo, setInstitutionInfo] = useState(null);
  const [isLoadingInstitution, setIsLoadingInstitution] = useState(true);

  const isAuthenticated = !!currentUser;
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isStudent = userType === 'student';

  // Fetch role-specific home data for authenticated users
  useEffect(() => {
    if (isAuthenticated && userType && onFetchHomeData) {
      onFetchHomeData({ userType, currentUser });
    }
    return () => {
      if (onClearHomeData) {
        onClearHomeData();
      }
    };
  }, [isAuthenticated, userType]); // Intentionally limited deps: only re-fetch when auth state or role changes

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleElements(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all animatable sections
    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
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
      });
  }, []);

  // Fetch institution info for logged-in students to check AI coaching access
  useEffect(() => {
    const fetchInstitutionInfo = async () => {
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
      fetchInstitutionInfo();
    } else {
      setIsLoadingInstitution(false);
    }
  }, [currentUser, isStudent]);

  // Determine if AI coaching should be accessible
  // For logged-in students: only if their institution has approved it
  // For non-students or logged-out users: show the marketing content with signup CTA
  const canAccessAICoaching = isStudent
    ? institutionInfo?.aiCoachingEnabled && institutionInfo?.aiCoachingUrl
    : true;

  const title = intl.formatMessage({ id: 'LandingPage.title' });
  const description = intl.formatMessage({ id: 'LandingPage.description' });

  // Get content from dynamic data or use static fallback
  const heroContent = dynamicContent?.hero || null;
  const brandingContent = dynamicContent?.branding || null;
  const featuresContent = dynamicContent?.features || null;
  const howItWorksContent = dynamicContent?.howItWorks || null;
  const testimonialsContent = dynamicContent?.testimonials || null;
  const ctaContent = dynamicContent?.cta || null;
  const statisticsContent = dynamicContent?.statistics || null;
  const aiCoachingContent = dynamicContent?.aiCoaching || null;

  // Section visibility — checks both global isActive (System Admin) and tenant-specific visibility (Education Admin)
  const tenant = useTenant();
  const isSectionVisible = (sectionKey) => {
    const globalActive = dynamicContent?.[sectionKey]?.isActive !== false;
    const tenantVisible = tenant?.sectionVisibility?.[sectionKey] !== false;
    return globalActive && tenantVisible;
  };

  // Multi-tenant awareness
  const tenantName = tenant?.name || null;
  const corporatePartnersEnabled = tenant?.corporatePartnersEnabled !== false;

  // Get dynamic stats values or use defaults
  const statsItems = statisticsContent?.items || [];
  const stat1 = statsItems.find(s => s.id === 'stat-1') || { value: 5000, label: 'Students', suffix: '+' };
  const stat2 = statsItems.find(s => s.id === 'stat-2') || { value: 850, label: 'Projects Completed', suffix: '+' };
  const stat3 = statsItems.find(s => s.id === 'stat-3') || { value: 200, label: 'Partner Companies', suffix: '+' };
  const stat4 = statsItems.find(s => s.id === 'stat-4') || { value: 4.9, label: 'Average Rating', suffix: '★' };

  // Stats counter hooks - use dynamic values
  const studentsCount = useCountUp(stat1.value);
  const projectsCount = useCountUp(stat2.value);
  const companiesCount = useCountUp(stat3.value);
  const ratingCount = useCountUp(stat4.value);

  // Benefits for Companies
  const companyBenefits = [
    {
      icon: '⚡',
      title: intl.formatMessage({ id: 'LandingPage.feature2Title' }),
      description: intl.formatMessage({ id: 'LandingPage.feature2Description' }),
    },
    {
      icon: '💡',
      title: 'Fresh Thinking from Emerging Pros',
      description: 'Get perspectives unfiltered by corporate groupthink. Students bring current skills and hungry energy.'
    },
    {
      icon: '💰',
      title: 'Project-Based — Pay for Results',
      description: 'No seats to fill, no time to track. You define the project. You get results. Simple.'
    },
    {
      icon: '🌱',
      title: 'Build Your Future Pipeline',
      description: 'Work with talent before you hire them. Convert top performers into full-time hires when you\'re ready.'
    }
  ];

  // Benefits for Students
  const studentBenefits = [
    {
      icon: '🎯',
      title: 'Get Hired for What You Can Do',
      description: 'Your school\'s name doesn\'t matter here. Your skills, your work, your results — that\'s what opens doors.'
    },
    {
      icon: '🤖',
      title: 'AI Career Coach, 24/7',
      description: 'Personalized guidance for resumes, interviews, and career strategy — whenever you need it.'
    },
    {
      icon: '📁',
      title: 'Build a Portfolio That Opens Doors',
      description: 'Real projects, real companies, real results. Show what you\'ve done, not just what you\'ve studied.'
    },
    {
      icon: '💵',
      title: 'Earn While You Learn',
      description: 'Get paid for meaningful work that builds your career — not coffee runs or filing papers.'
    }
  ];

  // Benefits for Educational Institutions
  const institutionBenefits = [
    {
      icon: '📈',
      title: 'Boost Graduate Outcomes',
      description: 'Improve placement rates and career readiness metrics without building new infrastructure or hiring more staff.'
    },
    {
      icon: '🔗',
      title: 'Corporate Partnership Pipeline',
      description: 'Connect your institution directly with companies actively seeking student talent for real projects.'
    },
    {
      icon: '🤖',
      title: 'AI-Powered Career Services',
      description: 'Give every student access to 24/7 personalized career coaching — resume help, interview prep, and career pathing.'
    },
    {
      icon: '📊',
      title: 'Real-Time Analytics Dashboard',
      description: 'Track student engagement, project completions, and placement outcomes with comprehensive reporting tools.'
    }
  ];

  // Trust points — "Your Work Stays Yours"
  const trustPoints = [
    {
      icon: '🔒',
      title: intl.formatMessage({ id: 'LandingPage.trustNoData' }),
      description: intl.formatMessage({ id: 'LandingPage.trustNoDataDesc' }),
    },
    {
      icon: '📋',
      title: intl.formatMessage({ id: 'LandingPage.trustNoLegal' }),
      description: intl.formatMessage({ id: 'LandingPage.trustNoLegalDesc' }),
    },
    {
      icon: '🛠️',
      title: intl.formatMessage({ id: 'LandingPage.trustYourTools' }),
      description: intl.formatMessage({ id: 'LandingPage.trustYourToolsDesc' }),
    },
    {
      icon: '⭐',
      title: intl.formatMessage({ id: 'LandingPage.trustVerified' }),
      description: intl.formatMessage({ id: 'LandingPage.trustVerifiedDesc' }),
    },
    {
      icon: '🎯',
      title: intl.formatMessage({ id: 'LandingPage.trustTry' }),
      description: intl.formatMessage({ id: 'LandingPage.trustTryDesc' }),
    },
  ];

  // How It Works — 5 steps per audience
  const howItWorksSteps = {
    companies: [
      { title: intl.formatMessage({ id: 'LandingPage.howCompanyStep1Title' }), desc: intl.formatMessage({ id: 'LandingPage.howCompanyStep1Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howCompanyStep2Title' }), desc: intl.formatMessage({ id: 'LandingPage.howCompanyStep2Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howCompanyStep3Title' }), desc: intl.formatMessage({ id: 'LandingPage.howCompanyStep3Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howCompanyStep4Title' }), desc: intl.formatMessage({ id: 'LandingPage.howCompanyStep4Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howCompanyStep5Title' }), desc: intl.formatMessage({ id: 'LandingPage.howCompanyStep5Desc' }) },
    ],
    students: [
      { title: intl.formatMessage({ id: 'LandingPage.howStudentStep1Title' }), desc: intl.formatMessage({ id: 'LandingPage.howStudentStep1Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howStudentStep2Title' }), desc: intl.formatMessage({ id: 'LandingPage.howStudentStep2Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howStudentStep3Title' }), desc: intl.formatMessage({ id: 'LandingPage.howStudentStep3Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howStudentStep4Title' }), desc: intl.formatMessage({ id: 'LandingPage.howStudentStep4Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howStudentStep5Title' }), desc: intl.formatMessage({ id: 'LandingPage.howStudentStep5Desc' }) },
    ],
    universities: [
      { title: intl.formatMessage({ id: 'LandingPage.howUniStep1Title' }), desc: intl.formatMessage({ id: 'LandingPage.howUniStep1Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howUniStep2Title' }), desc: intl.formatMessage({ id: 'LandingPage.howUniStep2Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howUniStep3Title' }), desc: intl.formatMessage({ id: 'LandingPage.howUniStep3Desc' }) },
      { title: intl.formatMessage({ id: 'LandingPage.howUniStep4Title' }), desc: intl.formatMessage({ id: 'LandingPage.howUniStep4Desc' }) },
      // University only has 4 steps
    ],
  };

  // Value propositions per audience
  const valueProps = {
    students: {
      heading: intl.formatMessage({ id: 'LandingPage.valueStudentsHeading' }),
      points: [
        intl.formatMessage({ id: 'LandingPage.valueStudentsP1' }),
        intl.formatMessage({ id: 'LandingPage.valueStudentsP2' }),
        intl.formatMessage({ id: 'LandingPage.valueStudentsP3' }),
        intl.formatMessage({ id: 'LandingPage.valueStudentsP4' }),
      ],
    },
    companies: {
      heading: intl.formatMessage({ id: 'LandingPage.valueCompaniesHeading' }),
      points: [
        intl.formatMessage({ id: 'LandingPage.valueCompaniesP1' }),
        intl.formatMessage({ id: 'LandingPage.valueCompaniesP2' }),
        intl.formatMessage({ id: 'LandingPage.valueCompaniesP3' }),
        intl.formatMessage({ id: 'LandingPage.valueCompaniesP4' }),
      ],
    },
    universities: {
      heading: intl.formatMessage({ id: 'LandingPage.valueUnisHeading' }),
      points: [
        intl.formatMessage({ id: 'LandingPage.valueUnisP1' }),
        intl.formatMessage({ id: 'LandingPage.valueUnisP2' }),
        intl.formatMessage({ id: 'LandingPage.valueUnisP3' }),
        intl.formatMessage({ id: 'LandingPage.valueUnisP4' }),
      ],
    },
  };

  // Testimonials - use dynamic or static
  const staticTestimonials = [
    {
      quote: 'We needed a competitive analysis done fast, and hiring a consultant would have cost 10x more. The student we worked with delivered insights our strategy team is still referencing six months later.',
      author: 'Michael Chen',
      role: 'VP of Strategy, Growth Ventures LLC',
      avatar: '👨‍💼'
    },
    {
      quote: 'I go to a state school nobody\'s heard of. Before Street2Ivy, I couldn\'t even get interviews. Now I have three completed projects on my resume and a standing offer from a Series B startup.',
      author: 'Jasmine Rodriguez',
      role: 'Junior, Marketing Major',
      avatar: '👩‍🎓'
    },
    {
      quote: 'Our career services team can\'t be available 24/7, but the AI coaching can. It\'s transformed how our students prepare for interviews and build their professional brand.',
      author: 'Dr. Lisa Anderson',
      role: 'Dean of Career Services, Metro State University',
      avatar: '👩‍🏫'
    }
  ];

  const testimonials = testimonialsContent?.items?.slice(0, 3).map(t => ({
    quote: t.quote,
    author: t.author,
    role: t.role,
    avatar: t.role?.includes('Student') || t.role?.includes('Junior') || t.role?.includes('Graduate') ? '👩‍🎓'
      : t.role?.includes('Dean') || t.role?.includes('Professor') || t.role?.includes('University') ? '👩‍🏫'
      : '👨‍💼'
  })) || staticTestimonials;

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
                {/* ============ Authenticated Home vs Marketing Landing ============ */}
                {isAuthenticated ? (
                  <Suspense fallback={<HomeSkeletonLoader />}>
                    <AuthenticatedHome
                      currentUser={currentUser}
                      userType={userType}
                      homeData={homeData}
                      homeDataLoading={homeDataLoading}
                      homeDataError={homeDataError}
                      coachingConfig={coachingConfig}
                      institutionInfo={institutionInfo}
                      isLoadingInstitution={isLoadingInstitution}
                    />
                  </Suspense>
                ) : (
                <>
                {/* ================ Hero Section ================ */}
                {isSectionVisible('hero') && <section
                  className={css.heroSection}
                  style={heroContent?.backgroundImage ? {
                    backgroundImage: `linear-gradient(135deg, rgba(12, 20, 48, 0.92) 0%, rgba(26, 39, 68, 0.88) 50%, rgba(30, 58, 95, 0.85) 100%), url(${heroContent.backgroundImage.startsWith('/api/') ? apiBaseUrl() + heroContent.backgroundImage : heroContent.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {/* Animated particles */}
                  <div className={css.heroParticles}>
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={css.particle}
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 20}s`,
                          animationDuration: `${15 + Math.random() * 10}s`
                        }}
                      />
                    ))}
                  </div>

                  {/* Background Video (if set) */}
                  {heroContent?.backgroundType === 'video' && heroContent?.backgroundVideo && (
                    <video
                      className={css.heroBackgroundVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    >
                      <source src={heroContent.backgroundVideo} type="video/mp4" />
                    </video>
                  )}

                  <div className={css.heroGrid}>
                    {/* Left side - Content */}
                    <div className={css.heroContent}>
                      {/* Multi-tenant: show school-specific badge */}
                      {tenantName ? (
                        <div className={css.heroBadge}>
                          <span className={css.badgeDot} />
                          {intl.formatMessage({ id: 'LandingPage.tenantHeroPrefix' }, { schoolName: tenantName })}
                        </div>
                      ) : (
                        <div className={css.heroBadge}>
                          <span className={css.badgeDot} />
                          <FormattedMessage id="LandingPage.heroBadge" />
                        </div>
                      )}
                      <h1 className={css.heroTitle}>
                        {heroContent?.title ? (
                          <>
                            {heroContent.title.split(' ').slice(0, -2).join(' ')}{' '}
                            <span className={css.heroTitleGradient}>
                              {heroContent.title.split(' ').slice(-2).join(' ')}
                            </span>
                          </>
                        ) : (
                          <>
                            <FormattedMessage id="LandingPage.heroTitle" />
                          </>
                        )}
                      </h1>
                      <p className={css.heroSubtitle}>
                        {heroContent?.subtitle || intl.formatMessage({ id: 'LandingPage.heroSubtitle' })}
                      </p>

                      {/* Multi-tenant: show "Powered by Street2Ivy" */}
                      {tenantName && (
                        <p className={css.tenantPoweredBy}>
                          <FormattedMessage id="LandingPage.tenantPoweredBy" />
                        </p>
                      )}

                      {/* Hero CTA — Book a Demo */}
                      <div className={css.heroButtons}>
                        {!isAuthenticated ? (
                          <a
                            href="https://calendly.com/tavares-brewington-street2ivy/demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css.btnPrimary}
                          >
                            Book a Demo →
                          </a>
                        ) : (
                          <NamedLink name="SearchPage" className={css.btnPrimary}>
                            <FormattedMessage id="LandingPage.browseProjects" /> →
                          </NamedLink>
                        )}
                      </div>

                      {/* User Type Quick Links */}
                      {!isAuthenticated && (
                        <div className={css.userTypeLinks}>
                          <span className={css.userTypeLinkLabel}>
                            <FormattedMessage id="LandingPage.iAmA" />
                          </span>
                          {corporatePartnersEnabled && (
                            <a href="#why-section" className={css.userTypeLink} onClick={() => setActiveTab('companies')}>
                              <FormattedMessage id="LandingPage.iAmCompany" />
                            </a>
                          )}
                          <a href="#why-section" className={css.userTypeLink} onClick={() => setActiveTab('students')}>
                            <FormattedMessage id="LandingPage.iAmStudent" />
                          </a>
                          <a href="#why-section" className={css.userTypeLink} onClick={() => setActiveTab('institutions')}>
                            <FormattedMessage id="LandingPage.iAmInstitution" />
                          </a>
                          {/* Multi-tenant: alumni CTA */}
                          {tenantName && (
                            <a href="#why-section" className={css.userTypeLink} onClick={() => setActiveTab('companies')}>
                              {intl.formatMessage({ id: 'LandingPage.tenantAlumniCta' }, { schoolName: tenantName })}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side - Visual */}
                    <div className={css.heroVisual}>
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
                </section>}

                {/* ================ Why Street2Ivy Section (Features) ================ */}
                {isSectionVisible('features') && <section className={css.whySection} id="why-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>
                      <FormattedMessage id="LandingPage.theOpportunity" />
                    </span>
                    <h2 className={css.sectionTitle}>
                      {featuresContent?.sectionTitle || intl.formatMessage({ id: 'LandingPage.whyStreet2Ivy' })}
                    </h2>
                    <p className={css.sectionSubtitle}>
                      <FormattedMessage id="LandingPage.whySubtitle" />
                    </p>

                    {/* Toggle Tabs */}
                    <div className={css.toggleTabs}>
                      {corporatePartnersEnabled && (
                        <button
                          className={`${css.toggleTab} ${activeTab === 'companies' ? css.toggleTabActive : ''}`}
                          onClick={() => setActiveTab('companies')}
                        >
                          <FormattedMessage id="LandingPage.forCompanies" />
                        </button>
                      )}
                      <button
                        className={`${css.toggleTab} ${activeTab === 'students' ? css.toggleTabActive : ''}`}
                        onClick={() => setActiveTab('students')}
                      >
                        <FormattedMessage id="LandingPage.forStudents" />
                      </button>
                      <button
                        className={`${css.toggleTab} ${activeTab === 'institutions' ? css.toggleTabActive : ''}`}
                        onClick={() => setActiveTab('institutions')}
                      >
                        <FormattedMessage id="LandingPage.forInstitutions" />
                      </button>
                    </div>

                    {/* Benefits Grid */}
                    <div className={`${css.benefitsGrid} ${visibleElements['why-section'] ? css.visible : ''}`}>
                      {(activeTab === 'companies' ? companyBenefits :
                        activeTab === 'students' ? studentBenefits :
                        institutionBenefits).map((benefit, index) => (
                        <div
                          key={index}
                          className={css.benefitCard}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className={css.benefitIcon}>{benefit.icon}</div>
                          <h3 className={css.benefitTitle}>{benefit.title}</h3>
                          <p className={css.benefitDescription}>{benefit.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>}

                {/* ================ How It Works Section — 3 Tabs, 5 Steps ================ */}
                {isSectionVisible('howItWorks') && <section className={css.howSection} id="how-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>
                      <FormattedMessage id="LandingPage.theProcess" />
                    </span>
                    <h2 className={css.sectionTitle}>
                      {howItWorksContent?.sectionTitle || intl.formatMessage({ id: 'LandingPage.howItWorks' })}
                    </h2>
                    <p className={css.sectionSubtitle}>
                      <FormattedMessage id="LandingPage.howSubtitle" />
                    </p>

                    {/* How It Works Tabs */}
                    <div className={css.toggleTabs}>
                      {corporatePartnersEnabled && (
                        <button
                          className={`${css.toggleTab} ${howItWorksTab === 'companies' ? css.toggleTabActive : ''}`}
                          onClick={() => setHowItWorksTab('companies')}
                        >
                          🏢 <FormattedMessage id="LandingPage.forCompanies" />
                        </button>
                      )}
                      <button
                        className={`${css.toggleTab} ${howItWorksTab === 'students' ? css.toggleTabActive : ''}`}
                        onClick={() => setHowItWorksTab('students')}
                      >
                        🎓 <FormattedMessage id="LandingPage.forStudents" />
                      </button>
                      <button
                        className={`${css.toggleTab} ${howItWorksTab === 'universities' ? css.toggleTabActive : ''}`}
                        onClick={() => setHowItWorksTab('universities')}
                      >
                        🏛️ <FormattedMessage id="LandingPage.forInstitutions" />
                      </button>
                    </div>

                    {/* Steps for active tab */}
                    <div className={css.howStepsContainer}>
                      <div className={css.howSteps}>
                        <div className={css.stepsLine} />
                        {(howItWorksSteps[howItWorksTab] || []).map((step, index) => (
                          <div
                            key={`${howItWorksTab}-${index}`}
                            className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`}
                            style={{ animationDelay: `${index * 0.15}s` }}
                          >
                            <div className={css.stepNumber}>{index + 1}</div>
                            <div className={css.stepContent}>
                              <h4>{step.title}</h4>
                              <p>{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>}

                {/* ================ Trust / Differentiation Section ================ */}
                <section className={css.trustSection} id="trust-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabelLight}>
                      <FormattedMessage id="LandingPage.trustSubheading" />
                    </span>
                    <h2 className={css.sectionTitleLight}>
                      <FormattedMessage id="LandingPage.trustHeading" />
                    </h2>

                    <div className={`${css.trustGrid} ${visibleElements['trust-section'] ? css.visible : ''}`}>
                      {trustPoints.map((point, index) => (
                        <div
                          key={index}
                          className={css.trustCard}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className={css.trustIcon}>{point.icon}</div>
                          <h3 className={css.trustCardTitle}>{point.title}</h3>
                          <p className={css.trustCardDesc}>{point.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ================ Value Propositions Section ================ */}
                <section className={css.valuePropsSection} id="value-props-section" data-animate>
                  <div className={css.sectionContainer}>
                    {/* Students Value Prop */}
                    <div className={`${css.valuePropRow} ${visibleElements['value-props-section'] ? css.visible : ''}`}>
                      <div className={css.valuePropIcon}>🎓</div>
                      <div className={css.valuePropContent}>
                        <h3 className={css.valuePropHeading}>{valueProps.students.heading}</h3>
                        <ul className={css.valuePropList}>
                          {valueProps.students.points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                        <a
                          href="https://calendly.com/tavares-brewington-street2ivy/demo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={css.valuePropCta}
                        >
                          Book a Demo →
                        </a>
                      </div>
                    </div>

                    {/* Companies Value Prop */}
                    {corporatePartnersEnabled && (
                      <div className={`${css.valuePropRow} ${css.valuePropRowReverse} ${visibleElements['value-props-section'] ? css.visible : ''}`}>
                        <div className={css.valuePropIcon}>🏢</div>
                        <div className={css.valuePropContent}>
                          <h3 className={css.valuePropHeading}>{valueProps.companies.heading}</h3>
                          <ul className={css.valuePropList}>
                            {valueProps.companies.points.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                          <a
                            href="https://calendly.com/tavares-brewington-street2ivy/demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css.valuePropCta}
                          >
                            Book a Demo →
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Universities Value Prop */}
                    <div className={`${css.valuePropRow} ${visibleElements['value-props-section'] ? css.visible : ''}`}>
                      <div className={css.valuePropIcon}>🏛️</div>
                      <div className={css.valuePropContent}>
                        <h3 className={css.valuePropHeading}>{valueProps.universities.heading}</h3>
                        <ul className={css.valuePropList}>
                          {valueProps.universities.points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                        <a
                          href="https://calendly.com/tavares-brewington-street2ivy/demo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={css.valuePropCta}
                        >
                          <FormattedMessage id="LandingPage.ctaUnisBtn" />
                        </a>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ================ AI Career Coaching Section ================ */}
                {isSectionVisible('aiCoaching') && <section className={css.aiSection} id="ai-section" data-animate>
                  <div className={css.sectionContainer}>
                    <div className={css.aiGrid}>
                      {/* Left - Text Content */}
                      <div className={css.aiText}>
                        <span className={css.sectionLabel}>
                          {coachingConfig?.platformName ? `Powered by ${coachingConfig.platformName}` : 'Powered by AI Career Coaching'}
                        </span>
                        <h2 className={css.sectionTitle} style={{ textAlign: 'left' }}>
                          {aiCoachingContent?.sectionTitle || intl.formatMessage({ id: 'LandingPage.aiCoachingHeading' })}
                        </h2>
                        <p className={css.aiDescription}>
                          {aiCoachingContent?.description || intl.formatMessage({ id: 'LandingPage.aiCoachingDesc' })}
                        </p>

                        <div className={css.aiFeatures}>
                          {(aiCoachingContent?.features || [
                            { icon: '📝', title: 'Resume & Application Review', description: 'Get instant feedback to stand out in any application' },
                            { icon: '🎤', title: 'Interview Preparation', description: 'Practice with AI-simulated career coaching interviews tailored to your target roles' },
                            { icon: '🗺️', title: 'Career Path Planning', description: 'Map out your trajectory based on skills, interests, and market trends' },
                          ]).map((feature, idx) => (
                            <div key={feature.id || idx} className={css.aiFeature}>
                              <div className={css.aiFeatureIcon}>{feature.icon}</div>
                              <div>
                                <h4>{feature.title}</h4>
                                <p>{feature.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Coaching CTA - different behavior based on user state */}
                        {isStudent && !isLoadingInstitution ? (
                          // Logged-in student: check institution approval
                          canAccessAICoaching ? (
                            <a
                              href={institutionInfo?.aiCoachingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css.btnPrimary}
                            >
                              {aiCoachingContent?.ctaLoggedIn || 'Access AI Career Coaching →'}
                            </a>
                          ) : (
                            <div className={css.coachingBlocked}>
                              <span className={css.blockedIcon}>🔒</span>
                              <p>{aiCoachingContent?.ctaBlocked || 'AI Career Coaching is available when your institution enables this feature. Contact your career services office for more information.'}</p>
                            </div>
                          )
                        ) : coachingConfig?.platformUrl && coachingConfig?.platformStatus ? (
                          // Non-student with coaching configured
                          <a
                            href={coachingConfig.platformUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css.btnPrimary}
                          >
                            {aiCoachingContent?.ctaLoggedOut || 'Get Started with Coaching →'}
                          </a>
                        ) : (
                          // Not logged in - show signup CTA
                          <NamedLink name="SignupPage" className={css.btnPrimary}>
                            {aiCoachingContent?.ctaLoggedOut || 'Get Started with Career Coaching →'}
                          </NamedLink>
                        )}
                      </div>

                      {/* Right - Chat Mockup */}
                      <div className={css.aiVisual}>
                        <div className={css.chatMockup}>
                          <div className={css.chatGlow} />
                          <div className={css.chatHeader}>
                            <div className={css.chatAvatar}>🤖</div>
                            <div className={css.chatHeaderText}>
                              <h4>{coachingConfig?.platformName || 'AI Career Coach'}</h4>
                              <span>● Online</span>
                            </div>
                          </div>
                          <div className={css.chatMessages}>
                            {(aiCoachingContent?.chatMessages || [
                              { role: 'bot', text: "Hi Sarah! I reviewed your resume. Your data analysis experience is strong, but let's highlight your Python skills more prominently for fintech roles. Want me to suggest some rewrites?" },
                              { role: 'user', text: "Yes please! I'm applying to FinFlow's project today." },
                              { role: 'bot', text: "Great choice! Here's a tailored version that emphasizes the exact skills they're looking for. I also noticed they value \"growth mindset\" — let's add a bullet about how you taught yourself SQL in two weeks..." },
                            ]).map((msg, idx) => (
                              <div key={idx} className={`${css.chatMessage} ${msg.role === 'bot' ? css.chatBot : css.chatUser}`}>
                                <div className={css.messageBubble}>
                                  {msg.text}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className={css.chatInput}>
                            <input type="text" placeholder="Ask anything about your career..." readOnly />
                            <button>→</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>}

                {/* ================ Stats Section ================ */}
                {isSectionVisible('statistics') && <section className={css.statsSection} id="stats-section" data-animate>
                  <div className={css.sectionContainer}>
                    <div className={css.statsGrid}>
                      <div className={css.statItem} ref={studentsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{studentsCount.count.toLocaleString()}</span>{stat1.suffix}
                        </div>
                        <div className={css.statLabel}>{stat1.label}</div>
                      </div>
                      <div className={css.statItem} ref={projectsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{projectsCount.count.toLocaleString()}</span>{stat2.suffix}
                        </div>
                        <div className={css.statLabel}>{stat2.label}</div>
                      </div>
                      <div className={css.statItem} ref={companiesCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{companiesCount.count.toLocaleString()}</span>{stat3.suffix}
                        </div>
                        <div className={css.statLabel}>{stat3.label}</div>
                      </div>
                      <div className={css.statItem} ref={ratingCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{ratingCount.count}</span>{stat4.suffix}
                        </div>
                        <div className={css.statLabel}>{stat4.label}</div>
                      </div>
                    </div>
                  </div>
                </section>}

                {/* ================ Testimonials Section ================ */}
                {isSectionVisible('testimonials') && <section className={css.testimonialsSection} id="testimonials-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>
                      <FormattedMessage id="LandingPage.successStories" />
                    </span>
                    <h2 className={css.sectionTitle}>
                      {testimonialsContent?.sectionTitle || intl.formatMessage({ id: 'LandingPage.testimonialsTitle' })}
                    </h2>
                    <p className={css.sectionSubtitle}>
                      <FormattedMessage id="LandingPage.testimonialsSubtitle" />
                    </p>

                    <div className={css.testimonialsGrid}>
                      {testimonials.map((testimonial, index) => (
                        <div
                          key={index}
                          className={`${css.testimonialCard} ${visibleElements['testimonials-section'] ? css.visible : ''}`}
                          style={{ animationDelay: `${index * 0.2}s` }}
                        >
                          <div className={css.testimonialQuoteMark}>"</div>
                          <p className={css.testimonialQuote}>{testimonial.quote}</p>
                          <div className={css.testimonialAuthor}>
                            <div className={css.authorAvatar}>{testimonial.avatar}</div>
                            <div className={css.authorInfo}>
                              <h5 className={css.authorName}>{testimonial.author}</h5>
                              <span className={css.authorRole}>{testimonial.role}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>}

                {/* ================ Final Triple CTA Section ================ */}
                {isSectionVisible('cta') && <section className={css.tripleCtaSection}>
                  {/* Companies CTA */}
                  {corporatePartnersEnabled && (
                    <div className={css.ctaCompanies}>
                      <h3 className={css.ctaCardHeading}>
                        <FormattedMessage id="LandingPage.ctaCompaniesHeading" />
                      </h3>
                      <p className={css.ctaCardDesc}>
                        <FormattedMessage id="LandingPage.ctaCompaniesDesc" />
                      </p>
                      <a
                        href="https://calendly.com/tavares-brewington-street2ivy/demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css.ctaBtn}
                      >
                        Book a Demo →
                      </a>
                    </div>
                  )}

                  {/* Students CTA */}
                  <div className={css.ctaStudents}>
                    <h3 className={css.ctaCardHeading}>
                      <FormattedMessage id="LandingPage.ctaStudentsHeading" />
                    </h3>
                    <p className={css.ctaCardDesc}>
                      <FormattedMessage id="LandingPage.ctaStudentsDesc" />
                    </p>
                    <a
                      href="https://calendly.com/tavares-brewington-street2ivy/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css.ctaBtnAlt}
                    >
                      Book a Demo →
                    </a>
                  </div>

                  {/* Universities CTA */}
                  <div className={css.ctaInstitutions}>
                    <h3 className={css.ctaCardHeading}>
                      <FormattedMessage id="LandingPage.ctaUnisHeading" />
                    </h3>
                    <p className={css.ctaCardDesc}>
                      <FormattedMessage id="LandingPage.ctaUnisDesc" />
                    </p>
                    <a
                      href="https://calendly.com/tavares-brewington-street2ivy/demo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css.ctaBtnInstitution}
                    >
                      Book a Demo →
                    </a>
                  </div>
                </section>}
                </>
                )}
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
  const { homeData, homeDataLoading, homeDataError } = state.LandingPage || {};
  return { currentUser, homeData, homeDataLoading, homeDataError };
};

const mapDispatchToProps = dispatch => ({
  onFetchHomeData: ({ userType, currentUser }) =>
    dispatch(fetchHomeDataThunk({ userType, currentUser })),
  onClearHomeData: () => dispatch(clearHomeData()),
});

const LandingPage = compose(connect(mapStateToProps, mapDispatchToProps))(LandingPageComponent);

export default LandingPage;
