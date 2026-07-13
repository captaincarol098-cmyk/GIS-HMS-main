import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

// ─── Center & Bounds ──────────────────────────────────────────────────────────
// Centered on Cabadbaran City proper (OSM-derived)
export const CABADBARAN_CENTER: LatLngExpression = [9.118, 125.565];

// Tight bounds covering all 31 barangays (derived from OSM coordinates)
export const CABADBARAN_BOUNDS: LatLngBoundsExpression = [
  [9.07,  125.51],  // SW
  [9.20,  125.65],  // NE
];

// Barangays NOT part of Cabadbaran City — excluded from all map/heatmap displays
export const EXCLUDED_BARANGAY_NAMES = new Set(["Concepcion"]);

export const CABADBARAN_MAP_OPTIONS = {
  center: CABADBARAN_CENTER,
  maxBounds: CABADBARAN_BOUNDS,
  maxBoundsViscosity: 1.0,
  minZoom: 12,
  zoom: 13,
  zoomControl: true,
};

// ─── Mask — dark overlay that covers EVERYTHING outside the city ──────────────
export const CABADBARAN_MASK: LatLngExpression[][] = [
  // Outer ring: covers whole world
  [[-90, -180], [90, -180], [90, 180], [-90, 180], [-90, -180]],
  // Inner hole: only this rectangle is left clear = Cabadbaran City bounds
  [
    [9.07,  125.51],
    [9.07,  125.65],
    [9.20,  125.65],
    [9.20,  125.51],
    [9.07,  125.51],
  ],
];

// ─── Map class ────────────────────────────────────────────────────────────────
export const CABADBARAN_MAP_CLASS =
  "h-full w-full rounded-lg border border-slate-200 shadow-sm";

// ─── Tile Layers ──────────────────────────────────────────────────────────────
export const TILE_LAYERS = {
  Default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  Streets: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  Terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; OpenTopoMap (CC-BY-SA)",
  },
  Satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, GeoEye, Earthstar Geographics",
  },
  Dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  Light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
} as const;

// ─── Street Labels Overlay (for Satellite + Streets hybrid) ──────────────────
export const STREET_LABELS_OVERLAY = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
};

export type TileLayerKey = keyof typeof TILE_LAYERS;

// ─── Real Barangay Coordinates (OSM-verified WGS84) ─────────────────────────
// Poblacion 1-12 are clustered around the city center; spread slightly to avoid overlap
export const BARANGAY_COORDS: Record<string, [number, number]> = {
  "Antonio Luna": [9.0827,  125.5918],
  "Bay-ang":      [9.1033,  125.5779],
  "Bayabas":      [9.1451,  125.5940],
  "Caasinan":     [9.1365,  125.5233],
  "Cabinet":      [9.1269,  125.5268],
  "Calamba":      [9.0974,  125.6062],
  "Calibunan":    [9.1062,  125.5307],
  "Comagascas":   [9.1357,  125.5599],
  // Concepcion is NOT part of Cabadbaran City — intentionally excluded
  "Del Pilar":    [9.1527,  125.5827],
  "Katugasan":    [9.1316,  125.5875],
  "Kauswagan":    [9.1304,  125.5334],
  "La Union":     [9.0845,  125.5364],
  "Mabini":       [9.1141,  125.5517],
  "Mahaba":       [9.1032,  125.6315],
  // Poblacion cluster — spread in a 4×3 grid around city center (~9.125, 125.535)
  "Poblacion 1":  [9.1270,  125.5310],
  "Poblacion 2":  [9.1270,  125.5340],
  "Poblacion 3":  [9.1270,  125.5370],
  "Poblacion 4":  [9.1240,  125.5310],
  "Poblacion 5":  [9.1240,  125.5340],
  "Poblacion 6":  [9.1240,  125.5370],
  "Poblacion 7":  [9.1210,  125.5310],
  "Poblacion 8":  [9.1210,  125.5340],
  "Poblacion 9":  [9.1210,  125.5370],
  "Poblacion 10": [9.1180,  125.5310],
  "Poblacion 11": [9.1180,  125.5340],
  "Poblacion 12": [9.1180,  125.5370],
  "Puting Bato":  [9.1260,  125.6362],
  "Sanghan":      [9.0868,  125.5724],
  "Soriano":      [9.0984,  125.5645],
  "Tolosa":       [9.1199,  125.5261],
};

// ─── Polygon builder: small square around each barangay center ───────────────
function makePoly(lat: number, lng: number): [number, number][] {
  const hw = 0.004;
  const hh = 0.004;
  return [
    [lat - hh, lng - hw],
    [lat - hh, lng + hw],
    [lat + hh, lng + hw],
    [lat + hh, lng - hw],
    [lat - hh, lng - hw],
  ];
}

export const BARANGAY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: Object.entries(BARANGAY_COORDS).map(([name, [lat, lng]]) => ({
    type: "Feature" as const,
    properties: { name },
    geometry: {
      type: "Polygon" as const,
      // GeoJSON uses [lng, lat] order
      coordinates: [makePoly(lat, lng).map(([lt, ln]) => [ln, lt])],
    },
  })),
};

// ─── Bounds helper ────────────────────────────────────────────────────────────
export function isWithinCabadbaranBounds(lat: number, lng: number) {
  const [[south, west], [north, east]] = CABADBARAN_BOUNDS as [
    [number, number],
    [number, number],
  ];
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
