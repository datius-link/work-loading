// Free (no API key, no paid billing) street-level location autocomplete for
// Tanzania, backed by OpenStreetMap's public Nominatim search API. Results
// are merged with the bundled offline region/district/neighbourhood list in
// data/tanzaniaLocations.js, so typing still works instantly for common
// places while Nominatim adds real street-level results (e.g. "Furaha
// Street, Kinondoni, Dar es Salaam") that the offline list can't cover.
//
// Nominatim's usage policy caps free public usage at roughly 1 request per
// second and asks for a distinguishing User-Agent — callers MUST debounce
// input (PostDetails.js debounces ~350ms) rather than firing a request per
// keystroke. If search volume grows a lot, the next step would be a paid
// provider (Google Places) or a self-hosted Nominatim instance — not needed
// for the app's current scale.
import { searchLocations } from "../data/tanzaniaLocations";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function formatOnlineResult(item) {
  const addr = item.address || {};
  const streetLevel =
    addr.road || addr.pedestrian || addr.neighbourhood || addr.suburb || item.name;
  const parts = String(item.display_name || "").split(",").map((p) => p.trim());
  const region =
    [addr.suburb || addr.city_district, addr.city || addr.town || addr.county, addr.region]
      .filter(Boolean)
      .join(", ") || parts.slice(1, 3).join(", ");

  return {
    name: streetLevel || parts[0] || item.display_name,
    region: region || "Tanzania",
    source: "osm",
  };
}

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.name}|${item.region}`.toLowerCase();
    if (seen.has(key) || !item.name) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Resolves to an array of { name, region, source } suggestions. Always
 * returns instantly from the offline list first if the network lookup
 * fails or is aborted (via the AbortController `signal` option), so the
 * dropdown never just goes empty because of a connectivity hiccup.
 */
export async function searchPlaces(query, { signal } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  const offline = searchLocations(q, 4);
  if (q.length < 3) return offline;

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      q: `${q}, Tanzania`,
      countrycodes: "tz",
      addressdetails: "1",
      limit: "6",
    });

    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      signal,
      headers: {
        "User-Agent": "ekazi-mobile-app/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);

    const data = await res.json();
    const online = Array.isArray(data) ? data.map(formatOnlineResult) : [];

    // Offline (curated regions/districts) first — instant, always correct —
    // then real street-level online results, deduped.
    return dedupe([...offline, ...online]).slice(0, 8);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    console.log("Places lookup failed, using offline list only:", err?.message || err);
    return offline;
  }
}
