require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, init } = require('./db');
const { OpenAIGenerator } = require('./openai-generator');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Initialize database
init();

// Initialize OpenAI Generator
const generator = new OpenAIGenerator();

const app = express();

// --- Config ---
const PORT = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'keys.json');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// --- Load persisted generated APIs (if any) ---
let generatedAPIs = {};
try {
  if (fs.existsSync(KEYS_FILE)) {
    const raw = fs.readFileSync(KEYS_FILE, 'utf8');
    generatedAPIs = JSON.parse(raw) || {};
    console.log(`✓ Loaded ${Object.keys(generatedAPIs).length} generated API(s) from keys.json`);
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

// --- Health check endpoint ---
app.get('/health', (req, res) => {
  const openaiEnabled = !!process.env.OPENAI_API_KEY;
  res.json({
    status: 'healthy',
    version: '1.0.0',
    features: {
      openai: openaiEnabled,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    generatedApis: Object.keys(generatedAPIs).length
  });
});

// --- Swagger API Documentation ---
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- Serve static UI from public/ ---
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  // Track file modifications for live reload
  const fileStats = new Map();

  app.use(express.static(publicDir));

  // Serve main UI with cache headers for live reload
  app.get('/', (req, res) => {
    const uiPath = path.join(publicDir, 'ui.html');

    // Check if file exists
    if (!fs.existsSync(uiPath)) {
      return res.status(404).send('ui.html not found');
    }

    const stats = fs.statSync(uiPath);
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

    // Check ETag for conditional request
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());

    res.sendFile(uiPath);
  });

  // Research page
  app.get('/research', (req, res) => {
    const researchPath = path.join(publicDir, 'research.html');

    if (!fs.existsSync(researchPath)) {
      return res.status(404).send('research.html not found');
    }

    const stats = fs.statSync(researchPath);
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());

    res.sendFile(researchPath);
  });

  // API Suite page
  app.get('/api-suite', (req, res) => {
    const suitePath = path.join(publicDir, 'api-suite.html');

    if (!fs.existsSync(suitePath)) {
      return res.status(404).send('api-suite.html not found');
    }

    const stats = fs.statSync(suitePath);
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());

    res.sendFile(suitePath);
  });

  console.log('✓ Live reload enabled for HTML files');
} else {
  console.warn('public directory not found. Create a public/ui.html to serve the UI.');
}

// --- Generate endpoint (GPT-powered) ---
app.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    console.log(`🤖 Generating API from prompt: "${prompt.substring(0, 100)}..."`);
    const result = await generator.generateFromPrompt(prompt);

    if (result.error) return res.status(400).json(result);

    const id = uuidv4();
    const key = uuidv4();
    generatedAPIs[id] = {
      id,
      key,
      prompt,
      runtime: result.runtime,
      spec: result.spec,
      createdAt: new Date().toISOString()
    };

    // persist to disk
    persistKeys();

    console.log(`✓ Generated API ${id} with ${result.runtime.endpoints.length} endpoints`);

    res.json({
      id,
      apiKey: key,
      spec: result.spec,
      endpoints: result.runtime.endpoints,
      message: process.env.OPENAI_API_KEY
        ? 'API generated using GPT-5.2'
        : 'API generated using fallback mode (set OPENAI_API_KEY for GPT-5.2 generation)'
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate API', details: error.message });
  }
});

// --- List all generated APIs ---
app.get('/apis', (req, res) => {
  const apis = Object.values(generatedAPIs).map(api => ({
    id: api.id,
    prompt: api.prompt,
    endpoints: api.runtime?.endpoints || [],
    createdAt: api.createdAt
  }));
  res.json({ count: apis.length, apis });
});

// --- Get spec for a generated API ---
app.get('/specs/:id', (req, res) => {
  const id = req.params.id;
  const api = generatedAPIs[id];
  if (!api) return res.status(404).json({ error: 'spec not found' });
  res.json({
    id: api.id,
    spec: api.spec,
    prompt: api.prompt,
    endpoints: api.runtime?.endpoints || [],
    createdAt: api.createdAt
  });
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
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({ error: 'orderItems required' });
  }
  if (typeof totalAmount !== 'number' || totalAmount < 0) {
    return res.status(400).json({ error: 'totalAmount must be >= 0' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const order = {
    id,
    orderItems,
    totalAmount,
    status: 'pending',
    createdAt
  };
  const payload = JSON.stringify(order);

  db.run('INSERT INTO orders (id, payload, createdAt) VALUES (?, ?, ?)', [id, payload, createdAt], function(err) {
    if (err) {
      console.error('DB insert error', err);
      return res.status(500).json({ error: 'db error' });
    }
    console.log(`✓ Created order ${id}`);
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
    console.log(`✓ Retrieved order ${id}`);
    res.json(JSON.parse(row.payload));
  });
});

// --- Admin endpoints (protected) ---
if (process.env.ADMIN_KEY) {
  app.get('/_admin/generated-apis', (req, res) => {
    const adminKey = req.header('x-admin-key') || req.query.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    res.json(Object.values(generatedAPIs));
  });

  app.delete('/_admin/generated-apis/:id', (req, res) => {
    const adminKey = req.header('x-admin-key') || req.query.adminKey;
    if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    const id = req.params.id;
    if (!generatedAPIs[id]) return res.status(404).json({ error: 'API not found' });
    delete generatedAPIs[id];
    persistKeys();
    res.json({ message: 'API deleted' });
  });
}

// --- Start server ---
const server = app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   🚀 Zero-Code API Generator - GPT Powered            ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`✓ Web UI: http://localhost:${PORT}/`);
  console.log(`✓ OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Enabled (' + process.env.OPENAI_MODEL + ')' : '⚠️  Not configured (fallback mode)'}`);
  console.log('');
});

// --- Graceful shutdown: persist keys on exit ---
function shutdown() {
  console.log('\n⏳ Shutting down, persisting keys...');
  try { persistKeys(); } catch (e) { /* ignore */ }
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
