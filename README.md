# Imóvel Valuation API

A Fastify-based API for property valuation with Supabase integration.

## Features

- Fastify server with TypeScript support
- Supabase integration for data storage
- Property evaluation endpoints with AI-powered similarity matching
- **Market validation using Zoneval API** - "Prova dos 9" feature
- Environment-based configuration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory with:
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key_here
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   NODE_ENV=development
   ZONEVAL_API_KEY=your_zoneval_api_key_here
   ZONEVAL_API_SECRET=your_zoneval_api_secret_here
   ```

3. **Supabase Setup:**
   - Create a new Supabase project
   - Get your project URL and anon key from the project settings
   - Create a table called `property_evaluations` with the following columns:
     - `id` (uuid, primary key)
     - `property_type` (text)
     - `location` (text)
     - `size` (numeric)
     - `bedrooms` (integer)
     - `bathrooms` (integer)
     - `created_at` (timestamp)

## Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Property Evaluation
- `POST /evaluate` - Create a new property evaluation
  ```json
  {
    "type": "apartamento",
    "usage": "venda",
    "rental_type": null,
    "size": 80,
    "bedrooms": 2,
    "bathrooms": 1,
    "parking_spaces": 1,
    "furnished": false,
    "street": "Rua das Flores",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "lat": -23.5505,
    "lng": -46.6333,
    "cep": "01234-567"
  }
  ```

- `GET /evaluate/:processId` - Get evaluation results via Server-Sent Events

**Response includes:**
- `estimatedPrice`: Initial AI-based estimation
- `refinedPrice`: Price adjusted based on market validation
- `zonevalValidation`: Market data from Zoneval API
- `marketInsights`: Analysis and recommendations with type safety

## How the Integration Works

### AI-Powered Property Matching

The system uses OpenAI embeddings to find similar properties in your database:

1. **Generates embeddings** for the user's property description
2. **Finds similar properties** using hybrid search (embedding + geographic proximity)
3. **Calculates average price** from the most similar properties

### Market Validation ("Prova dos 9")

When Zoneval API credentials are configured, the system:

1. **Checks cache first** for existing market data (7-day validity)
2. **Queries Zoneval API** only if cache is missing or expired
3. **Compares estimated price** with local market reality
4. **Provides refined price** and market insights
5. **Gives confidence score** based on available data
6. **Caches results** for future use and historical analysis

### Accessing Supabase in Routes

```typescript
// In any route handler
const supabase = fastify.supabase;

// Use Supabase client as normal
const { data, error } = await supabase
  .from("your_table")
  .select("*");
```

## Project Structure

```
src/
├── index.ts              # Main server file
├── commands/
│   └── calculate.ts      # Property calculation logic
├── plugins/
│   └── supabase.ts      # Supabase plugin configuration
├── routes/
│   └── evaluate.ts       # Property evaluation routes
├── services/
│   ├── zoneval.ts       # Zoneval API integration
│   ├── zoneval-cache.ts # Cache management for Zoneval
│   └── market-validation.ts # Market validation business logic
├── types/
│   ├── common.ts        # Common type definitions
│   └── database.ts      # Database schema types
└── utils/
    └── formatters.ts    # Utility functions
```

## Dependencies

- `fastify` - Web framework
- `fastify-supabase` - Supabase integration plugin
- `@supabase/supabase-js` - Supabase client library
- `typescript` - Type safety
- `tsx` - TypeScript execution
