const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Central Logging Service API',
      version: '1.0.0',
      description: 'Central Logging microservice for distributed file storage platform',
    },
    servers: [
      { url: 'http://localhost:3026', description: 'Local development' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
