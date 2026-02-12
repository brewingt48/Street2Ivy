const db = require('../../api-util/db');
const { getSdk } = require('../../api-util/sdk');

// SECURITY: Sanitize HTML content to prevent XSS
const sanitizeHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');
};

// Generate URL-friendly slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

// Generate unique ID
const generateId = () => {
  return `blog-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Seed default categories if none exist
(function seedDefaults() {
  const cats = db.blogCategories.getAll();
  if (cats.length === 0) {
    ['News', 'Tips & Advice', 'Success Stories', 'Industry Insights', 'Platform Updates'].forEach(c =>
      db.blogCategories.add(c)
    );
  }
  const settings = db.blogSettings.getAll();
  if (Object.keys(settings).length === 0) {
    db.blogSettings.setMany({
      postsPerPage: 10,
      enableComments: false,
      moderateComments: true,
    });
  }
})();

/**
 * Verify the current user is a system admin
 */
async function verifySystemAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'system-admin') {
    return null;
  }

  return currentUser;
}

/**
 * GET /api/admin/blog/posts
 */
async function listPosts(req, res) {
  const { page = '1', perPage = '20', status, category, search } = req.query;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    let posts = db.blogPosts.getAll();

    // Apply filters
    if (status) {
      posts = posts.filter(p => p.status === status);
    }
    if (category) {
      posts = posts.filter(p => p.category === category);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.excerpt?.toLowerCase().includes(searchLower) ||
        p.content?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first) — already sorted by db query, but re-sort after filtering
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const endIndex = startIndex + perPageNum;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    const categories = db.blogCategories.getAll();

    res.status(200).json({
      posts: paginatedPosts,
      categories,
      pagination: {
        totalItems: posts.length,
        totalPages: Math.ceil(posts.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
    });
  } catch (error) {
    console.error('List blog posts error:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts.' });
  }
}

/**
 * GET /api/admin/blog/posts/:postId
 */
async function getPost(req, res) {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const post = db.blogPosts.getById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.status(200).json({ post });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Failed to fetch blog post.' });
  }
}

/**
 * POST /api/admin/blog/posts
 */
async function createPost(req, res) {
  const {
    title,
    content,
    excerpt,
    category,
    tags = [],
    status = 'draft',
    featuredImage,
    publishedAt,
  } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be 200 characters or less.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const newPost = {
      id: generateId(),
      title: title.trim(),
      slug: generateSlug(title),
      content: sanitizeHtml(content || ''),
      excerpt: excerpt?.trim() || '',
      category: category || 'News',
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      featuredImage: featuredImage || null,
      authorId: admin.id.uuid,
      authorName: admin.attributes.profile.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: status === 'published' ? (publishedAt || new Date().toISOString()) : null,
      viewCount: 0,
    };

    db.blogPosts.create(newPost);

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully.',
      post: newPost,
    });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ error: 'Failed to create blog post.' });
  }
}

/**
 * PUT /api/admin/blog/posts/:postId
 */
async function updatePost(req, res) {
  const { postId } = req.params;
  const updates = req.body;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const existingPost = db.blogPosts.getById(postId);

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const wasPublished = existingPost.status === 'published';
    const isNowPublished = updates.status === 'published';

    // Build update object
    const updateObj = {
      ...(updates.title && { title: updates.title.trim(), slug: generateSlug(updates.title) }),
      ...(updates.content !== undefined && { content: sanitizeHtml(updates.content) }),
      ...(updates.excerpt !== undefined && { excerpt: updates.excerpt?.trim() || '' }),
      ...(updates.category && { category: updates.category }),
      ...(updates.tags && { tags: Array.isArray(updates.tags) ? updates.tags.slice(0, 10) : existingPost.tags }),
      ...(updates.status && { status: ['draft', 'published', 'archived'].includes(updates.status) ? updates.status : existingPost.status }),
      ...(updates.featuredImage !== undefined && { featuredImage: updates.featuredImage }),
      updatedAt: new Date().toISOString(),
      updatedBy: admin.id.uuid,
    };

    // Set publishedAt when first published
    if (!wasPublished && isNowPublished && !existingPost.publishedAt) {
      updateObj.publishedAt = new Date().toISOString();
    }

    const updatedPost = db.blogPosts.update(postId, updateObj);

    res.status(200).json({
      success: true,
      message: 'Blog post updated successfully.',
      post: updatedPost,
    });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ error: 'Failed to update blog post.' });
  }
}

/**
 * DELETE /api/admin/blog/posts/:postId
 */
async function deletePost(req, res) {
  const { postId } = req.params;

  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const post = db.blogPosts.getById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    db.blogPosts.delete(postId);

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully.',
    });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ error: 'Failed to delete blog post.' });
  }
}

/**
 * GET /api/admin/blog/categories
 */
async function listCategories(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const categories = db.blogCategories.getAll();
    res.status(200).json({ categories });
  } catch (error) {
    console.error('List categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
}

/**
 * POST /api/admin/blog/categories
 */
async function addCategory(req, res) {
  const { category } = req.body;

  if (!category || category.trim().length === 0) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    if (db.blogCategories.exists(category.trim())) {
      return res.status(400).json({ error: 'Category already exists.' });
    }

    db.blogCategories.add(category.trim());

    res.status(201).json({
      success: true,
      message: 'Category added successfully.',
      categories: db.blogCategories.getAll(),
    });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ error: 'Failed to add category.' });
  }
}

/**
 * DELETE /api/admin/blog/categories/:category
 */
async function deleteCategory(req, res) {
  const { category } = req.params;

  if (!category) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const decodedCategory = decodeURIComponent(category);
    if (!db.blogCategories.exists(decodedCategory)) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    db.blogCategories.delete(decodedCategory);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
      categories: db.blogCategories.getAll(),
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
}

/**
 * PUT /api/admin/blog/settings
 */
async function updateSettings(req, res) {
  const settings = req.body;

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    db.blogSettings.setMany(settings);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully.',
      settings: db.blogSettings.getAll(),
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
}

// ================ Public Endpoints ================ //

/**
 * GET /api/blog/posts
 */
async function listPublicPosts(req, res) {
  const { page = '1', perPage = '10', category, tag, search } = req.query;

  try {
    let posts = db.blogPosts.getAll().filter(p => p.status === 'published');

    // Apply filters
    if (category) {
      posts = posts.filter(p => p.category === category);
    }
    if (tag) {
      posts = posts.filter(p => p.tags?.includes(tag));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.excerpt?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by publishedAt date (newest first)
    posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Pagination
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const endIndex = startIndex + perPageNum;
    const paginatedPosts = posts.slice(startIndex, endIndex);

    // Remove full content from list view for performance
    const postsForList = paginatedPosts.map(({ content, ...rest }) => rest);

    const categories = db.blogCategories.getAll();

    res.status(200).json({
      posts: postsForList,
      categories,
      pagination: {
        totalItems: posts.length,
        totalPages: Math.ceil(posts.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
    });
  } catch (error) {
    console.error('List public blog posts error:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts.' });
  }
}

/**
 * GET /api/blog/posts/:slug
 */
async function getPublicPost(req, res) {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: 'Post slug is required.' });
  }

  try {
    const post = db.blogPosts.getBySlug(slug);

    if (!post || post.status !== 'published') {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Increment view count
    db.blogPosts.incrementViewCount(post.id);

    // Return with updated view count
    const updated = db.blogPosts.getById(post.id);
    res.status(200).json({ post: updated });
  } catch (error) {
    console.error('Get public blog post error:', error);
    res.status(500).json({ error: 'Failed to fetch blog post.' });
  }
}

module.exports = {
  // Admin endpoints
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listCategories,
  addCategory,
  deleteCategory,
  updateSettings,
  // Public endpoints
  listPublicPosts,
  getPublicPost,
};
