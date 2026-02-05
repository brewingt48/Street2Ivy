import React, { useState } from 'react';
import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LayoutComposer, NamedLink, Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './LandingPage.module.css';

// Street2Ivy custom landing page - no listing buttons, focused on signup
const LandingPageComponent = props => {
  const { currentUser } = props;
  const intl = useIntl();
  const [showVideo, setShowVideo] = useState(false);

  const isAuthenticated = !!currentUser;

  const title = intl.formatMessage({ id: 'LandingPage.title' });
  const description = intl.formatMessage({ id: 'LandingPage.description' });

  // Testimonials data - can be fetched from API in the future
  const testimonials = [
    {
      quote:
        'Street2Ivy connected me with an amazing consulting project that helped me gain real-world experience before graduation. The skills I learned were invaluable for my career.',
      author: 'Sarah M.',
      role: 'Stanford University, Class of 2024',
      initials: 'SM',
    },
    {
      quote:
        "As a corporate partner, we've found exceptional talent through Street2Ivy. The students bring fresh perspectives and innovative ideas to our projects.",
      author: 'Michael R.',
      role: 'Director of Innovation, Tech Startup',
      initials: 'MR',
    },
    {
      quote:
        'The platform made it easy to find projects that aligned with my interests in sustainability. I completed two projects that directly related to my thesis work.',
      author: 'James L.',
      role: 'MIT, MBA Candidate',
      initials: 'JL',
    },
    {
      quote:
        'Street2Ivy has been instrumental in helping our students gain practical experience. The quality of corporate partners on the platform is outstanding.',
      author: 'Dr. Patricia K.',
      role: 'Career Services Director, Columbia Business School',
      initials: 'PK',
    },
    {
      quote:
        'I landed my dream job after completing a project through Street2Ivy. The company was so impressed they offered me a full-time position!',
      author: 'David C.',
      role: 'Harvard Business School, Class of 2023',
      initials: 'DC',
    },
    {
      quote:
        "The quality of student work exceeded our expectations. We've already posted multiple projects and plan to continue using the platform.",
      author: 'Jennifer W.',
      role: 'VP of Strategy, Fortune 500 Company',
      initials: 'JW',
    },
  ];

  const features = [
    {
      icon: '🎓',
      title: intl.formatMessage({ id: 'LandingPage.feature1Title' }),
      description: intl.formatMessage({ id: 'LandingPage.feature1Description' }),
    },
    {
      icon: '💼',
      title: intl.formatMessage({ id: 'LandingPage.feature2Title' }),
      description: intl.formatMessage({ id: 'LandingPage.feature2Description' }),
    },
    {
      icon: '🤝',
      title: intl.formatMessage({ id: 'LandingPage.feature3Title' }),
      description: intl.formatMessage({ id: 'LandingPage.feature3Description' }),
    },
  ];

  const steps = [
    {
      number: '1',
      title: intl.formatMessage({ id: 'LandingPage.step1Title' }),
      description: intl.formatMessage({ id: 'LandingPage.step1Description' }),
    },
    {
      number: '2',
      title: intl.formatMessage({ id: 'LandingPage.step2Title' }),
      description: intl.formatMessage({ id: 'LandingPage.step2Description' }),
    },
    {
      number: '3',
      title: intl.formatMessage({ id: 'LandingPage.step3Title' }),
      description: intl.formatMessage({ id: 'LandingPage.step3Description' }),
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
                {/* Hero Section */}
                <section className={css.heroSection}>
                  <div className={css.heroContent}>
                    <h1 className={css.heroTitle}>
                      <FormattedMessage id="LandingPage.heroTitle" />
                    </h1>
                    <p className={css.heroSubtitle}>
                      <FormattedMessage id="LandingPage.heroSubtitle" />
                    </p>
                    <div className={css.heroButtons}>
                      {isAuthenticated ? (
                        <NamedLink name="SearchPage" className={css.primaryButton}>
                          <FormattedMessage id="LandingPage.browseProjects" />
                        </NamedLink>
                      ) : (
                        <>
                          <NamedLink name="SignupPage" className={css.primaryButton}>
                            <FormattedMessage id="LandingPage.getStarted" />
                          </NamedLink>
                          <NamedLink name="LoginPage" className={css.secondaryButton}>
                            <FormattedMessage id="LandingPage.signIn" />
                          </NamedLink>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {/* Features Section */}
                <section className={css.featuresSection}>
                  <div className={css.sectionContainer}>
                    <h2 className={css.sectionTitle}>
                      <FormattedMessage id="LandingPage.whyStreet2Ivy" />
                    </h2>
                    <div className={css.featuresGrid}>
                      {features.map((feature, index) => (
                        <div key={index} className={css.featureCard}>
                          <div className={css.featureIcon}>{feature.icon}</div>
                          <h3 className={css.featureTitle}>{feature.title}</h3>
                          <p className={css.featureDescription}>{feature.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* How It Works Section */}
                <section className={css.howItWorksSection}>
                  <div className={css.sectionContainer}>
                    <h2 className={css.sectionTitle}>
                      <FormattedMessage id="LandingPage.howItWorks" />
                    </h2>
                    <div className={css.stepsGrid}>
                      {steps.map((step, index) => (
                        <div key={index} className={css.stepCard}>
                          <div className={css.stepNumber}>{step.number}</div>
                          <h3 className={css.stepTitle}>{step.title}</h3>
                          <p className={css.stepDescription}>{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Video Testimonial Section */}
                <section className={css.videoTestimonialSection} id="testimonials">
                  <div className={css.videoContainer}>
                    <h2 className={css.videoSectionTitle}>
                      <FormattedMessage id="LandingPage.videoTestimonialTitle" />
                    </h2>
                    <div className={css.videoWrapper}>
                      {showVideo ? (
                        <iframe
                          src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                          title="Street2Ivy Testimonial Video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div
                          className={css.videoPlaceholder}
                          onClick={() => setShowVideo(true)}
                          role="button"
                          tabIndex={0}
                          onKeyPress={e => e.key === 'Enter' && setShowVideo(true)}
                        >
                          <div className={css.playButton}>
                            <div className={css.playIcon} />
                          </div>
                          <p className={css.videoPlaceholderText}>
                            <FormattedMessage id="LandingPage.watchTestimonial" />
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Written Testimonials Section */}
                <section className={css.testimonialsSection}>
                  <div className={css.sectionContainer}>
                    <h2 className={css.sectionTitle}>
                      <FormattedMessage id="LandingPage.testimonialsTitle" />
                    </h2>
                    <div className={css.testimonialsGrid}>
                      {testimonials.map((testimonial, index) => (
                        <div key={index} className={css.testimonialCard}>
                          <p className={css.testimonialQuote}>"{testimonial.quote}"</p>
                          <div className={css.testimonialAuthor}>
                            <div className={css.authorAvatar}>{testimonial.initials}</div>
                            <div className={css.authorInfo}>
                              <p className={css.authorName}>{testimonial.author}</p>
                              <p className={css.authorRole}>{testimonial.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* CTA Section */}
                <section className={css.ctaSection}>
                  <div className={css.ctaContent}>
                    <h2 className={css.ctaTitle}>
                      <FormattedMessage id="LandingPage.ctaTitle" />
                    </h2>
                    <p className={css.ctaDescription}>
                      <FormattedMessage id="LandingPage.ctaDescription" />
                    </p>
                    {!isAuthenticated && (
                      <NamedLink name="SignupPage" className={css.ctaButton}>
                        <FormattedMessage id="LandingPage.joinNow" />
                      </NamedLink>
                    )}
                    {isAuthenticated && (
                      <NamedLink name="SearchPage" className={css.ctaButton}>
                        <FormattedMessage id="LandingPage.exploreProjects" />
                      </NamedLink>
                    )}
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
