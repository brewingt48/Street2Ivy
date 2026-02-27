-- Migration 018: Seed Team Huddle content for Holy Cross Pilot
-- Educational content: career readiness, grad school, research, internships, alumni stories
-- Idempotent: uses ON CONFLICT DO NOTHING where possible

DO $$
DECLARE
  v_tenant_id UUID := '512763c4-6e30-4306-8b00-6a193a3c9ede';

  -- Users (already exist from migration 016)
  v_amy_id UUID := 'a98dbb2b-0874-4400-91c0-8ab7b558ae03';       -- educational_admin
  v_employer_id UUID := '09494608-dc2c-40c6-baad-1de13acf7dd2';   -- corporate_partner (Demo Employer)
  v_zoe_id UUID := '77aa5b46-6d0d-4b3e-9b54-dbfd83579114';       -- student (Zoe Washington)
  v_marcus_id UUID := 'cafb9a85-0167-4dce-86d7-edcdf46b9412';    -- student (Marcus Williams)

  -- Contributor IDs (generated deterministically for idempotency)
  v_contrib_amy UUID := 'c0a10001-0001-4000-8000-000000000001';
  v_contrib_employer UUID := 'c0a10001-0002-4000-8000-000000000002';
  v_contrib_zoe UUID := 'c0a10001-0003-4000-8000-000000000003';
  v_contrib_marcus UUID := 'c0a10001-0004-4000-8000-000000000004';

  -- Topic IDs (hex-valid UUIDs)
  v_topic_career UUID := 'a0a10001-0001-4000-8000-000000000001';
  v_topic_gradschool UUID := 'a0a10001-0002-4000-8000-000000000002';
  v_topic_research UUID := 'a0a10001-0003-4000-8000-000000000003';
  v_topic_internships UUID := 'a0a10001-0004-4000-8000-000000000004';
  v_topic_alumni UUID := 'a0a10001-0005-4000-8000-000000000005';

  -- Post IDs (hex-valid UUIDs)
  v_post_video1 UUID := 'b0a10001-0001-4000-8000-000000000001';
  v_post_article1 UUID := 'b0a10001-0002-4000-8000-000000000002';
  v_post_pdf1 UUID := 'b0a10001-0003-4000-8000-000000000003';
  v_post_audio1 UUID := 'b0a10001-0004-4000-8000-000000000004';
  v_post_text1 UUID := 'b0a10001-0005-4000-8000-000000000005';
  v_post_article2 UUID := 'b0a10001-0006-4000-8000-000000000006';
  v_post_video2 UUID := 'b0a10001-0007-4000-8000-000000000007';
  v_post_text2 UUID := 'b0a10001-0008-4000-8000-000000000008';

BEGIN
  RAISE NOTICE 'Seeding Team Huddle content for Holy Cross Pilot...';

  -- ═══════════════════════════════════════════════════════
  -- 1. HUDDLE TOPICS (educational categories)
  -- ═══════════════════════════════════════════════════════

  INSERT INTO huddle_topics (id, tenant_id, name, slug, display_order, is_active) VALUES
    (v_topic_career, v_tenant_id, 'Career Readiness', 'career-readiness', 1, true),
    (v_topic_gradschool, v_tenant_id, 'Graduate School Prep', 'graduate-school-prep', 2, true),
    (v_topic_research, v_tenant_id, 'Research & Academics', 'research-academics', 3, true),
    (v_topic_internships, v_tenant_id, 'Internship Insights', 'internship-insights', 4, true),
    (v_topic_alumni, v_tenant_id, 'Alumni Spotlights', 'alumni-spotlights', 5, true)
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  RAISE NOTICE '  Topics created: 5';

  -- ═══════════════════════════════════════════════════════
  -- 2. HUDDLE CONTRIBUTORS
  -- ═══════════════════════════════════════════════════════

  INSERT INTO huddle_contributors (id, tenant_id, user_id, role, title, class_year, bio, is_active, invited_by) VALUES
    (v_contrib_amy, v_tenant_id, v_amy_id, 'admin',
     'Director of Career Development',
     NULL,
     'Leading career readiness initiatives at the College of the Holy Cross. Passionate about connecting students with meaningful career pathways and professional development opportunities.',
     true, NULL),

    (v_contrib_employer, v_tenant_id, v_employer_id, 'partner',
     'Talent Acquisition Manager',
     NULL,
     'Industry partner working with Holy Cross to create internship and full-time opportunities for students. Focused on bridging the gap between academic preparation and workplace readiness.',
     true, v_amy_id),

    (v_contrib_zoe, v_tenant_id, v_zoe_id, 'alumni',
     'Financial Analyst, Goldman Sachs',
     '2024',
     'Holy Cross Economics graduate now working in investment banking. Eager to share insights about navigating the transition from college to a career in finance.',
     true, v_amy_id),

    (v_contrib_marcus, v_tenant_id, v_marcus_id, 'alumni',
     'Marketing Associate, HubSpot',
     '2024',
     'Communications major turned marketing professional. Believes in the power of liberal arts education to prepare students for diverse career paths in the tech industry.',
     true, v_amy_id)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RAISE NOTICE '  Contributors created: 4';

  -- ═══════════════════════════════════════════════════════
  -- 3. HUDDLE POSTS (one of each content_type, all educational)
  -- ═══════════════════════════════════════════════════════

  -- POST 1: VIDEO — Interview preparation (Featured)
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_video1, v_tenant_id, v_contrib_amy, 'video',
    'How to Ace Your First Professional Interview',
    'A comprehensive workshop on interview preparation covering behavioral questions, STAR method responses, and industry-specific tips for Holy Cross students.',
    E'In this 45-minute workshop recording, we cover the essential skills every student needs for professional interviews.\n\n**Key Topics:**\n- Understanding the STAR method (Situation, Task, Action, Result)\n- Common behavioral interview questions and how to prepare\n- Industry-specific tips for finance, consulting, and tech\n- How to research companies before your interview\n- Virtual interview best practices\n- Follow-up etiquette and thank-you notes\n\nThis workshop was recorded during our Fall 2025 Career Readiness Series and features insights from hiring managers at partner companies.',
    'https://www.youtube.com/watch?v=example-interview-prep',
    NULL,
    'published', true, false, NOW() - INTERVAL '2 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 2: ARTICLE — Alumni career paths
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_article1, v_tenant_id, v_contrib_zoe, 'article',
    'From Holy Cross to Wall Street: My Journey into Investment Banking',
    'Zoe Washington shares her path from an Economics major at Holy Cross to a Financial Analyst role at Goldman Sachs, including the key experiences that made the difference.',
    E'When I arrived at Holy Cross as a first-year student, I had no idea I would end up working in investment banking. My journey was anything but linear, and I think that is what made it successful.\n\n## The Foundation: Liberal Arts Thinking\n\nMy economics coursework gave me the quantitative foundation, but it was the philosophy and writing-intensive courses that truly prepared me for the analytical thinking required in finance. Investment banking is not just about numbers — it is about crafting narratives, understanding complex systems, and communicating clearly under pressure.\n\n## Key Experiences That Opened Doors\n\n**1. The Student Investment Club**\nJoining the investment club sophomore year was transformative. We managed a small portfolio and presented quarterly reports to faculty advisors. This hands-on experience gave me something concrete to discuss in interviews.\n\n**2. ProveGround Projects**\nThe real-world projects I completed through ProveGround were game-changers. Working on an actual financial analysis for a startup gave me portfolio pieces that stood out in interviews. Hiring managers were genuinely impressed that I had practical experience beyond the classroom.\n\n**3. Summer Internship**\nMy junior year internship at a boutique firm in Boston gave me direct exposure to deal work. I spent 10 weeks building financial models, attending client meetings, and learning the pace of the industry.\n\n## Advice for Current Students\n\n- **Start early**: Begin exploring career interests by sophomore year\n- **Build your network**: Attend alumni events, reach out on LinkedIn, and leverage the Holy Cross alumni network\n- **Develop your story**: Be able to articulate why you chose this path and what unique perspective you bring\n- **Do not neglect soft skills**: Communication, teamwork, and adaptability matter as much as technical skills\n- **Use your resources**: The Career Development Office, ProveGround, and faculty mentors are there to help\n\nThe transition from college to professional life is challenging, but Holy Cross prepares you for it in ways you might not realize until you are in the workforce. Trust the process and invest in your development.',
    NULL, NULL,
    'published', true, false, NOW() - INTERVAL '5 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 3: PDF — Graduate school timeline (Pinned)
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_pdf1, v_tenant_id, v_contrib_amy, 'pdf',
    '2025-2026 Graduate School Application Timeline & Checklist',
    'Complete month-by-month guide for students planning to apply to graduate programs. Includes standardized test schedules, application deadlines, and recommendation letter timelines.',
    E'This comprehensive guide covers everything you need to know about applying to graduate school, organized by semester and month.\n\n**Included in this resource:**\n- Month-by-month timeline from junior spring through senior fall\n- GRE/GMAT/LSAT/MCAT preparation schedules\n- How to request recommendation letters (with email templates)\n- Personal statement writing guide\n- Financial aid and fellowship application deadlines\n- Holy Cross-specific resources and faculty advisor contacts\n\nDownload and print this checklist to stay on track with your graduate school applications.',
    NULL, NULL,
    'published', false, true, NOW() - INTERVAL '10 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 4: AUDIO — Internship podcast
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_audio1, v_tenant_id, v_contrib_employer, 'audio',
    'Crusader Careers Podcast: What Employers Actually Look For in Interns',
    'A candid conversation with hiring managers about what makes internship candidates stand out, common mistakes to avoid, and how to turn an internship into a full-time offer.',
    E'In this episode of the Crusader Careers Podcast, we sit down with three hiring managers from different industries to discuss what they really look for when hiring interns.\n\n**Episode Highlights:**\n\n*Timestamps:*\n- 0:00 — Introduction and guest introductions\n- 3:15 — What makes a cover letter stand out\n- 8:42 — The skills gap: what colleges teach vs. what employers need\n- 15:30 — How to make the most of your first two weeks\n- 22:18 — Converting your internship to a full-time offer\n- 30:05 — Q&A with students\n- 38:00 — Key takeaways and action items\n\n**Key Takeaway:** Employers value curiosity, initiative, and communication skills above specific technical knowledge for internship roles. They are hiring for potential, not perfection.\n\nRecorded at the Holy Cross Career Center, Fall 2025.',
    NULL, NULL,
    'published', false, false, NOW() - INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 5: TEXT POST — Study strategies
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_text1, v_tenant_id, v_contrib_marcus, 'text_post',
    'Evidence-Based Study Strategies That Actually Work',
    'Forget all-nighters and highlighter marathons. Here are the research-backed techniques that improved my GPA by a full point and reduced my stress levels dramatically.',
    E'After struggling through my first semester, I dove into the research on learning science and completely changed my approach. Here is what actually works:\n\n## 1. Spaced Repetition > Cramming\n\nInstead of marathon study sessions before exams, review material in short sessions spread over days. The forgetting curve is real — reviewing material just before you would forget it locks it into long-term memory.\n\n**How to do it:** After each lecture, spend 10 minutes reviewing notes. Review again 2 days later, then a week later. By exam time, you already know the material.\n\n## 2. Active Recall > Re-Reading\n\nClose your textbook and try to write down everything you remember about a topic. This is uncomfortable but dramatically more effective than passive re-reading.\n\n**How to do it:** After reading a chapter, close the book and write a summary from memory. Then check what you missed.\n\n## 3. Teach It to Learn It\n\nExplaining concepts to someone else (or even to yourself) reveals gaps in your understanding that you would never find just by reading.\n\n**How to do it:** Form study groups where each person teaches a section. Or explain concepts out loud to yourself while walking.\n\n## 4. Interleave Your Subjects\n\nStudying one subject for 6 hours is less effective than studying three subjects for 2 hours each. Switching between topics forces your brain to work harder at retrieval.\n\n## 5. Sleep Is Non-Negotiable\n\nAll-nighters actively harm learning. Your brain consolidates memories during sleep. Getting 7+ hours before an exam will serve you better than any amount of last-minute studying.\n\nThese strategies helped me go from a 2.8 to a 3.8 GPA. They are not magic — they are science. Give them a try.',
    NULL, NULL,
    'published', false, false, NOW() - INTERVAL '3 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 6: ARTICLE — LinkedIn profile building
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_article2, v_tenant_id, v_contrib_employer, 'article',
    'Building a Strong LinkedIn Profile: A Step-by-Step Guide for College Students',
    'Your LinkedIn profile is often the first impression recruiters have of you. Learn how to create a profile that showcases your academic achievements and career potential.',
    E'As someone who reviews hundreds of student profiles each recruiting season, here is my honest guide to building a LinkedIn presence that gets noticed.\n\n## The Basics: What Every Student Profile Needs\n\n### Professional Photo\nYou do not need a studio headshot, but you do need a clear, well-lit photo where you look approachable and professional. The Holy Cross Career Center offers free headshot sessions — take advantage of them.\n\n### Headline\nDo NOT just say "Student at College of the Holy Cross." Instead, try:\n- "Economics Major | Aspiring Financial Analyst | Holy Cross ''26"\n- "Data-Driven Marketing Student | Content Creator | Holy Cross"\n\n### About Section\nWrite 3-4 sentences about your academic interests, career goals, and what makes you unique. First person is fine. Be genuine, not generic.\n\n## The Experience Section\n\nInclude:\n- **Internships and jobs** (even part-time or on-campus)\n- **ProveGround projects** — these are real work experience\n- **Leadership roles** in clubs and organizations\n- **Research assistantships** with faculty\n- **Volunteer work** that demonstrates skills\n\nFor each entry, use bullet points with measurable results when possible.\n\n## Skills & Endorsements\n\nAdd at least 10 relevant skills. Ask classmates and professors to endorse you. Recruiters filter candidates by skills.\n\n## The Secret Weapon: Engagement\n\nDo not just build a profile and forget it. Share interesting articles, comment thoughtfully on industry posts, and congratulate connections on achievements. Active profiles get 5x more views.\n\n## Common Mistakes to Avoid\n\n- Leaving the default LinkedIn URL (customize it to linkedin.com/in/yourname)\n- Having zero connections (aim for 100+ to start)\n- Not including a profile photo (profiles with photos get 21x more views)\n- Writing in third person ("John is a dedicated student...")\n- Listing every skill imaginable instead of focusing on relevant ones',
    NULL, NULL,
    'published', false, false, NOW() - INTERVAL '8 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 7: VIDEO — Undergraduate research
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_video2, v_tenant_id, v_contrib_amy, 'video',
    'Getting Started with Undergraduate Research at Holy Cross',
    'Faculty panel discussion on how to find research opportunities, approach professors, and turn undergraduate research into conference presentations and publications.',
    E'This panel discussion features four Holy Cross faculty members from different departments sharing practical advice on undergraduate research.\n\n**Panelists:**\n- Dr. Sarah Chen, Department of Economics\n- Dr. Michael Torres, Department of Psychology\n- Dr. Rachel Green, Department of Biology\n- Dr. James Liu, Department of Computer Science\n\n**Topics Covered:**\n- How to identify potential research mentors\n- The best time to start undergraduate research\n- Writing a research proposal that gets accepted\n- Balancing research with coursework and activities\n- Presenting at conferences (Holy Cross Academic Conference and beyond)\n- How research experience strengthens graduate school and job applications\n- Funding opportunities: Summer Research Program, Ignatian Fellowship\n\n**Key insight from the panel:** You do not need to be a science major to do research. Every discipline at Holy Cross has opportunities for original scholarly work.\n\nRecorded at the Spring 2025 Research Opportunities Fair.',
    'https://www.youtube.com/watch?v=example-undergrad-research',
    NULL,
    'published', false, false, NOW() - INTERVAL '12 days'
  ) ON CONFLICT (id) DO NOTHING;

  -- POST 8: TEXT POST — Transferable skills
  INSERT INTO huddle_posts (
    id, tenant_id, contributor_id, content_type, title, description, body,
    media_url, thumbnail_url, status, is_featured, is_pinned, published_at
  ) VALUES (
    v_post_text2, v_tenant_id, v_contrib_zoe, 'text_post',
    '5 Skills Every Liberal Arts Graduate Needs in Today''s Job Market',
    'A reflection on the unexpected skills from my Holy Cross education that proved most valuable in the professional world.',
    E'Six months into my career, I can tell you that the most valuable things I learned at Holy Cross were not in any textbook. Here are the five skills that have mattered most:\n\n## 1. Critical Thinking & Analysis\n\nEvery philosophy seminar where I had to dissect an argument, every economics problem set where I had to model uncertainty — these built a mental toolkit for approaching complex problems at work. When my team faces a new challenge, I instinctively break it into components, question assumptions, and look for evidence.\n\n## 2. Written Communication\n\nThe sheer volume of writing at Holy Cross felt overwhelming at the time, but it was the best career preparation I could have gotten. Clear, persuasive writing is rare in the professional world, and it sets you apart immediately.\n\n## 3. Comfort with Ambiguity\n\nLiberal arts education teaches you that most important questions do not have clean answers. In the business world, you rarely have perfect information. Being comfortable making decisions with incomplete data is a genuine superpower.\n\n## 4. Cross-Disciplinary Thinking\n\nMy economics major combined with history and philosophy electives gave me a unique lens. I can connect patterns across domains that my peers from more specialized programs sometimes miss. Employers value people who can see the bigger picture.\n\n## 5. Presentation & Public Speaking\n\nAll those seminar discussions, class presentations, and thesis defenses? Pure gold for professional life. Being able to present ideas clearly and confidently to a room of senior leaders is a skill that takes many professionals years to develop.\n\n**The bottom line:** Do not let anyone tell you that a liberal arts degree is impractical. The skills you are building at Holy Cross are exactly what the modern workforce needs. Trust your education.',
    NULL, NULL,
    'published', false, false, NOW() - INTERVAL '1 day'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '  Posts created: 8 (2 video, 2 article, 1 pdf, 1 audio, 2 text_post)';

  -- ═══════════════════════════════════════════════════════
  -- 4. POST-TOPIC ASSOCIATIONS
  -- ═══════════════════════════════════════════════════════

  INSERT INTO huddle_post_topics (post_id, topic_id) VALUES
    -- Video 1: Interview prep → Career Readiness, Internship Insights
    (v_post_video1, v_topic_career),
    (v_post_video1, v_topic_internships),
    -- Article 1: Alumni career paths → Alumni Spotlights, Career Readiness
    (v_post_article1, v_topic_alumni),
    (v_post_article1, v_topic_career),
    -- PDF 1: Grad school timeline → Graduate School Prep
    (v_post_pdf1, v_topic_gradschool),
    -- Audio 1: Internship podcast → Internship Insights, Career Readiness
    (v_post_audio1, v_topic_internships),
    (v_post_audio1, v_topic_career),
    -- Text 1: Study strategies → Research & Academics
    (v_post_text1, v_topic_research),
    -- Article 2: LinkedIn guide → Career Readiness
    (v_post_article2, v_topic_career),
    -- Video 2: Undergrad research → Research & Academics, Graduate School Prep
    (v_post_video2, v_topic_research),
    (v_post_video2, v_topic_gradschool),
    -- Text 2: Liberal arts skills → Career Readiness, Alumni Spotlights
    (v_post_text2, v_topic_career),
    (v_post_text2, v_topic_alumni)
  ON CONFLICT (post_id, topic_id) DO NOTHING;

  RAISE NOTICE '  Post-topic associations: 13';

  -- ═══════════════════════════════════════════════════════
  -- 5. HUDDLE BRANDING (landing page customization)
  -- ═══════════════════════════════════════════════════════

  INSERT INTO huddle_branding (
    tenant_id, banner_type, banner_overlay_opacity,
    primary_color, secondary_color,
    welcome_title, welcome_message, layout_config
  ) VALUES (
    v_tenant_id, 'none', 0.4,
    '#602D8F', '#F5F0FA',
    'Crusader Career Hub',
    'Welcome to the Holy Cross Team Huddle — your go-to resource for career development, academic insights, and alumni connections. Explore articles, videos, and guides curated by our career team, industry partners, and fellow Crusaders.',
    '{
      "topicSections": [],
      "showRecentFirst": true,
      "featuredLayout": "carousel"
    }'::jsonb
  ) ON CONFLICT (tenant_id) DO NOTHING;

  RAISE NOTICE '  Branding configured: Crusader Career Hub';

  -- ═══════════════════════════════════════════════════════
  -- 6. SEED SOME VIEWS AND BOOKMARKS FOR REALISM
  -- ═══════════════════════════════════════════════════════

  -- Clear any existing seed views/bookmarks for these posts (idempotency)
  DELETE FROM huddle_views WHERE post_id IN (
    v_post_video1, v_post_article1, v_post_pdf1, v_post_audio1,
    v_post_text1, v_post_article2, v_post_video2, v_post_text2
  );
  DELETE FROM huddle_bookmarks WHERE post_id IN (
    v_post_video1, v_post_article1, v_post_pdf1, v_post_audio1,
    v_post_text1, v_post_article2, v_post_video2, v_post_text2
  );

  -- Add huddle views from various students to make engagement look realistic
  INSERT INTO huddle_views (tenant_id, post_id, user_id) VALUES
    -- Video 1 (interview prep - most popular, 10 views)
    (v_tenant_id, v_post_video1, '80472271-0c44-4de1-b9f5-798f30836835'),  -- Aisha
    (v_tenant_id, v_post_video1, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),  -- Andre
    (v_tenant_id, v_post_video1, '14f2e408-b4cf-4a14-9e33-a8378308252f'),  -- Chloe
    (v_tenant_id, v_post_video1, '692cc248-84e4-4db2-a436-ca8503ca9b38'),  -- Daniel
    (v_tenant_id, v_post_video1, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),  -- Gabriela
    (v_tenant_id, v_post_video1, 'c05c7007-adf8-4b51-ade3-3e6e21d1d9d2'),  -- James
    (v_tenant_id, v_post_video1, 'bf35f147-2989-4114-bcd3-4766dc145c89'),  -- Liam
    (v_tenant_id, v_post_video1, 'ea747750-c38c-4fb4-845b-19ea16a115be'),  -- Megan
    (v_tenant_id, v_post_video1, '08ed4a83-56a4-4b4e-9111-e58530be708e'),  -- Priya
    (v_tenant_id, v_post_video1, '43dac835-8f54-4ae2-afe8-51ce045bd3d6'),  -- Ryan
    -- Article 1 (alumni career story, 7 views)
    (v_tenant_id, v_post_article1, '80472271-0c44-4de1-b9f5-798f30836835'),
    (v_tenant_id, v_post_article1, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    (v_tenant_id, v_post_article1, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    (v_tenant_id, v_post_article1, '692cc248-84e4-4db2-a436-ca8503ca9b38'),
    (v_tenant_id, v_post_article1, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),
    (v_tenant_id, v_post_article1, 'c05c7007-adf8-4b51-ade3-3e6e21d1d9d2'),
    (v_tenant_id, v_post_article1, '3683662f-fc46-4d58-a325-2c7609461dba'),  -- Sofia
    -- PDF (grad school timeline, 5 views)
    (v_tenant_id, v_post_pdf1, '80472271-0c44-4de1-b9f5-798f30836835'),
    (v_tenant_id, v_post_pdf1, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    (v_tenant_id, v_post_pdf1, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    (v_tenant_id, v_post_pdf1, 'ea747750-c38c-4fb4-845b-19ea16a115be'),
    (v_tenant_id, v_post_pdf1, '08ed4a83-56a4-4b4e-9111-e58530be708e'),
    -- Audio (internship podcast, 4 views)
    (v_tenant_id, v_post_audio1, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),
    (v_tenant_id, v_post_audio1, 'c05c7007-adf8-4b51-ade3-3e6e21d1d9d2'),
    (v_tenant_id, v_post_audio1, 'bf35f147-2989-4114-bcd3-4766dc145c89'),
    (v_tenant_id, v_post_audio1, '43dac835-8f54-4ae2-afe8-51ce045bd3d6'),
    -- Text 1 (study strategies, 6 views)
    (v_tenant_id, v_post_text1, '80472271-0c44-4de1-b9f5-798f30836835'),
    (v_tenant_id, v_post_text1, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    (v_tenant_id, v_post_text1, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    (v_tenant_id, v_post_text1, '692cc248-84e4-4db2-a436-ca8503ca9b38'),
    (v_tenant_id, v_post_text1, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),
    (v_tenant_id, v_post_text1, 'ea747750-c38c-4fb4-845b-19ea16a115be'),
    -- Article 2 (LinkedIn guide, 5 views)
    (v_tenant_id, v_post_article2, 'bf35f147-2989-4114-bcd3-4766dc145c89'),
    (v_tenant_id, v_post_article2, '43dac835-8f54-4ae2-afe8-51ce045bd3d6'),
    (v_tenant_id, v_post_article2, '08ed4a83-56a4-4b4e-9111-e58530be708e'),
    (v_tenant_id, v_post_article2, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    (v_tenant_id, v_post_article2, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    -- Video 2 (undergrad research, 3 views)
    (v_tenant_id, v_post_video2, '08ed4a83-56a4-4b4e-9111-e58530be708e'),
    (v_tenant_id, v_post_video2, 'ea747750-c38c-4fb4-845b-19ea16a115be'),
    (v_tenant_id, v_post_video2, '80472271-0c44-4de1-b9f5-798f30836835'),
    -- Text 2 (liberal arts skills, 8 views)
    (v_tenant_id, v_post_text2, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    (v_tenant_id, v_post_text2, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    (v_tenant_id, v_post_text2, '692cc248-84e4-4db2-a436-ca8503ca9b38'),
    (v_tenant_id, v_post_text2, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),
    (v_tenant_id, v_post_text2, 'c05c7007-adf8-4b51-ade3-3e6e21d1d9d2'),
    (v_tenant_id, v_post_text2, 'bf35f147-2989-4114-bcd3-4766dc145c89'),
    (v_tenant_id, v_post_text2, '43dac835-8f54-4ae2-afe8-51ce045bd3d6'),
    (v_tenant_id, v_post_text2, '3683662f-fc46-4d58-a325-2c7609461dba');

  -- Add bookmarks from a few students
  INSERT INTO huddle_bookmarks (tenant_id, post_id, user_id) VALUES
    -- Grad school PDF bookmarked by students planning for grad school
    (v_tenant_id, v_post_pdf1, '80472271-0c44-4de1-b9f5-798f30836835'),
    (v_tenant_id, v_post_pdf1, '08ed4a83-56a4-4b4e-9111-e58530be708e'),
    (v_tenant_id, v_post_pdf1, 'ea747750-c38c-4fb4-845b-19ea16a115be'),
    -- Interview video bookmarked by job-seeking students
    (v_tenant_id, v_post_video1, '14f2e408-b4cf-4a14-9e33-a8378308252f'),
    (v_tenant_id, v_post_video1, 'a5f530f8-468a-40e3-b53a-6be3a061636c'),
    (v_tenant_id, v_post_video1, 'c05c7007-adf8-4b51-ade3-3e6e21d1d9d2'),
    (v_tenant_id, v_post_video1, '692cc248-84e4-4db2-a436-ca8503ca9b38'),
    -- Study strategies bookmarked
    (v_tenant_id, v_post_text1, '80472271-0c44-4de1-b9f5-798f30836835'),
    (v_tenant_id, v_post_text1, 'e41f61e6-39e5-4df6-9227-55b392c63bde'),
    -- LinkedIn guide bookmarked
    (v_tenant_id, v_post_article2, '43dac835-8f54-4ae2-afe8-51ce045bd3d6'),
    (v_tenant_id, v_post_article2, 'bf35f147-2989-4114-bcd3-4766dc145c89')
  ON CONFLICT (user_id, post_id) DO NOTHING;

  RAISE NOTICE '  Views and bookmarks seeded for realistic engagement metrics';
  RAISE NOTICE 'Team Huddle seed complete!';
END $$;
