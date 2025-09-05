-- Create property_market_cache table
CREATE TABLE IF NOT EXISTS property_market_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zipcode VARCHAR(8) NOT NULL,
  zipcode_stats JSONB NOT NULL,
  neighbourhood_stats JSONB NOT NULL,
  city_stats JSONB NOT NULL,
  state_stats JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on CEP for fast lookups
CREATE INDEX IF NOT EXISTS idx_property_market_cache_cep ON property_market_cache(zipcode);

-- Create index on created_at for historical analysis
CREATE INDEX IF NOT EXISTS idx_property_market_cache_created_at ON property_market_cache(created_at);

-- Create unique constraint to prevent duplicate CEP entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_market_cache_cep_unique ON property_market_cache(zipcode);

-- Function to update updated_at timestamp
CREATE
OR REPLACE FUNCTION update_property_market_cache_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();

RETURN NEW;

END;

$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_property_market_cache_updated_at BEFORE
UPDATE
  ON property_market_cache FOR EACH ROW EXECUTE FUNCTION update_property_market_cache_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE
  property_market_cache ENABLE ROW LEVEL SECURITY;

-- Policy to allow only backend service access (authenticated service role)
CREATE POLICY "Allow backend service access to property_market_cache" ON property_market_cache FOR ALL TO service_role USING (true);
