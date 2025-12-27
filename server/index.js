const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, init } = require('./db');
const { generateFromPrompt } = require('./generate');

init();

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'keys.json');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'; // setze in Produktion z.B. https://your-domain.com

// --- Load persisted generated APIs (if any) ---
let generatedAPIs = {};
try {
  if (fs.existsSync(KEYS_FILE)) {
    const raw = fs.readFileSync(KEYS_FILE, 'utf8');
    generatedAPIs = JSON.parse(raw) || {};
    console.log(`Loaded ${Object.keys(generatedAPIs).length} generated API(s) from keys.json`);
  }
} catch (err) {
  console.warn('Could not load keys.json, starting with empty generatedAPIs', err);
}

// --- Helper to persist keys ---
function persistKeys() {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(generatedAPIs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist generated APIs to keys.json', err);
  }
}

// --- Basic CORS and preflight handling ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(bodyParser.json());

// --- Serve static UI from public/ ---
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'ui.html'));
  });
} else {
  console.warn('public directory not found. Create a public/ui.html to serve the UI.');
}

// --- Generate endpoint ---
app.post('/generate', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const result = generateFromPrompt(prompt);
  if (result.error) return res.status(400).json(result);

  const id = uuidv4();
  const key = uuidv4();
  generatedAPIs[id] = { id, key, prompt, runtime: result.runtime, spec: result.spec, createdAt: new Date().toISOString() };

  // persist to disk
  persistKeys();

  res.json({ id, apiKey: key, spec: result.spec, endpoints: result.runtime.endpoints });
});

// --- Optional: expose spec for a generated API ---
app.get('/specs/:id', (req, res) => {
  const id = req.params.id;
  const api = generatedAPIs[id];
  if (!api) return res.status(404).json({ error: 'spec not found' });
  res.json({ id: api.id, spec: api.spec, prompt: api.prompt, createdAt: api.createdAt });
});

// --- API key check middleware ---
function checkApiKey(req, res, next) {
  const key = req.header('x-api-key') || req.query.apiKey;
  if (!key) return res.status(401).json({ error: 'x-api-key required' });
  const found = Object.values(generatedAPIs).find(a => a.key === key);
  if (!found) return res.status(403).json({ error: 'invalid api key' });
  req.generatedApi = found;
  next();
}

// --- Orders endpoints ---
app.post('/orders', checkApiKey, (req, res) => {
  const { orderItems, totalAmount } = req.body;
  if (!Array.isArray(orderItems) || orderItems.length === 0) return res.status(400).json({ error: 'orderItems required' });
  if (typeof totalAmount !== 'number' || totalAmount < 0) return res.status(400).json({ error: 'totalAmount must be >= 0' });

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const order = { id, orderItems, totalAmount, status: 'pending', createdAt };
  const payload = JSON.stringify(order);
  db.run('INSERT INTO orders (id, payload, createdAt) VALUES (?, ?, ?)', [id, payload, createdAt], function(err) {
    if (err) {
      console.error('DB insert error', err);
      return res.status(500).json({ error: 'db error' });
    }
    res.status(201).json(order);
  });
});

app.get('/orders/:id', checkApiKey, (req, res) => {
  const id = req.params.id;
  db.get('SELECT payload FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('DB get error', err);
      return res.status(500).json({ error: 'db error' });
    }
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(JSON.parse(row.payload));
  });
});

// --- Optional: list generated APIs for management (protected by a simple admin key) ---
if (process.env.ADMIN_KEY) {
  app.get('/_admin/generated-apis', (req, res) => {
    const adminKey = req.header('x-admin-key') || req.query.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    res.json(Object.values(generatedAPIs));
  });
}

// --- Start server ---
const server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

// --- Graceful shutdown: persist keys on exit ---
function shutdown() {
  console.log('Shutting down, persisting keys...');
  try { persistKeys(); } catch (e) { /* ignore */ }
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
