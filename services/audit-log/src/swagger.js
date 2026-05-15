const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Audit Log Service API',
      version: '1.0.0',
      description: 'Audit Log microservice for distributed file storage platform',
    },
    servers: [
      { url: 'http://localhost:3025', description: 'Local development' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
