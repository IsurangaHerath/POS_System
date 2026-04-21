const serverless = require('serverless-http');
const app = require('../../backend/src/app');

// Wrap the Express app with serverless-http
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Add some metadata if needed
  return await handler(event, context);
};
