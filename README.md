# Imóvel Valuation API

A Fastify-based API for property valuation with Supabase integration.

## Features

- Fastify server with TypeScript support
- Supabase integration for data storage
- Property evaluation endpoints
- Environment-based configuration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory with:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   NODE_ENV=development
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
    "propertyType": "apartment",
    "location": "São Paulo, SP",
    "size": 80,
    "bedrooms": 2,
    "bathrooms": 1
  }
  ```

- `GET /evaluations` - Get all property evaluations

## How the Integration Works

The `fastify-supabase` plugin automatically:

1. **Registers the Supabase client** with your Fastify instance
2. **Makes the client available** via `fastify.supabase` in your routes
3. **Handles connection management** and error handling
4. **Provides type safety** for Supabase operations

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
├── plugins/
│   └── supabase.ts      # Supabase plugin configuration
└── routes/
    └── evaluate.ts       # Property evaluation routes
```

## Dependencies

- `fastify` - Web framework
- `fastify-supabase` - Supabase integration plugin
- `@supabase/supabase-js` - Supabase client library
- `typescript` - Type safety
- `tsx` - TypeScript execution
