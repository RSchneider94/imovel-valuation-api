export type Property = {
  type: string;
  city: string;
  state: string;
  neighborhood: string;
  street: string;
  link?: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  parkingSpaces: number;
};

export type Coordinates = { lat: number; lng: number };

export type PropertyWithCoordinates = Property & {
  coordinates: Coordinates | null;
};
