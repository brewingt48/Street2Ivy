import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import css from './ListingPage.module.css';

const STEPS = [
  {
    number: '1',
    titleId: 'ListingPage.howItWorks.step1.title',
    descriptionId: 'ListingPage.howItWorks.step1.description',
  },
  {
    number: '2',
    titleId: 'ListingPage.howItWorks.step2.title',
    descriptionId: 'ListingPage.howItWorks.step2.description',
  },
  {
    number: '3',
    titleId: 'ListingPage.howItWorks.step3.title',
    descriptionId: 'ListingPage.howItWorks.step3.description',
  },
  {
    number: '4',
    titleId: 'ListingPage.howItWorks.step4.title',
    descriptionId: 'ListingPage.howItWorks.step4.description',
  },
];

const SectionHowItWorks = () => {
  return (
    <div className={css.sectionHowItWorks}>
      <h3 className={css.sectionHeading}>
        <FormattedMessage id="ListingPage.howItWorks.heading" />
      </h3>
      <div className={css.howItWorksSteps}>
        {STEPS.map(step => (
          <div key={step.number} className={css.howItWorksStep}>
            <div className={css.howItWorksStepNumber}>{step.number}</div>
            <div className={css.howItWorksStepContent}>
              <h4 className={css.howItWorksStepTitle}>
                <FormattedMessage id={step.titleId} />
              </h4>
              <p className={css.howItWorksStepDescription}>
                <FormattedMessage id={step.descriptionId} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionHowItWorks;
