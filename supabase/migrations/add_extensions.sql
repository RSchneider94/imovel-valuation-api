-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Vector
DROP EXTENSION IF EXISTS vector CASCADE;

CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Cube
CREATE EXTENSION IF NOT EXISTS cube SCHEMA extensions;

-- Earthdistance
CREATE EXTENSION IF NOT EXISTS earthdistance SCHEMA extensions;
