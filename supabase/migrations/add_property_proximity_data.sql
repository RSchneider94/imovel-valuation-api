-- Add proximity data fields to properties table
-- This will store proximity scores and landmark access flags for each property
ALTER TABLE
  properties
ADD
  COLUMN IF NOT EXISTS proximity_score INTEGER DEFAULT 0,
ADD
  COLUMN IF NOT EXISTS has_beach_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS has_metro_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS has_shopping_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS has_hospital_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS has_school_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS has_park_access BOOLEAN DEFAULT FALSE,
ADD
  COLUMN IF NOT EXISTS proximity_landmarks JSONB DEFAULT '[]' :: jsonb,
ADD
  COLUMN IF NOT EXISTS proximity_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for proximity filtering
CREATE INDEX IF NOT EXISTS idx_properties_proximity_score ON properties(proximity_score);

CREATE INDEX IF NOT EXISTS idx_properties_beach_access ON properties(has_beach_access);

CREATE INDEX IF NOT EXISTS idx_properties_metro_access ON properties(has_metro_access);

CREATE INDEX IF NOT EXISTS idx_properties_shopping_access ON properties(has_shopping_access);

-- Create composite index for proximity filtering
CREATE INDEX IF NOT EXISTS idx_properties_proximity_composite ON properties(
  proximity_score,
  has_beach_access,
  has_metro_access,
  has_shopping_access
);

-- Add comment explaining the proximity data
COMMENT ON COLUMN properties.proximity_score IS 'Overall proximity score (0-100) based on nearby landmarks';

COMMENT ON COLUMN properties.has_beach_access IS 'Whether property has beach access within 2km';

COMMENT ON COLUMN properties.has_metro_access IS 'Whether property has metro station access within 1km';

COMMENT ON COLUMN properties.has_shopping_access IS 'Whether property has shopping mall access within 1.5km';

COMMENT ON COLUMN properties.has_hospital_access IS 'Whether property has hospital access within 2km';

COMMENT ON COLUMN properties.has_school_access IS 'Whether property has school access within 1km';

COMMENT ON COLUMN properties.has_park_access IS 'Whether property has park access within 500m';

COMMENT ON COLUMN properties.proximity_landmarks IS 'JSON array of nearby landmarks with their proximity scores';

COMMENT ON COLUMN properties.proximity_updated_at IS 'Timestamp when proximity data was last updated';
