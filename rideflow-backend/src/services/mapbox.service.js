const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

exports.geocode = async (address) => {
  const q = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&limit=1&autocomplete=true`;
  const r = await fetch(url);
  const data = await r.json();
  if (!data.features || data.features.length === 0) return null;
  const f = data.features[0];
  return { address: f.place_name, coords: f.center }; // [lng, lat]
};

exports.suggest = async (query, proximity) => {
  if (!query) return [];
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;
  if (proximity && proximity.lng && proximity.lat) {
    url += `&proximity=${proximity.lng},${proximity.lat}`;
  }
  const r = await fetch(url);
  const data = await r.json();
  return (data.features || []).map(f => ({
    id: f.id,
    text: f.text,
    place_name: f.place_name,
    center: f.center
  }));
};

exports.reverse = async (lng, lat) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const r = await fetch(url);
  const data = await r.json();
  if (!data.features || data.features.length === 0) return null;
  const f = data.features[0];
  return { address: f.place_name, center: f.center };
};
