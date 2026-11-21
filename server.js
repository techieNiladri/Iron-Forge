const express = require('express'); // Explicit framework entry point for Vercel.
const { createApp } = require('./ironforge-backend/app.cjs');
const app = createApp();
module.exports = app;
if (require.main === module && !process.env.VERCEL) {
  const server = app.listen(Number(process.env.PORT) || 3000, '127.0.0.1', () => console.log('Iron Forge started on loopback.'));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
