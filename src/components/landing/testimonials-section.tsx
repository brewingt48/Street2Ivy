/**
 * Testimonials Section Component
 */

interface TestimonialsSectionProps {
  content?: Record<string, unknown>;
}

const defaultTestimonials = [
  {
    quote: 'Street2Ivy gave me the real-world experience I needed to land my dream job. The projects were challenging and rewarding.',
    name: 'Alex Chen',
    role: 'Computer Science, Class of 2025',
  },
  {
    quote: 'Finding skilled, motivated student talent used to be so hard. Street2Ivy made it seamless to connect with top candidates.',
    name: 'Sarah Johnson',
    role: 'VP of Innovation, TechCorp',
  },
  {
    quote: 'As an edu admin, I can track student progress and ensure our students get quality work experience. Game changer.',
    name: 'Dr. Michael Torres',
    role: 'Dean of Career Services',
  },
];

export function TestimonialsSection({ content }: TestimonialsSectionProps) {
  const heading = (content?.heading as string) || 'What People Are Saying';

  return (
    <section className="py-20 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">{heading}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {defaultTestimonials.map((testimonial, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
              <div className="text-teal-500 text-4xl font-serif mb-2">&ldquo;</div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {testimonial.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm">
                  {testimonial.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{testimonial.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
