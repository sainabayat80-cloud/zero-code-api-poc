# Zero-Code API Generator

GPT-powered REST API generation platform for DBA thesis - Generate production-ready APIs from natural language descriptions.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E=18.0.0-green)
![License](https://img.shields.io/badge/license-ISC-purple)

## Features

- **AI-Powered Generation**: Uses GPT-4 to generate OpenAPI 3.0 specifications from natural language
- **Instant Deployment**: Generated APIs are immediately deployable with CRUD endpoints
- **API Key Management**: Automatic API key generation and authentication
- **SQLite Persistence**: Built-in database for storing generated data
- **Interactive Web UI**: Modern, dark-themed interface for testing APIs
- **Swagger Documentation**: Auto-generated API docs at `/api-docs`
- **Fallback Mode**: Works without OpenAI API key using rule-based generation

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

### Installation

1. **Install dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment** (optional but recommended)
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Web UI: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs

## Usage

### 1. Generate an API

Send a POST request to `/generate` with your API description:

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create an orders API with POST /orders and GET /orders/:id. Orders should have items, total amount, and status field."
  }'
```

**Response:**
```json
{
  "id": "uuid-here",
  "apiKey": "uuid-key-here",
  "spec": { /* OpenAPI specification */ },
  "endpoints": ["POST /orders", "GET /orders/:id"],
  "message": "API generated using GPT-4"
}
```

### 2. Use Your Generated API

Use the returned `apiKey` to authenticate requests:

```bash
# Create an order
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "orderItems": [{"sku": "PROD-001", "qty": 2}],
    "totalAmount": 59.98
  }'

# Get an order
curl http://localhost:3000/orders/ORDER_ID \
  -H "x-api-key: YOUR_API_KEY"
```

## Environment Variables

Create a `server/.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (set to your domain in production)
CORS_ORIGIN=*

# OpenAI API (optional - without this, uses fallback mode)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Admin key (optional - for admin endpoints)
ADMIN_KEY=your_secure_admin_key_here
```

## API Endpoints

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check and features |

### Generator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/generate` | Generate API from prompt |
| GET | `/apis` | List all generated APIs |
| GET | `/specs/:id` | Get OpenAPI spec for generated API |

### Orders (Generated Example)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/orders` | Create order (requires API key) |
| GET | `/orders/:id` | Get order by ID (requires API key) |

### Admin (requires ADMIN_KEY)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/_admin/generated-apis` | List all APIs with details |
| DELETE | `/_admin/generated-apis/:id` | Delete a generated API |

## Project Structure

```
zero-code-api-poc/
├── server/
│   ├── index.js              # Main Express server
│   ├── openai-generator.js   # GPT-powered generator
│   ├── generate.js           # Fallback rule-based generator
│   ├── db.js                 # SQLite database setup
│   ├── swagger.yaml          # OpenAPI documentation
│   ├── .env.example          # Environment template
│   └── package.json
├── public/
│   └── ui.html               # Interactive web UI
├── .gitignore
└── README.md
```

## Architecture

### GPT Integration

The system uses OpenAI's GPT-4 to generate REST API specifications:

1. **Prompt Engineering**: System prompts guide GPT-4 to generate valid OpenAPI 3.0 specs
2. **Structured Output**: JSON mode ensures consistent, parseable output
3. **Fallback Mode**: Rule-based generation when OpenAI is unavailable

### Data Flow

```
User Prompt → OpenAI API → OpenAPI Spec → Runtime Config → Generated Endpoints
                                    ↓
                            SQLite Persistence
```

### Authentication

- Each generated API receives a unique UUID-based API key
- API keys are persisted in `server/keys.json`
- Requests are authenticated via `x-api-key` header

## For Thesis Presentation

### Key Demo Points

1. **Natural Language to API**: Show how a simple prompt generates a full REST API
2. **OpenAPI Compliance**: Generated specs follow OpenAPI 3.0 standards
3. **Immediate Usability**: Generated APIs work instantly with CRUD operations
4. **Scalability**: Multiple APIs can be generated and managed independently
5. **AI vs Rules**: Compare GPT-4 generated vs fallback mode

### Presentation Tips

- Start with the web UI for visual impact
- Show the Swagger documentation
- Demonstrate creating and retrieving data
- Highlight the OpenAI integration in the code
- Discuss potential applications (rapid prototyping, hackathons, education)

## Deployment

### Render.com

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables in Render dashboard
4. Deploy!

### Environment Variables for Production

```bash
PORT=3000
CORS_ORIGIN=https://your-domain.com
OPENAI_API_KEY=your_production_key
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=production
```

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload
npm run dev

# Run tests (when implemented)
npm test
```

## Troubleshooting

### OpenAI API Errors

- **Error**: `OPENAI_API_KEY not set`
  - **Solution**: Create `server/.env` with your API key, or use fallback mode

- **Error**: `Insufficient quota`
  - **Solution**: Check your OpenAI billing status

### Database Errors

- **Error**: `SQLITE_CANTOPEN`
  - **Solution**: Ensure the server has write permissions for the database file

## Future Enhancements

- [ ] Support for more complex API patterns (pagination, filtering)
- [ ] Multiple database backends (PostgreSQL, MongoDB)
- [ ] Custom authentication strategies (JWT, OAuth)
- [ ] Rate limiting per API key
- [ ] API versioning support
- [ ] Export generated code (Express, Fastify, etc.)
- [ ] Webhook notifications for API events

## License

ISC

## Author

DBA Thesis Project - Zero-Code API Generation Platform

---

**Impress your professor with a stunning, working demonstration of AI-powered API generation!**
