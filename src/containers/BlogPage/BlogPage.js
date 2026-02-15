import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import { fetchPublicBlogPosts, fetchPublicBlogPost } from '../../util/api';

import css from './BlogPage.module.css';

// Security: HTML sanitization to prevent XSS attacks
const sanitizeHtml = (html) => {
  if (!html) return '';
  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Block data: URLs that could contain executable content
    .replace(/data:\s*text\/html/gi, 'data-blocked:text/html')
    // Remove expression() CSS (IE vulnerability)
    .replace(/expression\s*\(/gi, 'blocked(')
    // Remove meta refresh
    .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
};

const BlogPage = props => {
  const { scrollingDisabled } = props;
  const intl = useIntl();
  const history = useHistory();
  const { slug } = useParams();

  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ category: '', search: '' });
  const [pagination, setPagination] = useState(null);

  // Fetch posts or single post based on URL
  useEffect(() => {
    if (slug) {
      // Fetch single post
      setLoading(true);
      fetchPublicBlogPost(slug)
        .then(response => {
          setSelectedPost(response.post);
          setLoading(false);
        })
        .catch(err => {
          setError('Post not found');
          setLoading(false);
        });
    } else {
      // Fetch list of posts
      setLoading(true);
      fetchPublicBlogPosts(filter)
        .then(response => {
          setPosts(response.posts || []);
          setCategories(response.categories || []);
          setPagination(response.pagination);
          setLoading(false);
        })
        .catch(err => {
          setError('Failed to load blog posts');
          setLoading(false);
        });
    }
  }, [slug, filter]);

  const handleCategoryFilter = (category) => {
    setFilter({ ...filter, category: category === filter.category ? '' : category });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const pageTitle = selectedPost
    ? `${selectedPost.title} | Blog`
    : intl.formatMessage({ id: 'BlogPage.title', defaultMessage: 'Blog' });

  // Single post view
  if (slug && selectedPost) {
    return (
      <Page
        className={css.root}
        scrollingDisabled={scrollingDisabled}
        title={pageTitle}
        description={selectedPost.excerpt}
      >
        <LayoutSingleColumn
          topbar={<TopbarContainer currentPage="BlogPage" />}
          footer={<FooterContainer />}
        >
          <article className={css.postDetail}>
            <div className={css.postHeader}>
              <NamedLink name="BlogPage" className={css.backLink}>
                ← Back to Blog
              </NamedLink>
              <div className={css.postMeta}>
                <span className={css.postCategory}>{selectedPost.category}</span>
                <span className={css.postDate}>{formatDate(selectedPost.publishedAt)}</span>
              </div>
              <h1 className={css.postTitle}>{selectedPost.title}</h1>
              {selectedPost.authorName && (
                <p className={css.postAuthor}>By {selectedPost.authorName}</p>
              )}
            </div>

            {selectedPost.featuredImage && (
              <div className={css.featuredImage}>
                <img src={selectedPost.featuredImage} alt={selectedPost.title} />
              </div>
            )}

            <div
              className={css.postContent}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedPost.content) }}
            />

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className={css.postTags}>
                {selectedPost.tags.map(tag => (
                  <span key={tag} className={css.tag}>{tag}</span>
                ))}
              </div>
            )}
          </article>
        </LayoutSingleColumn>
      </Page>
    );
  }

  // Blog list view
  return (
    <Page
      className={css.root}
      scrollingDisabled={scrollingDisabled}
      title={pageTitle}
      description={intl.formatMessage({ id: 'BlogPage.description', defaultMessage: 'News, tips, and insights from ProveGround' })}
    >
      <LayoutSingleColumn
        topbar={<TopbarContainer currentPage="BlogPage" />}
        footer={<FooterContainer />}
      >
        <div className={css.blogContainer}>
          <header className={css.blogHeader}>
            <h1 className={css.pageTitle}>
              <FormattedMessage id="BlogPage.heading" defaultMessage="Blog" />
            </h1>
            <p className={css.pageSubtitle}>
              <FormattedMessage
                id="BlogPage.subtitle"
                defaultMessage="News, tips, and success stories from our community"
              />
            </p>
          </header>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className={css.categoryFilter}>
              <button
                type="button"
                className={classNames(css.categoryBtn, { [css.categoryBtnActive]: !filter.category })}
                onClick={() => setFilter({ ...filter, category: '' })}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={classNames(css.categoryBtn, { [css.categoryBtnActive]: filter.category === cat })}
                  onClick={() => handleCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Posts Grid */}
          {loading ? (
            <div className={css.loading}>Loading...</div>
          ) : error ? (
            <div className={css.error}>{error}</div>
          ) : posts.length === 0 ? (
            <div className={css.empty}>
              <p>No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className={css.postsGrid}>
              {posts.map(post => (
                <article key={post.id} className={css.postCard}>
                  {post.featuredImage && (
                    <div className={css.cardImage}>
                      <img src={post.featuredImage} alt={post.title} />
                    </div>
                  )}
                  <div className={css.cardContent}>
                    <div className={css.cardMeta}>
                      <span className={css.cardCategory}>{post.category}</span>
                      <span className={css.cardDate}>{formatDate(post.publishedAt)}</span>
                    </div>
                    <h2 className={css.cardTitle}>
                      <NamedLink name="BlogPostPage" params={{ slug: post.slug }}>
                        {post.title}
                      </NamedLink>
                    </h2>
                    {post.excerpt && (
                      <p className={css.cardExcerpt}>{post.excerpt}</p>
                    )}
                    <NamedLink
                      name="BlogPostPage"
                      params={{ slug: post.slug }}
                      className={css.readMore}
                    >
                      Read more →
                    </NamedLink>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className={css.pagination}>
              Page {pagination.page} of {pagination.totalPages}
            </div>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default BlogPage;
