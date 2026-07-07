// A hand-curated (not exhaustive) list of Tanzania regions, districts and
// well-known Dar es Salaam neighborhoods, used to power a Bolt-style
// location autocomplete ("Kara..." -> Karagwe, Kagera...) without needing any
// external maps/places API or extra native dependency.
//
// Shape: { name, region } — `region` is shown as a subtitle in the dropdown
// so two same-named places (or a district vs its parent region) stay clear.
const LOCATIONS = [
  // Regions (mainland + Zanzibar)
  { name: "Arusha", region: "Region" },
  { name: "Dar es Salaam", region: "Region" },
  { name: "Dodoma", region: "Region" },
  { name: "Geita", region: "Region" },
  { name: "Iringa", region: "Region" },
  { name: "Kagera", region: "Region" },
  { name: "Katavi", region: "Region" },
  { name: "Kigoma", region: "Region" },
  { name: "Kilimanjaro", region: "Region" },
  { name: "Lindi", region: "Region" },
  { name: "Manyara", region: "Region" },
  { name: "Mara", region: "Region" },
  { name: "Mbeya", region: "Region" },
  { name: "Morogoro", region: "Region" },
  { name: "Mtwara", region: "Region" },
  { name: "Mwanza", region: "Region" },
  { name: "Njombe", region: "Region" },
  { name: "Pemba North", region: "Region" },
  { name: "Pemba South", region: "Region" },
  { name: "Pwani", region: "Region" },
  { name: "Rukwa", region: "Region" },
  { name: "Ruvuma", region: "Region" },
  { name: "Shinyanga", region: "Region" },
  { name: "Simiyu", region: "Region" },
  { name: "Singida", region: "Region" },
  { name: "Songwe", region: "Region" },
  { name: "Tabora", region: "Region" },
  { name: "Tanga", region: "Region" },
  { name: "Unguja North", region: "Region" },
  { name: "Unguja South", region: "Region" },
  { name: "Zanzibar Urban/West", region: "Region" },

  // Kagera districts (the "Karagwe" example)
  { name: "Bukoba", region: "Kagera" },
  { name: "Karagwe", region: "Kagera" },
  { name: "Kyerwa", region: "Kagera" },
  { name: "Missenyi", region: "Kagera" },
  { name: "Muleba", region: "Kagera" },
  { name: "Ngara", region: "Kagera" },
  { name: "Biharamulo", region: "Kagera" },

  // Dar es Salaam districts + popular neighborhoods (busiest market for this app)
  { name: "Kinondoni", region: "Dar es Salaam" },
  { name: "Ilala", region: "Dar es Salaam" },
  { name: "Temeke", region: "Dar es Salaam" },
  { name: "Ubungo", region: "Dar es Salaam" },
  { name: "Kigamboni", region: "Dar es Salaam" },
  { name: "Mbezi Beach", region: "Dar es Salaam" },
  { name: "Mbezi", region: "Dar es Salaam" },
  { name: "Masaki", region: "Dar es Salaam" },
  { name: "Msasani", region: "Dar es Salaam" },
  { name: "Mikocheni", region: "Dar es Salaam" },
  { name: "Sinza", region: "Dar es Salaam" },
  { name: "Kijitonyama", region: "Dar es Salaam" },
  { name: "Tegeta", region: "Dar es Salaam" },
  { name: "Bunju", region: "Dar es Salaam" },
  { name: "Kunduchi", region: "Dar es Salaam" },
  { name: "Kariakoo", region: "Dar es Salaam" },
  { name: "Mbagala", region: "Dar es Salaam" },
  { name: "Chang'ombe", region: "Dar es Salaam" },
  { name: "Buguruni", region: "Dar es Salaam" },
  { name: "Vingunguti", region: "Dar es Salaam" },
  { name: "Segerea", region: "Dar es Salaam" },
  { name: "Kimara", region: "Dar es Salaam" },
  { name: "Mwenge", region: "Dar es Salaam" },
  { name: "Magomeni", region: "Dar es Salaam" },
  { name: "Manzese", region: "Dar es Salaam" },
  { name: "Tandale", region: "Dar es Salaam" },
  { name: "Upanga", region: "Dar es Salaam" },
  { name: "City Centre (Posta)", region: "Dar es Salaam" },

  // Other major towns
  { name: "Moshi", region: "Kilimanjaro" },
  { name: "Mbeya City", region: "Mbeya" },
  { name: "Morogoro Town", region: "Morogoro" },
  { name: "Tanga City", region: "Tanga" },
  { name: "Dodoma City", region: "Dodoma" },
  { name: "Iringa Town", region: "Iringa" },
  { name: "Songea", region: "Ruvuma" },
  { name: "Musoma", region: "Mara" },
  { name: "Shinyanga Town", region: "Shinyanga" },
  { name: "Singida Town", region: "Singida" },
  { name: "Kigoma Town", region: "Kigoma" },
  { name: "Lindi Town", region: "Lindi" },
  { name: "Mtwara Town", region: "Mtwara" },
  { name: "Sumbawanga", region: "Rukwa" },
  { name: "Njombe Town", region: "Njombe" },
  { name: "Babati", region: "Manyara" },
  { name: "Stone Town", region: "Zanzibar" },
];

/**
 * Bolt-style filter: names starting with the query rank first, then names
 * containing it anywhere, both case-insensitive. Returns at most `limit`
 * results, or [] for a query shorter than 2 characters.
 */
export function searchLocations(query, limit = 6) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];

  const starts = [];
  const contains = [];
  for (const loc of LOCATIONS) {
    const name = loc.name.toLowerCase();
    if (name.startsWith(q)) starts.push(loc);
    else if (name.includes(q)) contains.push(loc);
  }
  return [...starts, ...contains].slice(0, limit);
}

export default LOCATIONS;
