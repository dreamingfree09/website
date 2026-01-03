/**
 * config/swagger.js
 *
 * Swagger/OpenAPI configuration for API documentation at /api-docs.
 */
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Piqniq API Documentation',
      version: '2.0.0',
      description: 'Comprehensive API documentation for the Piqniq community platform',
      contact: {
        name: 'Piqniq Support',
        url: 'https://piqniq.com',
        email: 'support@piqniq.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.piqniq.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatar: { type: 'string' },
            bio: { type: 'string' },
            reputation: { type: 'number' },
            role: { type: 'string', enum: ['member', 'moderator', 'admin'] },
            badges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  icon: { type: 'string' },
                  earnedAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            likes: { type: 'array', items: { type: 'string' } },
            views: { type: 'number' },
            isPinned: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            replies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  author: { $ref: '#/components/schemas/User' },
                  content: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' }
                }
              }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Posts', description: 'Forum posts management' },
      { name: 'Profile', description: 'User profile operations' },
      { name: 'Admin', description: 'Admin panel operations' },
      { name: 'System', description: 'System health and utilities' },
      { name: 'Upload', description: 'File upload endpoints' }
    ]
  },
  apis: ['./routes/*.js'] // Path to API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
