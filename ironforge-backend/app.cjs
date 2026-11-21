const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields = 'id,exercise,weight,reps,sets,created_at,client_request_id';
function configFromEnvironment(env = process.env) {
  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } = env;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  const endpoint = new URL(url);
  if (!['https:', 'http:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/') throw new Error('Invalid Auth endpoint.');
  if (endpoint.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)) throw new Error('HTTP is allowed only for local Auth.');
  if (key.startsWith('eyJ')) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role; } catch { throw new Error('Invalid public key.'); }
    if (role !== 'anon') throw new Error('Privileged API keys are not allowed.');
  } else if (!key.startsWith('sb_publishable_')) throw new Error('Only a publishable key is allowed.');
  return { url: endpoint.origin, key };
}
function validateWorkout(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['exercise','weight','reps','sets','client_request_id'].includes(key))) return null;
  const { exercise, weight, reps, sets, client_request_id } = body;
  if (typeof exercise !== 'string' || !exercise.trim() || exercise.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(exercise)) return null;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 10000 || Math.abs(weight * 100 - Math.round(weight * 100)) > 0.000001) return null;
  if (![reps, sets].every(value => Number.isInteger(value) && value >= 1 && value <= 1000)) return null;
  if (typeof client_request_id !== 'string' || !UUID.test(client_request_id)) return null;
  return { exercise: exercise.trim(), weight, reps, sets, client_request_id };
}
function createApp({ config, makeClient = createClient, logger = console } = {}) {
  config ||= configFromEnvironment();
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], connectSrc: ["'self'", config.url],
    imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"],
    upgradeInsecureRequests: config.url.startsWith('http:') ? null : [],
  } }, referrerPolicy: { policy: 'no-referrer' } }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  app.get('/api/config', (req, res) => res.json({ supabaseUrl: config.url, supabasePublishableKey: config.key }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/workouts', async (req, res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '')?.[1];
    if (!token || token.length > 16384) return res.status(401).json({ error: 'Sign in to access your workouts.' });
    try {
      const client = makeClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` }, fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
      });
      const { data, error } = await client.auth.getUser(token);
      if (error) return res.status(!error.status || error.status >= 500 ? 503 : 401).json({ error: !error.status || error.status >= 500 ? 'Sign-in service is temporarily unavailable. Try again.' : 'Your session expired. Sign in again.' });
      if (!data.user || !UUID.test(data.user.id) || data.user.is_anonymous) return res.status(401).json({ error: 'Sign in to access your workouts.' });
      req.userId = data.user.id;
      req.db = client;
      next();
    } catch { res.status(503).json({ error: 'Sign-in service is temporarily unavailable. Try again.' }); }
  });
  app.use(express.json({ limit: '8kb', strict: true }));
  app.get('/api/workouts', async (req, res, next) => {
    if (req.query.before !== undefined && (typeof req.query.before !== 'string' || !/^[1-9]\d{0,9}$/.test(req.query.before) || Number(req.query.before) > 2147483647)) return res.status(400).json({ error: 'Invalid page cursor.' });
    try {
      let query = req.db.from('workouts').select(fields).eq('user_id', req.userId).order('id', { ascending: false }).limit(51);
      if (req.query.before) query = query.lt('id', req.query.before);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data.slice(0, 50);
      res.json({ workouts: rows, nextCursor: data.length > 50 ? rows.at(-1).id : null });
    } catch (error) { next(error); }
  });
  app.post('/api/workouts', async (req, res, next) => {
    const input = validateWorkout(req.body);
    if (!input) return res.status(400).json({ error: 'Use an exercise name (up to 120 characters), weight from 0 to 10000 with at most 2 decimals, and whole reps/sets from 1 to 1000.' });
    try {
      const { data, error } = await req.db.from('workouts').insert({ ...input, user_id: req.userId }).select(fields).single();
      if (error?.code === '23505') {
        const found = await req.db.from('workouts').select(fields).eq('user_id', req.userId).eq('client_request_id', input.client_request_id).single();
        if (found.error) throw found.error;
        if (!['exercise','weight','reps','sets'].every(key => found.data[key] === input[key])) return res.status(409).json({ error: 'This request was already used for a different workout. Reload and try again.' });
        return res.json({ workout: found.data });
      }
      if (error) throw error;
      res.status(201).json({ workout: data });
    } catch (error) { next(error); }
  });
  app.delete('/api/workouts/:id', async (req, res, next) => {
    const id = Number(req.params.id);
    if (!/^[1-9]\d{0,9}$/.test(req.params.id) || !Number.isSafeInteger(id) || id > 2147483647) return res.status(400).json({ error: 'Invalid workout ID.' });
    try {
      const { data, error } = await req.db.from('workouts').delete().eq('id', id).eq('user_id', req.userId).select('id');
      if (error) throw error;
      if (!data.length) return res.status(404).json({ error: 'Workout not found.' });
      res.json({ message: 'Workout deleted.' });
    } catch (error) { next(error); }
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny', index: 'index.html' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    logger.error('Iron Forge request failed', { code: /^[A-Z0-9]{5}$/.test(error.code || '') ? error.code : 'INTERNAL' });
    res.status(503).json({ error: 'Workouts are temporarily unavailable. Your input was kept; please try again.' });
  });
  return app;
}
module.exports = { createApp, configFromEnvironment, validateWorkout };
