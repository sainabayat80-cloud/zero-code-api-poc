function generateFromPrompt(prompt) {
  const hasOrders = /POST\s*\/orders/i.test(prompt) && /GET\s*\/orders/i.test(prompt);
  if (!hasOrders) {
    return { error: 'Prompt not recognized. Expected POST /orders and GET /orders/{id}.' };
  }

  const spec = {
    info: { title: 'Orders API', version: '1.0.0' },
    paths: {
      '/orders': { post: { summary: 'Create order' } },
      '/orders/{id}': { get: { summary: 'Get order by id' } }
    },
    components: {
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderItems: { type: 'array' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending','shipped','cancelled'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  };

  const runtime = {
    endpoints: ['POST /orders', 'GET /orders/:id'],
    defaultStatus: 'pending'
  };

  return { spec, runtime };
}

module.exports = { generateFromPrompt };
