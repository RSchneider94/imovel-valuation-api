-- DROP FUNCTION match_properties_structured(double precision,double precision,integer,integer,integer,integer,text,usage,rental_type,boolean,integer,integer,double precision,integer,double precision,integer)

CREATE INDEX IF NOT EXISTS idx_properties_ll_earth
ON properties USING btree (ll_to_earth(lat, lng));

-- Optimized function that uses only structured data, without embedding
-- Faster, more precise and without API cost
-- Função de match focada em filtros absolutos
create or replace function match_properties_structured(
  user_lat double precision,
  user_lng double precision,
  -- User property features
  user_bedrooms int,
  user_bathrooms int,
  user_size int,
  user_parking_spaces int,
  user_type text,
  user_usage "usage",
  user_rental_type rental_type default null,
  user_furnished boolean default false,
  -- Configurable tolerances
  bedrooms_tolerance int default 1,
  bathrooms_tolerance int default 1,
  size_tolerance_percent double precision default 0.3,
  parking_tolerance int default 1,
  -- Search parameters
  radius_km double precision default 1,
  match_count int default 20,
  -- Regional price per m² (opcional)
  avg_region_price numeric default null,
  max_price_deviation double precision default 0.3 -- 30% tolerância
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
  usage "usage",
  furnished boolean,
  property_id text,
  rental_type rental_type,
  link text,
  distance_km double precision
) language plpgsql
set search_path = 'public'
as $$
begin
  return query
  with filtered_properties as (
    select *
    from properties p
    where p.type = user_type
      and p.usage = user_usage
      and (user_rental_type is null or p.rental_type = user_rental_type)
      and p.furnished = user_furnished
      -- tolerâncias absolutas
      and abs(p.bedrooms - user_bedrooms) <= bedrooms_tolerance
      and abs(p.bathrooms - user_bathrooms) <= bathrooms_tolerance
      and abs(p.size - user_size) <= (user_size * size_tolerance_percent)
      and abs(p.parking_spaces - user_parking_spaces) <= parking_tolerance
      -- distância absoluta
      and earth_distance(
            ll_to_earth(p.lat, p.lng),
            ll_to_earth(user_lat, user_lng)
          ) <= radius_km * 1000.0
      -- filtro opcional de preço/m² (para venda)
      and (
        avg_region_price is null
        or abs((p.price / p.size) - avg_region_price) / avg_region_price <= max_price_deviation
      )
  )
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
    earth_distance(ll_to_earth(p.lat, p.lng), ll_to_earth(user_lat, user_lng)) / 1000.0 as distance_km
  from filtered_properties p
  limit match_count;
end;
$$;