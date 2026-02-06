import React, { useState, useEffect, useRef } from 'react';
import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LayoutComposer, NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { fetchPublicContent } from '../../util/api';

import css from './LandingPage.module.css';

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
  const { currentUser } = props;
  const intl = useIntl();
  const [showVideo, setShowVideo] = useState(false);
  const [dynamicContent, setDynamicContent] = useState(null);
  const [activeTab, setActiveTab] = useState('companies');
  const [visibleElements, setVisibleElements] = useState({});

  const isAuthenticated = !!currentUser;

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

  const title = intl.formatMessage({ id: 'LandingPage.title' });
  const description = intl.formatMessage({ id: 'LandingPage.description' });

  // Get content from dynamic data or use static fallback
  const heroContent = dynamicContent?.hero || null;
  const brandingContent = dynamicContent?.branding || null;

  // Stats counter hooks
  const studentsCount = useCountUp(5000);
  const projectsCount = useCountUp(850);
  const companiesCount = useCountUp(200);
  const ratingCount = useCountUp(4.9);

  // Benefits for Companies
  const companyBenefits = [
    {
      icon: '⚡',
      title: 'Flexible Talent, Zero Overhead',
      description: 'Scale your workforce on demand. No benefits packages, no office space, no long-term commitments.'
    },
    {
      icon: '💡',
      title: 'Fresh Thinking from Emerging Pros',
      description: 'Get perspectives unfiltered by corporate groupthink. Students bring current skills and hungry energy.'
    },
    {
      icon: '💰',
      title: 'Project-Based — Pay for Results',
      description: 'No seats to fill, no time to track. You define the project. You get the deliverable. Simple.'
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

  // Sample projects for marketplace preview
  const sampleProjects = [
    {
      id: 1,
      company: 'Growth Ventures LLC',
      type: 'Series A Startup',
      logo: '📊',
      title: 'Market Research Analysis for CPG Brand Expansion',
      tags: ['Market Research', 'Data Analysis', 'Excel'],
      compensation: '$800 - $1,200'
    },
    {
      id: 2,
      company: 'FinFlow Technologies',
      type: 'FinTech Startup',
      logo: '💳',
      title: 'Social Media Campaign Strategy & Content Creation',
      tags: ['Social Media', 'Content Strategy', 'Copywriting'],
      compensation: '$600 - $900'
    },
    {
      id: 3,
      company: 'Nexus Capital Partners',
      type: 'Venture Capital',
      logo: '🚀',
      title: 'Financial Modeling for Series A Investment Thesis',
      tags: ['Financial Modeling', 'Valuation', 'PowerPoint'],
      compensation: '$1,000 - $1,500'
    }
  ];

  // Testimonials
  const testimonials = [
    {
      quote: 'We needed a competitive analysis done fast, and hiring a consultant would have cost 10x more. The student we worked with delivered insights our strategy team is still referencing six months later. We\'ve since hired her full-time.',
      author: 'Michael Chen',
      role: 'VP of Strategy, Growth Ventures LLC',
      avatar: '👨‍💼'
    },
    {
      quote: 'I go to a state school nobody\'s heard of. Before Street2Ivy, I couldn\'t even get interviews. Now I have three completed projects on my resume and a standing offer from a Series B startup. This platform changed my trajectory.',
      author: 'Jasmine Rodriguez',
      role: 'Junior, Marketing Major',
      avatar: '👩‍🎓'
    }
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
                {/* ================ Hero Section ================ */}
                <section
                  className={css.heroSection}
                  style={heroContent?.backgroundImage ? {
                    backgroundImage: `linear-gradient(135deg, rgba(12, 20, 48, 0.92) 0%, rgba(26, 39, 68, 0.88) 50%, rgba(30, 58, 95, 0.85) 100%), url(${heroContent.backgroundImage})`,
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
                      <div className={css.heroBadge}>
                        <span className={css.badgeDot} />
                        Now Accepting Early Access Applications
                      </div>
                      <h1 className={css.heroTitle}>
                        The Best Talent Isn't Always{' '}
                        <span className={css.heroTitleGradient}>Where You're Looking</span>
                      </h1>
                      <p className={css.heroSubtitle}>
                        Street2Ivy connects ambitious companies with high-performing college students
                        for real project work. No legacy recruiting. No overhead. Just results.
                      </p>
                      <div className={css.heroButtons}>
                        <NamedLink name="SignupPage" className={css.btnPrimary}>
                          I'm a Company →
                        </NamedLink>
                        <NamedLink name="SignupPage" className={css.btnSecondary}>
                          I'm a Student →
                        </NamedLink>
                      </div>
                    </div>

                    {/* Right side - Visual */}
                    <div className={css.heroVisual}>
                      <div className={css.connectionGraphic}>
                        <div className={css.orbitRing} />
                        <div className={css.orbitRing2} />
                        <div className={`${css.node} ${css.nodeCorporate}`}>🏢</div>
                        <div className={`${css.node} ${css.nodeProject}`}>🚀</div>
                        <div className={`${css.node} ${css.nodeStudent}`}>🎓</div>
                        <div className={`${css.connectionLine} ${css.line1}`} />
                        <div className={`${css.connectionLine} ${css.line2}`} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ================ Why Street2Ivy Section ================ */}
                <section className={css.whySection} id="why-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>The Opportunity</span>
                    <h2 className={css.sectionTitle}>Why Street2Ivy?</h2>
                    <p className={css.sectionSubtitle}>
                      A talent marketplace built on mutual value. Everyone wins when potential meets opportunity.
                    </p>

                    {/* Toggle Tabs */}
                    <div className={css.toggleTabs}>
                      <button
                        className={`${css.toggleTab} ${activeTab === 'companies' ? css.toggleTabActive : ''}`}
                        onClick={() => setActiveTab('companies')}
                      >
                        For Companies
                      </button>
                      <button
                        className={`${css.toggleTab} ${activeTab === 'students' ? css.toggleTabActive : ''}`}
                        onClick={() => setActiveTab('students')}
                      >
                        For Students
                      </button>
                    </div>

                    {/* Benefits Grid */}
                    <div className={`${css.benefitsGrid} ${visibleElements['why-section'] ? css.visible : ''}`}>
                      {(activeTab === 'companies' ? companyBenefits : studentBenefits).map((benefit, index) => (
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
                </section>

                {/* ================ How It Works Section ================ */}
                <section className={css.howSection} id="how-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>The Process</span>
                    <h2 className={css.sectionTitle}>How It Works</h2>
                    <p className={css.sectionSubtitle}>
                      Simple, streamlined, and built for results.
                    </p>

                    <div className={css.howGrid}>
                      {/* Companies Column */}
                      <div className={css.howColumn}>
                        <h3 className={css.howColumnTitle}>
                          <span className={css.howColumnIcon}>🏢</span>
                          For Companies
                        </h3>
                        <div className={css.howSteps}>
                          <div className={css.stepsLine} />
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`}>
                            <div className={css.stepNumber}>1</div>
                            <div className={css.stepContent}>
                              <h4>Post Your Project</h4>
                              <p>Define the scope, timeline, and budget. We'll match you with qualified candidates.</p>
                            </div>
                          </div>
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`} style={{ animationDelay: '0.2s' }}>
                            <div className={css.stepNumber}>2</div>
                            <div className={css.stepContent}>
                              <h4>Review Matched Talent</h4>
                              <p>Browse applications, review portfolios, and interview your top picks.</p>
                            </div>
                          </div>
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`} style={{ animationDelay: '0.4s' }}>
                            <div className={css.stepNumber}>3</div>
                            <div className={css.stepContent}>
                              <h4>Get Results</h4>
                              <p>Collaborate through our platform, receive deliverables, and pay on completion.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Students Column */}
                      <div className={css.howColumn}>
                        <h3 className={css.howColumnTitle}>
                          <span className={css.howColumnIcon}>🎓</span>
                          For Students
                        </h3>
                        <div className={css.howSteps}>
                          <div className={css.stepsLine} />
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`} style={{ animationDelay: '0.1s' }}>
                            <div className={css.stepNumber}>1</div>
                            <div className={css.stepContent}>
                              <h4>Create Your Profile</h4>
                              <p>Showcase your skills, experience, and portfolio. Let your work speak for itself.</p>
                            </div>
                          </div>
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`} style={{ animationDelay: '0.3s' }}>
                            <div className={css.stepNumber}>2</div>
                            <div className={css.stepContent}>
                              <h4>Apply to Projects</h4>
                              <p>Browse opportunities that match your skills and interests. Apply with one click.</p>
                            </div>
                          </div>
                          <div className={`${css.howStep} ${visibleElements['how-section'] ? css.visible : ''}`} style={{ animationDelay: '0.5s' }}>
                            <div className={css.stepNumber}>3</div>
                            <div className={css.stepContent}>
                              <h4>Build Your Career</h4>
                              <p>Complete projects, earn money, and grow your professional portfolio.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ================ Marketplace Preview Section ================ */}
                <section className={css.marketplaceSection} id="marketplace-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabelLight}>Live Marketplace</span>
                    <h2 className={css.sectionTitleLight}>Real Projects from Real Companies</h2>
                    <p className={css.sectionSubtitleLight}>
                      Here's a glimpse of what's happening on Street2Ivy right now.
                    </p>

                    <div className={css.projectGrid}>
                      {sampleProjects.map((project, index) => (
                        <div
                          key={project.id}
                          className={`${css.projectCard} ${visibleElements['marketplace-section'] ? css.visible : ''}`}
                          style={{ animationDelay: `${index * 0.15}s` }}
                        >
                          <div className={css.projectCompany}>
                            <div className={css.companyLogo}>{project.logo}</div>
                            <div className={css.companyInfo}>
                              <h5>{project.company}</h5>
                              <span>{project.type}</span>
                            </div>
                          </div>
                          <h4 className={css.projectTitle}>{project.title}</h4>
                          <div className={css.projectTags}>
                            {project.tags.map((tag, i) => (
                              <span key={i} className={css.projectTag}>{tag}</span>
                            ))}
                          </div>
                          <div className={css.projectFooter}>
                            <span className={css.projectCompensation}>{project.compensation}</span>
                            <button className={css.projectBtn}>View Project</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={css.marketplaceCta}>
                      <NamedLink name="SignupPage" className={css.btnPrimary}>
                        Browse All Projects →
                      </NamedLink>
                    </div>
                  </div>
                </section>

                {/* ================ AI Career Coach Section ================ */}
                <section className={css.aiSection} id="ai-section" data-animate>
                  <div className={css.sectionContainer}>
                    <div className={css.aiGrid}>
                      {/* Left - Text Content */}
                      <div className={css.aiText}>
                        <span className={css.sectionLabel}>Powered by Amiko AI</span>
                        <h2 className={css.sectionTitle} style={{ textAlign: 'left' }}>
                          Your Personal Career Coach, Available 24/7
                        </h2>
                        <p className={css.aiDescription}>
                          Every Street2Ivy student gets access to an AI-powered career coach that provides
                          personalized guidance — from resume optimization to interview prep to long-term career strategy.
                        </p>

                        <div className={css.aiFeatures}>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon}>📝</div>
                            <div>
                              <h4>Resume & Application Review</h4>
                              <p>Get instant feedback to stand out in any application</p>
                            </div>
                          </div>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon}>🎤</div>
                            <div>
                              <h4>Interview Preparation</h4>
                              <p>Practice with AI-simulated interviews tailored to your target roles</p>
                            </div>
                          </div>
                          <div className={css.aiFeature}>
                            <div className={css.aiFeatureIcon}>🗺️</div>
                            <div>
                              <h4>Career Path Planning</h4>
                              <p>Map out your trajectory based on skills, interests, and market trends</p>
                            </div>
                          </div>
                        </div>

                        <NamedLink name="SignupPage" className={css.btnPrimary}>
                          See How It Works →
                        </NamedLink>
                      </div>

                      {/* Right - Chat Mockup */}
                      <div className={css.aiVisual}>
                        <div className={css.chatMockup}>
                          <div className={css.chatGlow} />
                          <div className={css.chatHeader}>
                            <div className={css.chatAvatar}>🤖</div>
                            <div className={css.chatHeaderText}>
                              <h4>Career Coach</h4>
                              <span>● Online</span>
                            </div>
                          </div>
                          <div className={css.chatMessages}>
                            <div className={`${css.chatMessage} ${css.chatBot}`}>
                              <div className={css.messageBubble}>
                                Hi Sarah! I reviewed your resume. Your data analysis experience is strong,
                                but let's highlight your Python skills more prominently for fintech roles.
                                Want me to suggest some rewrites?
                              </div>
                            </div>
                            <div className={`${css.chatMessage} ${css.chatUser}`}>
                              <div className={css.messageBubble}>
                                Yes please! I'm applying to FinFlow's project today.
                              </div>
                            </div>
                            <div className={`${css.chatMessage} ${css.chatBot}`}>
                              <div className={css.messageBubble}>
                                Great choice! Here's a tailored version that emphasizes the exact skills
                                they're looking for. I also noticed they value "growth mindset" — let's
                                add a bullet about how you taught yourself SQL in two weeks...
                              </div>
                            </div>
                          </div>
                          <div className={css.chatInput}>
                            <input type="text" placeholder="Ask anything about your career..." readOnly />
                            <button>→</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ================ Stats Section ================ */}
                <section className={css.statsSection} id="stats-section" data-animate>
                  <div className={css.sectionContainer}>
                    <div className={css.statsGrid}>
                      <div className={css.statItem} ref={studentsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{studentsCount.count.toLocaleString()}</span>+
                        </div>
                        <div className={css.statLabel}>Students in Network</div>
                      </div>
                      <div className={css.statItem} ref={projectsCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{projectsCount.count.toLocaleString()}</span>+
                        </div>
                        <div className={css.statLabel}>Projects Completed</div>
                      </div>
                      <div className={css.statItem} ref={companiesCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{companiesCount.count.toLocaleString()}</span>+
                        </div>
                        <div className={css.statLabel}>Partner Companies</div>
                      </div>
                      <div className={css.statItem} ref={ratingCount.ref}>
                        <div className={css.statNumber}>
                          <span className={css.statNumberGradient}>{ratingCount.count}</span>★
                        </div>
                        <div className={css.statLabel}>Average Project Rating</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ================ Testimonials Section ================ */}
                <section className={css.testimonialsSection} id="testimonials-section" data-animate>
                  <div className={css.sectionContainer}>
                    <span className={css.sectionLabel}>Success Stories</span>
                    <h2 className={css.sectionTitle}>What They're Saying</h2>
                    <p className={css.sectionSubtitle}>
                      Real results from real people on both sides of the marketplace.
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
                </section>

                {/* ================ Dual CTA Section ================ */}
                <section className={css.dualCtaSection}>
                  <div className={css.ctaCompanies}>
                    <h2 className={css.ctaTitle}>Ready to Tap Into Fresh Talent?</h2>
                    <ul className={css.ctaList}>
                      <li>Post your first project in under 5 minutes</li>
                      <li>Get matched with pre-vetted candidates</li>
                      <li>Pay only when work is delivered</li>
                    </ul>
                    <NamedLink name="SignupPage" className={css.ctaBtn}>
                      Start Posting Projects →
                    </NamedLink>
                    <p className={css.ctaUrgency}>🔥 Limited spots for launch cohort partners</p>
                  </div>

                  <div className={css.ctaStudents}>
                    <h2 className={css.ctaTitle}>Ready to Prove What You Can Do?</h2>
                    <ul className={css.ctaList}>
                      <li>Create your profile and showcase your skills</li>
                      <li>Get access to AI-powered career coaching</li>
                      <li>Start building your professional portfolio</li>
                    </ul>
                    <NamedLink name="SignupPage" className={css.ctaBtnAlt}>
                      Join the Talent Network →
                    </NamedLink>
                    <p className={css.ctaUrgency}>🚀 Early access — applications closing soon</p>
                  </div>
                </section>
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
