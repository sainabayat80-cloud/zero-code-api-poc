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

---

## Vision: API Collections (Option C)

### Concept Overview

The next evolution of this platform transforms from single-API generation to **intelligent API collection generation**. Instead of generating isolated endpoints, the system will analyze business use cases and generate entire API ecosystems with related microservices.

### How It Works

**Current Behavior:**
```
User: "Create an orders API"
System: → Generates 2 endpoints (POST /orders, GET /orders/:id)
```

**Proposed Behavior (Option C):**
```
User: "Build an e-commerce platform"
System: → Generates API Collection with multiple services:
    ├── Products Service (5 endpoints)
    ├── Orders Service (4 endpoints)
    ├── Customers Service (4 endpoints)
    ├── Inventory Service (3 endpoints)
    └── Payments Service (3 endpoints)

    Total: 19 endpoints across 5 microservices
    Master API Key: One key for entire collection
```

### Example Collections by Domain

| Business Domain | Generated Services | Total Endpoints |
|-----------------|-------------------|-----------------|
| **E-Commerce** | Products, Orders, Customers, Inventory, Payments | 19+ |
| **Healthcare Clinic** | Patients, Doctors, Appointments, Prescriptions, Medical Records | 18+ |
| **Logistics** | Shipments, Routes, Drivers, Vehicles, Tracking | 16+ |
| **Restaurant** | Menu, Orders, Reservations, Tables, Staff | 14+ |
| **Banking** | Accounts, Transactions, Cards, Users, Authentication | 20+ |

### UI Visualization

```
┌─────────────────────────────────────────────────┐
│  📦 E-Commerce API Collection                    │
│  Master Key: abc-123-xyz                        │
│  Created: Jan 12, 2026                          │
│  Status: Active                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 📦 Products │ │ 🛒 Orders   │ │ 👤 Cust.  │ │
│  │   5 ends.   │ │   4 ends.   │ │  4 ends.  │ │
│  │ [Test]      │ │ [Test]      │ │ [Test]    │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                 │
│  ┌─────────────┐ ┌─────────────┐                │
│  │ 📦 Inventory│ │ 💳 Payments │                │
│  │   3 ends.   │ │   3 ends.   │                │
│  │ [Test]      │ │ [Test]      │                │
│  └─────────────┘ └─────────────┘                │
│                                                 │
│  [📊 View All Relationships] [📥 Export Collection]│
└─────────────────────────────────────────────────┘
```

### Technical Implementation

#### Data Structure

```javascript
{
  "id": "collection-uuid",
  "name": "E-Commerce Platform",
  "description": "Complete API suite for e-commerce operations",
  "masterApiKey": "master-key-uuid",
  "services": [
    {
      "name": "Products",
      "basePath": "/products",
      "endpoints": [...],
      "spec": {...}
    },
    {
      "name": "Orders",
      "basePath": "/orders",
      "endpoints": [...],
      "spec": {...}
    }
    // ... more services
  ],
  "relationships": [
    { "from": "Orders", "to": "Products", "type": "references" },
    { "from": "Orders", "to": "Customers", "type": "belongs_to" }
  ]
}
```

#### GPT Prompt Enhancement

```javascript
const systemPrompt = `You are an expert API architect. Analyze the user's business case and generate a complete API collection.

1. Identify the core business domain
2. Determine all related microservices needed
3. Generate OpenAPI 3.0 specs for each service
4. Define relationships between services
5. Return as a structured API collection

Output format:
{
  "collectionName": "string",
  "services": [
    { "name": "string", "basePath": "string", "spec": {...}, "endpoints": [...] }
  ],
  "relationships": [...]
}`;
```

### Thesis Validation Impact

#### H1: Usability & Accessibility

| Metric | Current | With Collections |
|--------|---------|------------------|
| Steps to Complete System | 5+ prompts | 1 prompt |
| Time to Full Stack | ~30 minutes | ~2 minutes |
| Cognitive Load | High (must know all needed APIs) | Low (AI figures it out) |
| Technical Knowledge Required | Medium | Minimal |

#### H2: Organizational Impact

**Benefits:**
- **Reduced IT Dependency**: Business units describe their needs, get complete systems
- **Faster Time-to-Market**: Entire API ecosystem ready in under 2 minutes
- **Better Architecture**: AI designs consistent, scalable microservices
- **Cross-Functional**: Marketing gets customer APIs, ops gets inventory, finance gets billing

**Enterprise Scenarios:**
- Startup hackathon: Full backend in minutes
- Corporate prototyping: Quick MVP for business cases
- System migration: Modern API layer for legacy systems
- Cross-team collaboration: Shared API platform

### Academic Contributions

1. **Semantic Understanding**: Demonstrates AI's ability to map business intent → technical architecture
2. **Domain Agnostic**: Works across industries (healthcare, finance, logistics, retail)
3. **Scalability Proof**: Shows zero-code can handle enterprise complexity
4. **Knowledge Graph**: Implicit understanding of service relationships

### Migration Path

**Phase 1** (Current): Single API generation
- Fallback: Individual endpoint creation

**Phase 2** (Next): Smart Detection
- System detects if prompt implies complex system
- Offers: "Generate as collection?" vs "Single API only"
- Hybrid approach for flexibility

**Phase 3** (Full): Collection Management
- Edit individual services within collections
- Add/remove services from existing collections
- Version collections
- Export entire collection as code

### Example Prompt Evolution

| Phase | User Prompt | System Response |
|-------|-------------|-----------------|
| 1 | "Orders API" | Single API with 2 endpoints |
| 2 | "E-commerce system" | Detection → "Generate collection with 5 services?" |
| 3 | "E-commerce system" | Auto-generates full collection with relationships |

### Research Implications

**For Thesis Defense:**
- Stronger validation of both hypotheses
- Demonstrates enterprise-ready capabilities
- Shows AI understanding of business domains
- Proves scalability of zero-code approach

**For Publication:**
- Novel contribution: Intent-to-architecture mapping
- Empirical data: Collection generation vs single API
- Framework for evaluating zero-code enterprise tools

## License

ISC

## Author

DBA Thesis Project - Zero-Code API Generation Platform

---

**Impress your professor with a stunning, working demonstration of AI-powered API generation!**
