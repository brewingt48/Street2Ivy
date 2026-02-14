/**
 * Features Section Component
 */

import { Briefcase, GraduationCap, Shield, Zap, Users, Award } from 'lucide-react';

interface FeaturesSectionProps {
  content?: Record<string, unknown>;
}

const defaultFeatures = [
  {
    icon: Briefcase,
    title: 'Real-World Projects',
    description: 'Work on actual corporate projects, not theoretical exercises. Gain experience that employers value.',
  },
  {
    icon: GraduationCap,
    title: 'Skill Development',
    description: 'Build your professional portfolio while earning your degree. Apply classroom knowledge in real scenarios.',
  },
  {
    icon: Shield,
    title: 'NDA Protected',
    description: 'Secure collaboration with built-in NDA management. Professional-grade confidentiality controls.',
  },
  {
    icon: Zap,
    title: 'Smart Matching',
    description: 'Our algorithm matches students to projects based on skills, interests, and availability.',
  },
  {
    icon: Users,
    title: 'University Integration',
    description: 'Partnered with educational institutions. Edu admins can monitor student progress and outcomes.',
  },
  {
    icon: Award,
    title: 'Performance Assessments',
    description: 'Receive detailed feedback and assessments from corporate partners to strengthen your profile.',
  },
];

export function FeaturesSection({ content }: FeaturesSectionProps) {
  const heading = (content?.heading as string) || 'Why Street2Ivy?';
  const subheading = (content?.subheading as string) || 'Everything you need to bridge the gap between education and industry.';

  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{heading}</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">{subheading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {defaultFeatures.map((feature, i) => (
            <div key={i} className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
