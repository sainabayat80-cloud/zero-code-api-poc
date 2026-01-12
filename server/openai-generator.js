const OpenAI = require('openai');

/**
 * GPT-Powered API Generator
 * Generates REST API specifications from natural language descriptions
 */
class OpenAIGenerator {
  constructor() {
    // Only initialize OpenAI client if API key is available
    this.client = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
  }

  /**
   * Generate OpenAPI specification from natural language prompt
   * @param {string} prompt - Natural language description of desired API
   * @returns {Promise<Object>} - Generated API specification and runtime config
   */
  async generateFromPrompt(prompt) {
    if (!this.client) {
      console.warn('OPENAI_API_KEY not set, falling back to rule-based generation');
      return this._fallbackGeneration(prompt);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.2-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert API designer. Generate a minimal but complete OpenAPI 3.0 specification from the user's description.

Return ONLY a valid JSON object with this exact structure:
{
  "spec": {
    "info": { "title": "string", "version": "string" },
    "paths": {
      "/endpoint": {
        "post": {
          "summary": "string",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Resource" }
              }
            }
          },
          "responses": {
            "201": { "description": "Created" }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Resource": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        }
      }
    }
  },
  "runtime": {
    "endpoints": ["POST /endpoint", "GET /endpoint/:id"],
    "defaultStatus": "pending"
  }
}

Be concise. Focus on CRUD operations for the main resource.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      return result;

    } catch (error) {
      console.error('OpenAI API error:', error.message);
      return this._fallbackGeneration(prompt);
    }
  }

  /**
   * Fallback rule-based generation when OpenAI is unavailable
   * @private
   */
  _fallbackGeneration(prompt) {
    const hasOrders = /POST\s*\/orders/i.test(prompt) && /GET\s*\/orders/i.test(prompt);

    if (!hasOrders) {
      return {
        error: 'Prompt not recognized. Please describe an API with POST and GET endpoints (e.g., "Create an orders API with POST /orders and GET /orders/:id")'
      };
    }

    return {
      spec: {
        info: { title: 'Orders API', version: '1.0.0' },
        paths: {
          '/orders': {
            post: {
              summary: 'Create order',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { '$ref': '#/components/schemas/Order' }
                  }
                }
              },
              responses: {
                '201': { description: 'Order created' }
              }
            }
          },
          '/orders/{id}': {
            get: {
              summary: 'Get order by id',
              responses: {
                '200': { description: 'Success' }
              }
            }
          }
        },
        components: {
          schemas: {
            Order: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                orderItems: { type: 'array' },
                totalAmount: { type: 'number' },
                status: { type: 'string', enum: ['pending', 'shipped', 'cancelled'] },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      },
      runtime: {
        endpoints: ['POST /orders', 'GET /orders/:id'],
        defaultStatus: 'pending'
      }
    };
  }
}

module.exports = { OpenAIGenerator };
