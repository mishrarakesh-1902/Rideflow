// src/services/mapbox.ts
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

type Suggestion = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

export async function mapboxSuggest(query: string, limit = 5): Promise<Suggestion[]> {
  if (!MAPBOX_TOKEN || !query) return [];
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.features || []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
  }));
}

export async function geocodePlaceId(placeId: string) {
  if (!MAPBOX_TOKEN || !placeId) return null;
  // Mapbox doesn't support querying by id alone easy — but we can keep suggestion's center
  // Alternatively use forward geocoding again
  return null;
}
