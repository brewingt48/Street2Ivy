/**
 * Content Management API for Street2Ivy Admin Dashboard
 *
 * Allows administrators to manage landing page content including:
 * - Hero section (title, subtitle, images)
 * - Features section
 * - How It Works steps
 * - Testimonials (text and video)
 * - CTA sections
 */

const fs = require('fs');
const path = require('path');

// Content storage file path
const CONTENT_FILE = path.join(__dirname, '../../data/landing-content.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default content structure
const defaultContent = {
  branding: {
    id: 'branding',
    section: 'branding',
    logoUrl: null,
    logoHeight: 36, // 24, 36, or 48
    tagline: 'Connecting Ivy League Talent with Industry Leaders',
    taglineColor: null, // Custom color for tagline (hex or rgba)
    siteDescription: null, // Additional description text below the hero subtitle
    siteDescriptionColor: null, // Custom color for site description
    faviconUrl: null,
    // Social media links
    socialFacebook: null,
    socialTwitter: null,
    socialInstagram: null,
    socialLinkedin: null,
    socialYoutube: null,
    socialTiktok: null,
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  hero: {
    id: 'hero',
    section: 'hero',
    title: 'Connect Ivy League Talent with Industry Leaders',
    titleColor: null, // Custom color for hero title
    subtitle:
      'Street2Ivy bridges the gap between elite university students and Fortune 500 companies through meaningful project-based collaborations.',
    subtitleColor: null, // Custom color for hero subtitle
    primaryButtonText: 'Get Started',
    primaryButtonBgColor: null, // Custom background color for primary button
    primaryButtonTextColor: null, // Custom text color for primary button
    secondaryButtonText: 'Sign In',
    secondaryButtonBorderColor: null, // Custom border color for secondary button
    secondaryButtonTextColor: null, // Custom text color for secondary button
    backgroundImage: null,
    backgroundVideo: null,
    backgroundType: 'image', // 'image' or 'video'
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  features: {
    id: 'features',
    section: 'features',
    sectionTitle: 'Why Street2Ivy',
    items: [
      {
        id: 'feature-1',
        icon: '🎓',
        title: 'Elite Talent Pool',
        description:
          'Access pre-vetted students from top universities including Harvard, Yale, Princeton, and more.',
      },
      {
        id: 'feature-2',
        icon: '💼',
        title: 'Real Projects',
        description:
          'Engage students with meaningful work that makes a real impact on your business.',
      },
      {
        id: 'feature-3',
        icon: '🤝',
        title: 'Seamless Collaboration',
        description:
          'Our platform handles contracts, payments, and communication so you can focus on results.',
      },
    ],
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  howItWorks: {
    id: 'howItWorks',
    section: 'howItWorks',
    sectionTitle: 'How It Works',
    items: [
      {
        id: 'step-1',
        number: '1',
        title: 'Post Your Project',
        description:
          'Describe your project needs and requirements. Our team will help match you with the right talent.',
      },
      {
        id: 'step-2',
        number: '2',
        title: 'Review Applications',
        description:
          'Browse qualified candidates, review portfolios, and select the perfect match for your project.',
      },
      {
        id: 'step-3',
        number: '3',
        title: 'Collaborate & Succeed',
        description:
          'Work together through our secure platform with built-in tools for communication and delivery.',
      },
    ],
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  videoTestimonial: {
    id: 'videoTestimonial',
    section: 'videoTestimonial',
    sectionTitle: 'Hear From Our Community',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    videoPlaceholderText: 'Click to play video testimonial',
    thumbnailUrl: null,
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  testimonials: {
    id: 'testimonials',
    section: 'testimonials',
    sectionTitle: 'What People Are Saying',
    items: [
      {
        id: 'testimonial-1',
        quote:
          'Street2Ivy connected me with an amazing internship opportunity at a Fortune 500 company. The experience was invaluable!',
        author: 'Sarah Chen',
        role: 'Harvard University, Class of 2024',
        initials: 'SC',
        avatarUrl: null,
      },
      {
        id: 'testimonial-2',
        quote:
          'The quality of talent we found through Street2Ivy exceeded our expectations. These students brought fresh perspectives to our projects.',
        author: 'Michael Roberts',
        role: 'VP of Innovation, Tech Corp',
        initials: 'MR',
        avatarUrl: null,
      },
      {
        id: 'testimonial-3',
        quote:
          'As a first-generation college student, Street2Ivy gave me access to opportunities I never knew existed.',
        author: 'James Williams',
        role: 'Yale University, Class of 2025',
        initials: 'JW',
        avatarUrl: null,
      },
      {
        id: 'testimonial-4',
        quote:
          "We've hired three full-time employees from Street2Ivy projects. It's become our primary talent pipeline.",
        author: 'Emily Thompson',
        role: 'HR Director, Global Finance Inc',
        initials: 'ET',
        avatarUrl: null,
      },
      {
        id: 'testimonial-5',
        quote:
          'The platform made it easy to showcase my skills and connect with companies that value diversity and fresh thinking.',
        author: 'David Park',
        role: 'Princeton University, Class of 2024',
        initials: 'DP',
        avatarUrl: null,
      },
      {
        id: 'testimonial-6',
        quote:
          "Street2Ivy's vetting process ensures we only work with the most motivated and talented students.",
        author: 'Lisa Anderson',
        role: 'CEO, StartUp Ventures',
        initials: 'LA',
        avatarUrl: null,
      },
    ],
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  cta: {
    id: 'cta',
    section: 'cta',
    title: 'Ready to Get Started?',
    description:
      'Join thousands of students and companies already using Street2Ivy to create meaningful connections.',
    buttonText: 'Create Your Account',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
  legalPages: {
    id: 'legalPages',
    section: 'legalPages',
    privacyPolicy: {
      title: 'Privacy Policy',
      content: '',
      lastUpdated: null,
      isActive: true,
    },
    termsOfService: {
      title: 'Terms of Service',
      content: '',
      lastUpdated: null,
      isActive: true,
    },
    cookiePolicy: {
      title: 'Cookie Policy',
      content: '',
      lastUpdated: null,
      isActive: true,
    },
    disclaimer: {
      title: 'Disclaimer',
      content: '',
      lastUpdated: null,
      isActive: false,
    },
    acceptableUse: {
      title: 'Acceptable Use Policy',
      content: '',
      lastUpdated: null,
      isActive: false,
    },
    refundPolicy: {
      title: 'Refund Policy',
      content: '',
      lastUpdated: null,
      isActive: false,
    },
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  },
};

/**
 * Load content from file or return defaults
 * Merges saved content with defaults to ensure new sections are always available
 */
function loadContent() {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      const data = fs.readFileSync(CONTENT_FILE, 'utf8');
      const savedContent = JSON.parse(data);
      // Merge with defaults to ensure new sections (like branding) are available
      return { ...defaultContent, ...savedContent };
    }
  } catch (error) {
    console.error('Error loading content file:', error);
  }
  return defaultContent;
}

/**
 * Save content to file
 */
function saveContent(content) {
  try {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving content file:', error);
    return false;
  }
}

/**
 * GET /api/admin/content
 * Get all landing page content
 */
const getContent = (req, res) => {
  try {
    const content = loadContent();
    res.status(200).json({
      data: content,
      meta: {
        lastUpdated: Object.values(content).reduce((latest, section) => {
          const sectionDate = new Date(section.updatedAt);
          return sectionDate > new Date(latest) ? section.updatedAt : latest;
        }, '1970-01-01'),
      },
    });
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
};

/**
 * GET /api/admin/content/:section
 * Get specific section content
 */
const getSection = (req, res) => {
  try {
    const { section } = req.params;
    const content = loadContent();

    if (!content[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.status(200).json({ data: content[section] });
  } catch (error) {
    console.error('Error getting section:', error);
    res.status(500).json({ error: 'Failed to load section' });
  }
};

/**
 * PUT /api/admin/content/:section
 * Update specific section content
 */
const updateSection = (req, res) => {
  try {
    const { section } = req.params;
    const updates = req.body;
    const content = loadContent();

    if (!content[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Get user info from request (set by auth middleware)
    const userId = req.user?.id || req.body.userId || 'system';

    // Merge updates with existing content
    content[section] = {
      ...content[section],
      ...updates,
      id: section,
      section: section,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    // Save to file
    if (!saveContent(content)) {
      return res.status(500).json({ error: 'Failed to save content' });
    }

    res.status(200).json({
      data: content[section],
      message: 'Content updated successfully',
    });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
};

/**
 * POST /api/admin/content/:section/items
 * Add an item to a section (testimonials, features, etc.)
 */
const addItem = (req, res) => {
  try {
    const { section } = req.params;
    const newItem = req.body;
    const content = loadContent();

    if (!content[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (!content[section].items) {
      return res.status(400).json({ error: 'Section does not support items' });
    }

    const userId = req.user?.id || req.body.userId || 'system';

    // Generate unique ID for new item
    const itemId = `${section}-item-${Date.now()}`;
    const item = {
      ...newItem,
      id: itemId,
    };

    content[section].items.push(item);
    content[section].updatedAt = new Date().toISOString();
    content[section].updatedBy = userId;

    if (!saveContent(content)) {
      return res.status(500).json({ error: 'Failed to save content' });
    }

    res.status(201).json({
      data: item,
      message: 'Item added successfully',
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

/**
 * PUT /api/admin/content/:section/items/:itemId
 * Update an item in a section
 */
const updateItem = (req, res) => {
  try {
    const { section, itemId } = req.params;
    const updates = req.body;
    const content = loadContent();

    if (!content[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (!content[section].items) {
      return res.status(400).json({ error: 'Section does not support items' });
    }

    const userId = req.user?.id || req.body.userId || 'system';
    const itemIndex = content[section].items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    content[section].items[itemIndex] = {
      ...content[section].items[itemIndex],
      ...updates,
      id: itemId,
    };
    content[section].updatedAt = new Date().toISOString();
    content[section].updatedBy = userId;

    if (!saveContent(content)) {
      return res.status(500).json({ error: 'Failed to save content' });
    }

    res.status(200).json({
      data: content[section].items[itemIndex],
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

/**
 * DELETE /api/admin/content/:section/items/:itemId
 * Delete an item from a section
 */
const deleteItem = (req, res) => {
  try {
    const { section, itemId } = req.params;
    const content = loadContent();

    if (!content[section]) {
      return res.status(404).json({ error: 'Section not found' });
    }

    if (!content[section].items) {
      return res.status(400).json({ error: 'Section does not support items' });
    }

    const userId = req.user?.id || req.body?.userId || 'system';
    const itemIndex = content[section].items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const deletedItem = content[section].items.splice(itemIndex, 1)[0];
    content[section].updatedAt = new Date().toISOString();
    content[section].updatedBy = userId;

    if (!saveContent(content)) {
      return res.status(500).json({ error: 'Failed to save content' });
    }

    res.status(200).json({
      data: deletedItem,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

/**
 * POST /api/admin/content/reset
 * Reset content to defaults
 */
const resetContent = (req, res) => {
  try {
    const userId = req.user?.id || req.body?.userId || 'system';

    // Add updated info to default content
    const resetData = { ...defaultContent };
    Object.keys(resetData).forEach(section => {
      resetData[section].updatedAt = new Date().toISOString();
      resetData[section].updatedBy = userId;
    });

    if (!saveContent(resetData)) {
      return res.status(500).json({ error: 'Failed to reset content' });
    }

    res.status(200).json({
      data: resetData,
      message: 'Content reset to defaults successfully',
    });
  } catch (error) {
    console.error('Error resetting content:', error);
    res.status(500).json({ error: 'Failed to reset content' });
  }
};

/**
 * GET /api/content (Public endpoint)
 * Get published landing page content for the frontend
 */
const getPublicContent = (req, res) => {
  try {
    const content = loadContent();

    // Filter to only active sections
    const publicContent = {};
    Object.keys(content).forEach(section => {
      if (content[section].isActive) {
        publicContent[section] = content[section];
      }
    });

    res.status(200).json({ data: publicContent });
  } catch (error) {
    console.error('Error getting public content:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
};

/**
 * GET /api/legal/:pageType (Public endpoint)
 * Get a specific legal page for public display
 */
const getLegalPage = (req, res) => {
  try {
    const { pageType } = req.params;
    const content = loadContent();

    if (!content.legalPages) {
      return res.status(404).json({ error: 'Legal pages not configured' });
    }

    const legalPages = content.legalPages;
    const pageData = legalPages[pageType];

    if (!pageData) {
      return res.status(404).json({ error: 'Legal page not found' });
    }

    if (!pageData.isActive) {
      return res.status(404).json({ error: 'Legal page not available' });
    }

    res.status(200).json({
      data: {
        title: pageData.title,
        content: pageData.content,
        lastUpdated: pageData.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Error getting legal page:', error);
    res.status(500).json({ error: 'Failed to load legal page' });
  }
};

/**
 * GET /api/legal (Public endpoint)
 * Get list of all active legal pages (without full content)
 */
const getLegalPagesList = (req, res) => {
  try {
    const content = loadContent();

    if (!content.legalPages) {
      return res.status(200).json({ data: [] });
    }

    const legalPages = content.legalPages;
    const activePages = [];

    const pageTypes = ['privacyPolicy', 'termsOfService', 'cookiePolicy', 'disclaimer', 'acceptableUse', 'refundPolicy'];

    pageTypes.forEach(pageType => {
      const pageData = legalPages[pageType];
      if (pageData && pageData.isActive) {
        activePages.push({
          key: pageType,
          title: pageData.title,
          lastUpdated: pageData.lastUpdated,
          slug: pageType.replace(/([A-Z])/g, '-$1').toLowerCase(), // privacyPolicy -> privacy-policy
        });
      }
    });

    res.status(200).json({ data: activePages });
  } catch (error) {
    console.error('Error getting legal pages list:', error);
    res.status(500).json({ error: 'Failed to load legal pages' });
  }
};

module.exports = {
  getContent,
  getSection,
  updateSection,
  addItem,
  updateItem,
  deleteItem,
  resetContent,
  getPublicContent,
  getLegalPage,
  getLegalPagesList,
  loadContent,
};
