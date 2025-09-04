-- Optimized function that uses only structured data, without embedding
-- Faster, more precise and without API cost
create
or replace function match_properties_structured(
  user_lat double precision,
  user_lng double precision,
  -- User property features
  user_bedrooms int,
  user_bathrooms int,
  user_size int,
  user_parking_spaces int,
  user_type text,
  user_usage usage,
  user_rental_type rental_type default null,
  user_furnished boolean default false,
  -- Configurable tolerances
  bedrooms_tolerance int default 1,
  bathrooms_tolerance int default 1,
  size_tolerance_percent double precision default 0.3,
  parking_tolerance int default 1,
  -- Search parameters
  radius_km double precision default 20,
  match_count int default 5
) returns table (
  id uuid,
  type text,
  city text,
  state text,
  neighborhood text,
  street text,
  price numeric,
  bedrooms int,
  bathrooms int,
  size int,
  parking_spaces int,
  usage usage,
  furnished boolean,
  property_id text,
  rental_type rental_type,
  link text,
  distance_km double precision,
  similarity_score double precision
) language plpgsql
SET
  search_path = 'public' as $$ begin return query with filtered_properties as (
    select
      *
    from
      properties p
    where
      p.type = user_type
      and p.usage = user_usage
      and (
        user_rental_type is null
        or p.rental_type = user_rental_type
      )
      and p.furnished = user_furnished -- Filters with tolerance
      and abs(p.bedrooms - user_bedrooms) <= bedrooms_tolerance
      and abs(p.bathrooms - user_bathrooms) <= bathrooms_tolerance
      and abs(p.size - user_size) <= (user_size * size_tolerance_percent)
      and abs(p.parking_spaces - user_parking_spaces) <= parking_tolerance
  ),
  scored_properties as (
    select
      p.id,
      p.type,
      p.city,
      p.state,
      p.neighborhood,
      p.street,
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.size,
      p.parking_spaces,
      p.usage,
      p.furnished,
      p.property_id,
      p.rental_type,
      p.link,
      (
        (
          point(p.lng, p.lat) <@> point(user_lng, user_lat)
        ) * 1.60934
      )::double precision as distance_km,
      -- Score based on features (0 = identical, 1 = very different)
      (
        -- Quartos (peso 25%)
        (
          abs(p.bedrooms - user_bedrooms)::double precision / greatest(user_bedrooms, 1)
        ) * 0.25 + -- Bathrooms (weight 25%)
        (
          abs(p.bathrooms - user_bathrooms)::double precision / greatest(user_bathrooms, 1)
        ) * 0.25 + -- Size (weight 30%)
        (
          abs(p.size - user_size)::double precision / greatest(user_size, 1)
        ) * 0.3 + -- Parking spaces (weight 20%)
        (
          abs(p.parking_spaces - user_parking_spaces)::double precision / greatest(user_parking_spaces + 1, 1)
        ) * 0.2
      ) as similarity_score
    from
      filtered_properties p
    where
      (
        (
          point(p.lng, p.lat) <@> point(user_lng, user_lat)
        ) * 1.60934
      ) <= radius_km
  )
select
  sp.*,
  -- Final score: 70% similarity + 30% proximity (inverted for lower = better)
  (
    sp.similarity_score * 0.7 + (sp.distance_km / radius_km) * 0.3
  ) as similarity_score
from
  scored_properties sp
order by
  similarity_score asc
limit
  match_count;

end;

$$;

-- Even more restrictive function for cases that need maximum precision
create
or replace function match_properties_structured_strict(
  user_lat double precision,
  user_lng double precision,
  user_bedrooms int,
  user_bathrooms int,
  user_size int,
  user_parking_spaces int,
  user_type text,
  user_usage usage,
  user_rental_type rental_type default null,
  user_furnished boolean default false,
  -- More restrictive tolerances
  bedrooms_tolerance int default 0,
  -- Exactly the same number
  bathrooms_tolerance int default 0,
  size_tolerance_percent double precision default 0.1,
  -- Only 10%
  parking_tolerance int default 0,
  radius_km double precision default 20,
  match_count int default 5
) returns table (
  id uuid,
  type text,
  city text,
  state text,
  neighborhood text,
  street text,
  price numeric,
  bedrooms int,
  bathrooms int,
  size int,
  parking_spaces int,
  usage usage,
  furnished boolean,
  property_id text,
  rental_type rental_type,
  link text,
  distance_km double precision,
  similarity_score double precision
) language plpgsql
SET
  search_path = 'public' as $$ begin return query with filtered_properties as (
    select
      *
    from
      properties p
    where
      p.type = user_type
      and p.usage = user_usage
      and (
        user_rental_type is null
        or p.rental_type = user_rental_type
      )
      and p.furnished = user_furnished
      and abs(p.bedrooms - user_bedrooms) <= bedrooms_tolerance
      and abs(p.bathrooms - user_bathrooms) <= bathrooms_tolerance
      and abs(p.size - user_size) <= (user_size * size_tolerance_percent)
      and abs(p.parking_spaces - user_parking_spaces) <= parking_tolerance
  ),
  scored_properties as (
    select
      p.id,
      p.type,
      p.city,
      p.state,
      p.neighborhood,
      p.street,
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.size,
      p.parking_spaces,
      p.usage,
      p.furnished,
      p.property_id,
      p.rental_type,
      p.link,
      (
        (
          point(p.lng, p.lat) <@> point(user_lng, user_lat)
        ) * 1.60934
      )::double precision as distance_km,
      -- More rigorous score
      (
        (
          abs(p.bedrooms - user_bedrooms)::double precision / greatest(user_bedrooms, 1)
        ) * 0.3 + (
          abs(p.bathrooms - user_bathrooms)::double precision / greatest(user_bathrooms, 1)
        ) * 0.3 + (
          abs(p.size - user_size)::double precision / greatest(user_size, 1)
        ) * 0.3 + (
          abs(p.parking_spaces - user_parking_spaces)::double precision / greatest(user_parking_spaces + 1, 1)
        ) * 0.1
      ) as similarity_score
    from
      filtered_properties p
    where
      (
        (
          point(p.lng, p.lat) <@> point(user_lng, user_lat)
        ) * 1.60934
      ) <= radius_km
  )
select
  sp.*,
  (
    sp.similarity_score * 0.8 + (sp.distance_km / radius_km) * 0.2
  ) as similarity_score
from
  scored_properties sp
where
  sp.similarity_score <= 0.2 -- Only very similar properties
order by
  similarity_score asc
limit
  match_count;

end;

$$;
