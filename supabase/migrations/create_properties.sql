create table public.properties (
  id uuid not null default gen_random_uuid (),
  type text not null,
  city text not null,
  state text not null,
  neighborhood text null,
  street text not null,
  price numeric not null,
  bedrooms integer not null,
  bathrooms integer not null,
  size integer not null,
  parking_spaces integer not null,
  lat double precision null,
  lng double precision null,
  created_at timestamp with time zone null default now(),
  embedding extensions.vector null,
  usage public.usage null,
  furnished boolean null default false,
  link text null,
  property_id text null,
  rental_type public.rental_type null,
  updated_at timestamp with time zone null default now(),
  constraint properties_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_properties_city_state on public.properties using btree (city, state) TABLESPACE pg_default;

create index IF not exists idx_properties_bedrooms on public.properties using btree (bedrooms) TABLESPACE pg_default;

create index IF not exists idx_properties_price on public.properties using btree (price) TABLESPACE pg_default;

create policy "backend only full access" on public.properties for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
