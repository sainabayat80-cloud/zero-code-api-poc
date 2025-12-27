const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { db, init } = require('./db');
const { generateFromPrompt } = require('./generate');

init();
const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(bodyParser.json());

const generatedAPIs = {};

app.post('/generate', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const result = generateFromPrompt(prompt);
  if (result.error) return res.status(400).json(result);

  const id = uuidv4();
  const key = uuidv4();
  generatedAPIs[id] = { id, key, prompt, runtime: result.runtime };

  res.json({ id, apiKey: key, spec: result.spec, endpoints: result.runtime.endpoints });
});

function checkApiKey(req, res, next) {
  const key = req.header('x-api-key') || req.query.apiKey;
  if (!key) return res.status(401).json({ error: 'x-api-key required' });
  const found = Object.values(generatedAPIs).find(a => a.key === key);
  if (!found) return res.status(403).json({ error: 'invalid api key' });
  req.generatedApi = found;
  next();
}

app.post('/orders', checkApiKey, (req, res) => {
  const { orderItems, totalAmount } = req.body;
  if (!Array.isArray(orderItems) || orderItems.length === 0) return res.status(400).json({ error: 'orderItems required' });
  if (typeof totalAmount !== 'number' || totalAmount < 0) return res.status(400).json({ error: 'totalAmount must be >= 0' });

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const order = { id, orderItems, totalAmount, status: 'pending', createdAt };
  const payload = JSON.stringify(order);
  db.run('INSERT INTO orders (id, payload, createdAt) VALUES (?, ?, ?)', [id, payload, createdAt], function(err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.status(201).json(order);
  });
});

app.get('/orders/:id', checkApiKey, (req, res) => {
  const id = req.params.id;
  db.get('SELECT payload FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'db error' });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(JSON.parse(row.payload));
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
