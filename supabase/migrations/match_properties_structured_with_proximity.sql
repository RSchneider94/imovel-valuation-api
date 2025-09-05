-- Enhanced property matching function with proximity filtering
-- This function matches properties based on structural similarity AND proximity similarity
CREATE
OR REPLACE FUNCTION match_properties_structured_with_proximity(
  user_lat FLOAT,
  user_lng FLOAT,
  user_bedrooms INTEGER,
  user_bathrooms INTEGER,
  user_size FLOAT,
  user_parking_spaces INTEGER,
  user_type TEXT,
  user_usage TEXT,
  user_rental_type TEXT DEFAULT NULL,
  user_furnished BOOLEAN DEFAULT FALSE,
  -- Configurable tolerances
  bedrooms_tolerance INTEGER DEFAULT 1,
  bathrooms_tolerance INTEGER DEFAULT 1,
  size_tolerance_percent FLOAT DEFAULT 0.3,
  parking_tolerance INTEGER DEFAULT 1,
  radius_km FLOAT DEFAULT 1.0,
  match_count INTEGER DEFAULT 20,
  -- Regional price per m² from Zoneval API
  avg_region_price FLOAT DEFAULT NULL,
  max_price_deviation FLOAT DEFAULT 0.05,
  -- Proximity filtering parameters
  require_beach_access BOOLEAN DEFAULT FALSE,
  require_metro_access BOOLEAN DEFAULT FALSE,
  require_shopping_access BOOLEAN DEFAULT FALSE,
  min_proximity_score INTEGER DEFAULT 0,
  proximity_tolerance INTEGER DEFAULT 20 -- Allow properties within this proximity score range
) RETURNS TABLE (
  id TEXT,
  type TEXT,
  usage TEXT,
  rental_type TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size FLOAT,
  parking_spaces INTEGER,
  furnished BOOLEAN,
  price FLOAT,
  distance_km FLOAT,
  -- Proximity data
  proximity_score INTEGER,
  has_beach_access BOOLEAN,
  has_metro_access BOOLEAN,
  has_shopping_access BOOLEAN,
  has_hospital_access BOOLEAN,
  has_school_access BOOLEAN,
  has_park_access BOOLEAN,
  proximity_landmarks JSONB,
  -- Proximity similarity score (0-100, higher = more similar)
  proximity_similarity_score INTEGER
) AS $ $ DECLARE user_proximity_score INTEGER;

user_has_beach_access BOOLEAN;

user_has_metro_access BOOLEAN;

user_has_shopping_access BOOLEAN;

user_has_hospital_access BOOLEAN;

user_has_school_access BOOLEAN;

user_has_park_access BOOLEAN;

BEGIN -- Get user's proximity data (this would be calculated by the LocationProximityService)
-- For now, we'll use placeholder values - in practice, these would be passed as parameters
-- or calculated before calling this function
user_proximity_score := 50;

-- Placeholder - should be calculated
user_has_beach_access := FALSE;

-- Placeholder - should be calculated
user_has_metro_access := FALSE;

-- Placeholder - should be calculated
user_has_shopping_access := FALSE;

-- Placeholder - should be calculated
user_has_hospital_access := FALSE;

-- Placeholder - should be calculated
user_has_school_access := FALSE;

-- Placeholder - should be calculated
user_has_park_access := FALSE;

-- Placeholder - should be calculated
RETURN QUERY
SELECT
  p.id :: TEXT,
  p.type,
  p.usage,
  p.rental_type,
  p.bedrooms,
  p.bathrooms,
  p.size,
  p.parking_spaces,
  p.furnished,
  p.price,
  -- Calculate distance in kilometers
  (
    6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(p.lat))
    )
  ) :: FLOAT AS distance_km,
  -- Proximity data
  COALESCE(p.proximity_score, 0) AS proximity_score,
  COALESCE(p.has_beach_access, FALSE) AS has_beach_access,
  COALESCE(p.has_metro_access, FALSE) AS has_metro_access,
  COALESCE(p.has_shopping_access, FALSE) AS has_shopping_access,
  COALESCE(p.has_hospital_access, FALSE) AS has_hospital_access,
  COALESCE(p.has_school_access, FALSE) AS has_school_access,
  COALESCE(p.has_park_access, FALSE) AS has_park_access,
  COALESCE(p.proximity_landmarks, '[]' :: jsonb) AS proximity_landmarks,
  -- Calculate proximity similarity score
  CASE
    WHEN p.proximity_score IS NULL THEN 0
    ELSE GREATEST(
      0,
      100 - ABS(
        COALESCE(p.proximity_score, 0) - user_proximity_score
      )
    )
  END AS proximity_similarity_score
FROM
  properties p
WHERE
  -- Basic structural matching
  p.lat IS NOT NULL
  AND p.lng IS NOT NULL
  AND p.usage = user_usage
  AND p.type = user_type
  AND (
    user_rental_type IS NULL
    OR p.rental_type = user_rental_type
  )
  AND p.furnished = user_furnished
  AND ABS(p.bedrooms - user_bedrooms) <= bedrooms_tolerance
  AND ABS(p.bathrooms - user_bathrooms) <= bathrooms_tolerance
  AND ABS(p.parking_spaces - user_parking_spaces) <= parking_tolerance
  AND ABS(p.size - user_size) / user_size <= size_tolerance_percent -- Geographic distance filter
  AND (
    6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(p.lat))
    )
  ) <= radius_km -- Proximity filtering
  AND (
    NOT require_beach_access
    OR COALESCE(p.has_beach_access, FALSE) = user_has_beach_access
  )
  AND (
    NOT require_metro_access
    OR COALESCE(p.has_metro_access, FALSE) = user_has_metro_access
  )
  AND (
    NOT require_shopping_access
    OR COALESCE(p.has_shopping_access, FALSE) = user_has_shopping_access
  )
  AND COALESCE(p.proximity_score, 0) >= min_proximity_score -- Proximity similarity filter (properties with similar proximity scores)
  AND ABS(
    COALESCE(p.proximity_score, 0) - user_proximity_score
  ) <= proximity_tolerance -- Price filtering with regional context
  AND (
    avg_region_price IS NULL
    OR ABS(p.price / p.size - avg_region_price) / avg_region_price <= max_price_deviation
  )
ORDER BY
  -- Primary sort: proximity similarity (most important for location-based matching)
  proximity_similarity_score DESC,
  -- Secondary sort: structural similarity
  (
    (
      CASE
        WHEN ABS(p.bedrooms - user_bedrooms) <= bedrooms_tolerance THEN 1
        ELSE 0
      END
    ) + (
      CASE
        WHEN ABS(p.bathrooms - user_bathrooms) <= bathrooms_tolerance THEN 1
        ELSE 0
      END
    ) + (
      CASE
        WHEN ABS(p.parking_spaces - user_parking_spaces) <= parking_tolerance THEN 1
        ELSE 0
      END
    ) + (
      CASE
        WHEN ABS(p.size - user_size) / user_size <= size_tolerance_percent THEN 1
        ELSE 0
      END
    )
  ) DESC,
  -- Tertiary sort: distance
  distance_km ASC
LIMIT
  match_count;

END;

$ $ LANGUAGE plpgsql;
