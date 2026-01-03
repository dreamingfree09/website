// SEO and meta tag utilities
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const truncate = (text, length = 160) => {
  if (text.length <= length) return text;
  return text.substring(0, length - 3) + '...';
};

// Generate meta tags for pages
const generateMetaTags = (options) => {
  const {
    title = 'Piqniq - Tech Community Platform',
    description = 'Join Piqniq, a vibrant community for tech enthusiasts. Share knowledge, ask questions, and grow together.',
    image = '/images/logo.png',
    url = 'http://localhost:3000',
    type = 'website',
    author = 'Piqniq',
    keywords = 'technology, programming, community, forum, learning, developers'
  } = options;

  const siteName = 'Piqniq';
  const twitterHandle = '@piqniq';

  return `
    <!-- Primary Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}">
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="keywords" content="${escapeHtml(keywords)}">
    <meta name="author" content="${escapeHtml(author)}">
    <meta name="robots" content="index, follow">
    <meta name="language" content="English">
    <meta name="revisit-after" content="7 days">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:url" content="${escapeHtml(url)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:site_name" content="${siteName}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${escapeHtml(url)}">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${escapeHtml(image)}">
    <meta property="twitter:site" content="${twitterHandle}">
    <meta property="twitter:creator" content="${twitterHandle}">
  `;
};

// Generate structured data (Schema.org JSON-LD)
const generateStructuredData = (type, data) => {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type
  };

  const schemas = {
    Organization: {
      ...baseData,
      name: 'Piqniq',
      url: 'http://localhost:3000',
      logo: 'http://localhost:3000/images/logo.png',
      description: 'A vibrant tech community platform for developers and enthusiasts',
      sameAs: [
        'https://github.com/piqniq',
        'https://twitter.com/piqniq'
      ]
    },
    
    WebSite: {
      ...baseData,
      name: 'Piqniq',
      url: 'http://localhost:3000',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'http://localhost:3000/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      }
    },
    
    DiscussionForumPosting: {
      ...baseData,
      headline: data.title,
      text: data.content,
      datePublished: data.createdAt,
      dateModified: data.updatedAt,
      author: {
        '@type': 'Person',
        name: data.author?.username || 'Anonymous'
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/LikeAction',
          userInteractionCount: data.likes?.length || 0
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'http://schema.org/CommentAction',
          userInteractionCount: data.replies?.length || 0
        }
      ]
    },

    Person: {
      ...baseData,
      name: data.username,
      url: `http://localhost:3000/profile.html?user=${data.username}`,
      description: data.bio,
      sameAs: [
        data.socialLinks?.github,
        data.socialLinks?.linkedin,
        data.socialLinks?.twitter,
        data.socialLinks?.website
      ].filter(Boolean)
    }
  };

  return schemas[type] || baseData;
};

module.exports = {
  generateMetaTags,
  generateStructuredData,
  escapeHtml,
  truncate
};
