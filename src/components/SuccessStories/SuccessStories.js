import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';

import { AvatarMedium, IconArrowHead } from '../../components';

import css from './SuccessStories.module.css';

/**
 * Default testimonials to show if none are provided
 * In production, these would come from a CMS or API
 */
const DEFAULT_TESTIMONIALS = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Stanford University, Class of 2024',
    company: 'TechStart Inc.',
    project: 'Market Research Analysis',
    quote:
      "Working on a real business project gave me hands-on experience that my classes couldn't provide. I learned how to present to stakeholders and manage tight deadlines.",
    outcome: 'Received a full-time job offer',
    avatar: null,
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Howard University, Class of 2023',
    company: 'Green Ventures',
    project: 'Sustainability Strategy',
    quote:
      'Street2Ivy connected me with a company that values diverse perspectives. The project let me apply my environmental science knowledge to real business challenges.',
    outcome: 'Built portfolio for grad school applications',
    avatar: null,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'UC Berkeley, Class of 2024',
    company: 'DataFlow Analytics',
    project: 'Customer Segmentation',
    quote:
      'The mentorship I received was invaluable. The corporate partner took time to explain industry best practices and helped me develop professional skills.',
    outcome: 'Launched career in data analytics',
    avatar: null,
  },
];

/**
 * Single testimonial card component
 */
const TestimonialCard = ({ testimonial, isActive }) => {
  const { name, role, company, project, quote, outcome, avatar } = testimonial;

  // Create a mock user object for the Avatar component
  const userForAvatar = {
    id: { uuid: testimonial.id },
    type: 'user',
    attributes: {
      profile: {
        displayName: name,
        abbreviatedName:
          name
            ?.split(' ')
            .map(n => n[0])
            .join('') || '?',
      },
    },
    profileImage: avatar,
  };

  return (
    <div className={classNames(css.testimonialCard, { [css.activeCard]: isActive })}>
      <div className={css.quoteIcon}>"</div>
      <blockquote className={css.quote}>{quote}</blockquote>

      <div className={css.testimonialMeta}>
        <AvatarMedium user={userForAvatar} className={css.avatar} disableProfileLink />
        <div className={css.authorInfo}>
          <span className={css.authorName}>{name}</span>
          <span className={css.authorRole}>{role}</span>
        </div>
      </div>

      <div className={css.projectInfo}>
        <div className={css.projectDetail}>
          <span className={css.projectLabel}>
            <FormattedMessage id="SuccessStories.project" />
          </span>
          <span className={css.projectValue}>{project}</span>
        </div>
        <div className={css.projectDetail}>
          <span className={css.projectLabel}>
            <FormattedMessage id="SuccessStories.company" />
          </span>
          <span className={css.projectValue}>{company}</span>
        </div>
      </div>

      {outcome && (
        <div className={css.outcome}>
          <span className={css.outcomeIcon}>🎯</span>
          <span className={css.outcomeText}>{outcome}</span>
        </div>
      )}
    </div>
  );
};

/**
 * SuccessStories - Displays student testimonials and success stories
 *
 * @param {Array} testimonials - Array of testimonial objects
 * @param {string} title - Section title
 * @param {string} subtitle - Section subtitle
 * @param {string} className - Additional CSS class
 * @param {string} variant - Display variant: 'carousel', 'grid', 'featured'
 */
const SuccessStories = props => {
  const {
    testimonials = DEFAULT_TESTIMONIALS,
    title,
    subtitle,
    className,
    rootClassName,
    variant = 'carousel',
  } = props;

  const [activeIndex, setActiveIndex] = useState(0);
  const classes = classNames(rootClassName || css.root, className);

  const handlePrevious = () => {
    setActiveIndex(prev => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex(prev => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = index => {
    setActiveIndex(index);
  };

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  // Grid variant - show all testimonials in a grid
  if (variant === 'grid') {
    return (
      <section className={classes}>
        <div className={css.header}>
          <h2 className={css.title}>{title || <FormattedMessage id="SuccessStories.title" />}</h2>
          {subtitle && <p className={css.subtitle}>{subtitle}</p>}
        </div>
        <div className={css.gridContainer}>
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} isActive={false} />
          ))}
        </div>
      </section>
    );
  }

  // Featured variant - show one large testimonial
  if (variant === 'featured') {
    const featured = testimonials[0];
    return (
      <section className={classes}>
        <div className={css.featuredContainer}>
          <div className={css.featuredQuote}>
            <div className={css.quoteIconLarge}>"</div>
            <blockquote className={css.quoteLarge}>{featured.quote}</blockquote>
          </div>
          <div className={css.featuredMeta}>
            <AvatarMedium
              user={{
                id: { uuid: featured.id },
                attributes: {
                  profile: {
                    displayName: featured.name,
                    abbreviatedName: featured.name
                      ?.split(' ')
                      .map(n => n[0])
                      .join(''),
                  },
                },
                profileImage: featured.avatar,
              }}
              className={css.avatarLarge}
              disableProfileLink
            />
            <div className={css.featuredAuthorInfo}>
              <span className={css.authorNameLarge}>{featured.name}</span>
              <span className={css.authorRoleLarge}>{featured.role}</span>
              <span className={css.featuredCompany}>
                {featured.project} @ {featured.company}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default: Carousel variant
  return (
    <section className={classes}>
      <div className={css.header}>
        <h2 className={css.title}>{title || <FormattedMessage id="SuccessStories.title" />}</h2>
        {subtitle && <p className={css.subtitle}>{subtitle}</p>}
      </div>

      <div className={css.carouselContainer}>
        <button
          type="button"
          className={css.navButton}
          onClick={handlePrevious}
          aria-label="Previous testimonial"
        >
          <IconArrowHead direction="left" className={css.navIcon} />
        </button>

        <div className={css.carouselTrack}>
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={classNames(css.carouselSlide, {
                [css.activeSlide]: index === activeIndex,
                [css.hiddenSlide]: index !== activeIndex,
              })}
            >
              <TestimonialCard testimonial={testimonial} isActive={index === activeIndex} />
            </div>
          ))}
        </div>

        <button
          type="button"
          className={css.navButton}
          onClick={handleNext}
          aria-label="Next testimonial"
        >
          <IconArrowHead direction="right" className={css.navIcon} />
        </button>
      </div>

      {/* Pagination dots */}
      <div className={css.pagination}>
        {testimonials.map((_, index) => (
          <button
            key={index}
            type="button"
            className={classNames(css.paginationDot, {
              [css.activeDot]: index === activeIndex,
            })}
            onClick={() => handleDotClick(index)}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

SuccessStories.propTypes = {
  testimonials: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      role: PropTypes.string,
      company: PropTypes.string,
      project: PropTypes.string,
      quote: PropTypes.string.isRequired,
      outcome: PropTypes.string,
      avatar: PropTypes.object,
    })
  ),
  title: PropTypes.node,
  subtitle: PropTypes.string,
  className: PropTypes.string,
  rootClassName: PropTypes.string,
  variant: PropTypes.oneOf(['carousel', 'grid', 'featured']),
};

export default SuccessStories;
