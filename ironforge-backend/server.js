// Legacy entry point; install and run using the root package scripts.
const app = require('../server');
module.exports = app;
if (require.main === module) app.listen(Number(process.env.PORT) || 3000, '127.0.0.1');
