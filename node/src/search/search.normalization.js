const SYNONYM_GROUPS = {
  plumbing: ["plumber", "plumbers", "plumbing", "plumbings"],
  electrical: ["electric", "electrical", "electrician", "electricians"],
  welding: ["welder", "welders", "welding"],
  carpentry: ["carpenter", "carpenters", "carpentry"],
  masonry: ["mason", "masons", "masonry"],
  painting: ["painter", "painters", "painting"],
  roofing: ["roofer", "roofers", "roofing"],
  cleaning: ["cleaner", "cleaners", "cleaning"],
  tailoring: ["tailor", "tailors", "tailoring"],
  photography: ["photographer", "photographers", "photography"],
};

const SYNONYMS = Object.entries(SYNONYM_GROUPS).reduce((map, [canonical, values]) => {
  values.forEach((value) => map.set(value, canonical));
  return map;
}, new Map());

function clean(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizeHashtag(value) {
  const normalized = clean(value)
    .replace(/^#+/, "")
    .replace(/[^a-z0-9]/g, "");

  return SYNONYMS.get(normalized) || normalized;
}

export function hashtagSearchTerms(value) {
  const canonical = normalizeHashtag(value);
  return [...new Set([canonical, ...(SYNONYM_GROUPS[canonical] || [])])].filter(Boolean);
}

export function parseSearchQuery(value) {
  const raw = clean(value);
  const prefix = raw[0];
  const mode = prefix === "@" ? "users" : prefix === "#" ? "hashtags" : "all";
  const plain = raw.replace(/^[@#]+/, "").trim();

  return {
    raw,
    mode,
    plain,
    hashtag: normalizeHashtag(plain),
  };
}

export function uniqueNormalizedHashtags(values) {
  return [...new Set(values.map(normalizeHashtag).filter(Boolean))];
}
