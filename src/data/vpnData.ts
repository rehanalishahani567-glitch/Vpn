import { DnsProvider, OriginNode, ProtocolOption, ShieldLogEntry, SplitTunnelRule, SubscriptionPlan, VpnPreferences, VpnServer } from '../types/vpn';

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export function projectGeo(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return { x, y };
}

// High-resolution coastal polygons [lat, lon] for crisp world cartography & spherical dot sampling
export const WORLD_CONTINENT_POLYGONS: Array<{ name: string; coords: Array<[number, number]> }> = [
  {
    name: 'North America',
    coords: [
      [71, -156], [70, -140], [69, -125], [71, -110], [68, -95], [63, -90], [56, -80],
      [61, -76], [62, -66], [54, -57], [47, -53], [45, -60], [44, -66], [42, -70],
      [40, -74], [35, -75], [30, -81], [25, -80], [26, -82], [30, -84], [29, -90],
      [29, -95], [26, -97], [21, -97], [18, -93], [21, -90], [21, -87], [16, -88],
      [15, -83], [10, -83], [8, -77], [8, -80], [10, -85], [14, -92], [16, -98],
      [20, -105], [24, -107], [28, -111], [23, -110], [32, -117], [34, -120],
      [38, -123], [42, -124], [48, -125], [52, -128], [58, -137], [60, -148],
      [56, -158], [55, -163], [60, -166], [65, -168], [68, -166],
    ],
  },
  {
    name: 'Greenland',
    coords: [
      [83, -34], [81, -17], [75, -19], [70, -22], [65, -38], [60, -44], [64, -52],
      [70, -54], [76, -68], [80, -65], [82, -50],
    ],
  },
  {
    name: 'Cuba & Caribbean',
    coords: [
      [23, -83], [22, -78], [20, -74], [19, -77], [21, -80], [22, -84],
    ],
  },
  {
    name: 'South America',
    coords: [
      [12, -72], [11, -63], [9, -60], [5, -52], [1, -49], [-2, -42], [-5, -35],
      [-10, -36], [-15, -39], [-22, -41], [-25, -48], [-32, -52], [-36, -57],
      [-41, -64], [-47, -66], [-54, -68], [-55, -71], [-51, -75], [-43, -74],
      [-35, -72], [-27, -71], [-18, -71], [-12, -77], [-5, -81], [0, -80],
      [4, -77], [9, -76],
    ],
  },
  {
    name: 'UK & Ireland',
    coords: [
      [58.5, -5], [57.5, -1.8], [55, -1.5], [53, 0.2], [51.2, 1.4], [50.1, -5.5],
      [52.5, -4.5], [54.5, -5.8], [52, -10], [54.5, -8.5], [56.5, -6],
    ],
  },
  {
    name: 'Iceland',
    coords: [
      [66.4, -16], [65, -13.5], [63.4, -19], [64.2, -22.5], [66, -24],
    ],
  },
  {
    name: 'Continental Europe',
    coords: [
      [36, -6], [37, -9], [43, -9.2], [43.5, -1.8], [47.5, -4.5], [49.5, -1.5],
      [51, 2], [53.5, 6], [55, 8.2], [57.5, 10], [54.5, 10.5], [54, 14], [55, 19],
      [58, 22], [60, 29], [65, 35], [68, 41], [66, 26], [62, 21], [59.5, 18],
      [56, 13], [59, 10], [58, 6], [62, 5], [67, 14], [71, 26], [70, 31],
      [66, 42], [59, 38], [52, 36], [46, 31], [45, 29], [41, 29], [38, 24],
      [37, 22], [40, 19], [45, 14], [44, 12.5], [40, 18], [38, 16], [41, 13],
      [44, 9], [43, 5], [41, 2], [37, -1],
    ],
  },
  {
    name: 'Africa',
    coords: [
      [35.8, -5.5], [37, 10], [33, 12], [31, 18], [32, 25], [31.5, 32.5], [27, 34],
      [21, 37], [15, 40], [11.5, 43.5], [12, 51], [6, 49], [0, 43], [-6, 39],
      [-11, 40.5], [-18, 37], [-25, 34], [-31, 30], [-34.5, 25], [-34.5, 18.5],
      [-28, 16], [-21, 13.5], [-13, 12.5], [-5, 11.5], [2, 9.5], [4.5, 8],
      [5, 2], [4.5, -7.5], [8, -13.5], [14.5, -17.5], [21, -17], [28, -13], [33, -8.5],
    ],
  },
  {
    name: 'Madagascar',
    coords: [
      [-12, 49.3], [-16, 50], [-24.5, 47.3], [-25, 44.5], [-19, 44], [-14, 47.5],
    ],
  },
  {
    name: 'Middle East & India',
    coords: [
      [41.5, 29], [41.5, 41], [46, 39], [47, 48], [44, 52], [41, 60], [38, 68],
      [35, 74], [30, 80], [27, 88], [22, 91], [20, 86], [14, 80.5], [8, 77.5],
      [13, 75], [20, 72.5], [23, 68.5], [25, 65], [25.5, 58], [26.5, 56], [25, 55],
      [26, 50.5], [29.5, 48], [24, 53], [22.5, 59.5], [17, 54.5], [12.7, 45],
      [13, 43.3], [21, 39], [29, 34.8], [31.5, 34], [36.5, 36], [36, 27], [40, 26],
    ],
  },
  {
    name: 'East & Southeast Asia',
    coords: [
      [53, 120], [53, 141], [46, 138], [41, 130], [35, 129], [37, 126],
      [39, 122], [38, 118], [34, 120], [30, 122], [24, 118], [22, 113], [20, 107],
      [16, 108], [10, 107], [9, 104], [13, 100.5], [6, 103], [1.5, 104], [6, 100],
      [11, 98.5], [16, 97], [17, 94], [22, 91], [27, 88], [30, 80], [35, 78],
      [42, 82], [49, 90], [52, 106],
    ],
  },
  {
    name: 'Northern Asia',
    coords: [
      [67, 44], [69, 60], [73, 72], [77, 104], [73, 125], [70, 145], [69, 175],
      [64, 178], [60, 164], [52, 157], [59, 148], [53, 141], [53, 120], [52, 106],
      [49, 90], [42, 82], [38, 68], [41, 60], [44, 52], [47, 48], [56, 46],
    ],
  },
  {
    name: 'Japan',
    coords: [
      [45.3, 142], [43, 145.5], [41.5, 141], [38, 141.5], [35, 140], [33.5, 135.5],
      [31.5, 131], [33.5, 130], [36, 136], [39.5, 140], [42, 140.5],
    ],
  },
  {
    name: 'Sumatra & Java',
    coords: [
      [5.5, 95.3], [1, 103], [-6, 106], [-8.5, 114.5], [-7, 105], [-3, 101], [2, 97],
    ],
  },
  {
    name: 'Borneo & Sulawesi',
    coords: [
      [6.8, 117], [4, 118.5], [-3.5, 116], [-3, 110.5], [2, 109.5], [5, 115],
    ],
  },
  {
    name: 'Philippines',
    coords: [
      [18.5, 121], [15, 121.5], [9, 126], [6, 125], [9, 122], [14, 120],
    ],
  },
  {
    name: 'Australia',
    coords: [
      [-11, 132], [-12, 136.5], [-15, 136], [-11, 142.5], [-16, 145.5], [-24, 152],
      [-32, 152.5], [-37.5, 150], [-38.5, 144], [-35, 136], [-32, 131], [-33.5, 122],
      [-34.5, 115], [-27, 113.5], [-22, 114], [-18, 122], [-14, 126.5],
    ],
  },
  {
    name: 'New Zealand',
    coords: [
      [-34.5, 173], [-38, 178], [-41.5, 175.5], [-46.5, 168.5], [-44, 168], [-39, 174],
    ],
  },
];

function pointInPolygon(lat: number, lon: number, poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0];
    const xi = poly[i][1];
    const yj = poly[j][0];
    const xj = poly[j][1];
    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface WorldLandDot {
  lat: number;
  lon: number;
}

// Generates ~5,200 equal-area spherical land dots for crisp high-definition 3D Globe & Map rendering
export function generateWorldLandDots(): WorldLandDot[] {
  const dots: WorldLandDot[] = [];
  const latStep = 1.9;
  for (let lat = -60; lat <= 82; lat += latStep) {
    const cosLat = Math.max(0.22, Math.cos((lat * Math.PI) / 180));
    const lonStep = latStep / cosLat;
    for (let lon = -180; lon < 180; lon += lonStep) {
      for (let p = 0; p < WORLD_CONTINENT_POLYGONS.length; p++) {
        if (pointInPolygon(lat, lon, WORLD_CONTINENT_POLYGONS[p].coords)) {
          dots.push({ lat, lon });
          break;
        }
      }
    }
  }
  return dots;
}

export const GLOBAL_ORIGIN_PRESETS: OriginNode[] = [
  { city: 'New York', country: 'United States', code: 'US', lat: 40.7128, lon: -74.006, ispIp: 'Auto' },
  { city: 'London', country: 'United Kingdom', code: 'GB', lat: 51.5072, lon: -0.1276, ispIp: 'Auto' },
  { city: 'Frankfurt', country: 'Germany', code: 'DE', lat: 50.1109, lon: 8.6821, ispIp: 'Auto' },
  { city: 'Paris', country: 'France', code: 'FR', lat: 48.8566, lon: 2.3522, ispIp: 'Auto' },
  { city: 'Dubai', country: 'United Arab Emirates', code: 'AE', lat: 25.2048, lon: 55.2708, ispIp: 'Auto' },
  { city: 'Singapore', country: 'Singapore', code: 'SG', lat: 1.3521, lon: 103.8198, ispIp: 'Auto' },
  { city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lon: 139.6503, ispIp: 'Auto' },
  { city: 'Sydney', country: 'Australia', code: 'AU', lat: -33.8688, lon: 151.2093, ispIp: 'Auto' },
  { city: 'Toronto', country: 'Canada', code: 'CA', lat: 43.6532, lon: -79.3832, ispIp: 'Auto' },
  { city: 'Sao Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lon: -46.6333, ispIp: 'Auto' },
  { city: 'Mumbai', country: 'India', code: 'IN', lat: 19.076, lon: 72.8777, ispIp: 'Auto' },
  { city: 'Karachi', country: 'Pakistan', code: 'PK', lat: 24.8607, lon: 67.0011, ispIp: 'Auto' },
  { city: 'Cairo', country: 'Egypt', code: 'EG', lat: 30.0444, lon: 31.2357, ispIp: 'Auto' },
  { city: 'Johannesburg', country: 'South Africa', code: 'ZA', lat: -26.2041, lon: 28.0473, ispIp: 'Auto' },
];

const TIMEZONE_ORIGIN_MAP: Array<{ match: string; node: OriginNode }> = [
  { match: 'America/New_York', node: { city: 'New York', country: 'United States', code: 'US', lat: 40.7128, lon: -74.006, ispIp: '127.0.0.1' } },
  { match: 'America/Los_Angeles', node: { city: 'Los Angeles', country: 'United States', code: 'US', lat: 34.0522, lon: -118.2437, ispIp: '127.0.0.1' } },
  { match: 'America/Chicago', node: { city: 'Chicago', country: 'United States', code: 'US', lat: 41.8781, lon: -87.6298, ispIp: '127.0.0.1' } },
  { match: 'America/Denver', node: { city: 'Denver', country: 'United States', code: 'US', lat: 39.7392, lon: -104.9903, ispIp: '127.0.0.1' } },
  { match: 'America/Toronto', node: { city: 'Toronto', country: 'Canada', code: 'CA', lat: 43.6532, lon: -79.3832, ispIp: '127.0.0.1' } },
  { match: 'America/Vancouver', node: { city: 'Vancouver', country: 'Canada', code: 'CA', lat: 49.2827, lon: -123.1207, ispIp: '127.0.0.1' } },
  { match: 'America/Mexico_City', node: { city: 'Mexico City', country: 'Mexico', code: 'MX', lat: 19.4326, lon: -99.1332, ispIp: '127.0.0.1' } },
  { match: 'America/Sao_Paulo', node: { city: 'Sao Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lon: -46.6333, ispIp: '127.0.0.1' } },
  { match: 'Europe/London', node: { city: 'London', country: 'United Kingdom', code: 'GB', lat: 51.5072, lon: -0.1276, ispIp: '127.0.0.1' } },
  { match: 'Europe/Paris', node: { city: 'Paris', country: 'France', code: 'FR', lat: 48.8566, lon: 2.3522, ispIp: '127.0.0.1' } },
  { match: 'Europe/Berlin', node: { city: 'Berlin', country: 'Germany', code: 'DE', lat: 52.52, lon: 13.405, ispIp: '127.0.0.1' } },
  { match: 'Europe/Zurich', node: { city: 'Zurich', country: 'Switzerland', code: 'CH', lat: 47.3769, lon: 8.5417, ispIp: '127.0.0.1' } },
  { match: 'Europe/Amsterdam', node: { city: 'Amsterdam', country: 'Netherlands', code: 'NL', lat: 52.3676, lon: 4.9041, ispIp: '127.0.0.1' } },
  { match: 'Europe/Stockholm', node: { city: 'Stockholm', country: 'Sweden', code: 'SE', lat: 59.3293, lon: 18.0686, ispIp: '127.0.0.1' } },
  { match: 'Europe/Madrid', node: { city: 'Madrid', country: 'Spain', code: 'ES', lat: 40.4168, lon: -3.7038, ispIp: '127.0.0.1' } },
  { match: 'Europe/Rome', node: { city: 'Rome', country: 'Italy', code: 'IT', lat: 41.9028, lon: 12.4964, ispIp: '127.0.0.1' } },
  { match: 'Europe/Istanbul', node: { city: 'Istanbul', country: 'Turkey', code: 'TR', lat: 41.0082, lon: 28.9784, ispIp: '127.0.0.1' } },
  { match: 'Asia/Dubai', node: { city: 'Dubai', country: 'United Arab Emirates', code: 'AE', lat: 25.2048, lon: 55.2708, ispIp: '127.0.0.1' } },
  { match: 'Asia/Riyadh', node: { city: 'Riyadh', country: 'Saudi Arabia', code: 'SA', lat: 24.7136, lon: 46.6753, ispIp: '127.0.0.1' } },
  { match: 'Asia/Qatar', node: { city: 'Doha', country: 'Qatar', code: 'QA', lat: 25.2854, lon: 51.531, ispIp: '127.0.0.1' } },
  { match: 'Asia/Karachi', node: { city: 'Karachi', country: 'Pakistan', code: 'PK', lat: 24.8607, lon: 67.0011, ispIp: '127.0.0.1' } },
  { match: 'Asia/Kolkata', node: { city: 'Mumbai', country: 'India', code: 'IN', lat: 19.076, lon: 72.8777, ispIp: '127.0.0.1' } },
  { match: 'Asia/Calcutta', node: { city: 'Mumbai', country: 'India', code: 'IN', lat: 19.076, lon: 72.8777, ispIp: '127.0.0.1' } },
  { match: 'Asia/Singapore', node: { city: 'Singapore', country: 'Singapore', code: 'SG', lat: 1.3521, lon: 103.8198, ispIp: '127.0.0.1' } },
  { match: 'Asia/Tokyo', node: { city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lon: 139.6503, ispIp: '127.0.0.1' } },
  { match: 'Asia/Seoul', node: { city: 'Seoul', country: 'South Korea', code: 'KR', lat: 37.5665, lon: 126.978, ispIp: '127.0.0.1' } },
  { match: 'Australia/Sydney', node: { city: 'Sydney', country: 'Australia', code: 'AU', lat: -33.8688, lon: 151.2093, ispIp: '127.0.0.1' } },
  { match: 'Australia/Melbourne', node: { city: 'Melbourne', country: 'Australia', code: 'AU', lat: -37.8136, lon: 144.9631, ispIp: '127.0.0.1' } },
  { match: 'Africa/Cairo', node: { city: 'Cairo', country: 'Egypt', code: 'EG', lat: 30.0444, lon: 31.2357, ispIp: '127.0.0.1' } },
  { match: 'Africa/Johannesburg', node: { city: 'Johannesburg', country: 'South Africa', code: 'ZA', lat: -26.2041, lon: 28.0473, ispIp: '127.0.0.1' } },
];

export const DEFAULT_GLOBAL_ORIGIN: OriginNode = {
  city: 'London',
  country: 'United Kingdom',
  code: 'GB',
  lat: 51.5072,
  lon: -0.1276,
  ispIp: 'Auto',
};

export function detectOriginFromTimezone(): OriginNode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const exact = TIMEZONE_ORIGIN_MAP.find((entry) => entry.match === tz);
    if (exact) return exact.node;

    if (tz.startsWith('America/')) return GLOBAL_ORIGIN_PRESETS[0]; // New York
    if (tz.startsWith('Europe/')) return GLOBAL_ORIGIN_PRESETS[1]; // London
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return GLOBAL_ORIGIN_PRESETS[7]; // Sydney
    if (tz.startsWith('Africa/')) return GLOBAL_ORIGIN_PRESETS[12]; // Cairo
    if (tz.startsWith('Asia/')) return GLOBAL_ORIGIN_PRESETS[5]; // Singapore
  } catch {
    // ignore Intl fallback errors
  }
  return DEFAULT_GLOBAL_ORIGIN;
}

export function computeRouteLatencyMs(origin: OriginNode, server: VpnServer): number {
  const toRad = Math.PI / 180;
  const dLat = (server.lat - origin.lat) * toRad;
  const dLon = (server.lon - origin.lon) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(origin.lat * toRad) * Math.cos(server.lat * toRad) * Math.sin(dLon / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Fiber optic speed (~200,000 km/s) round-trip + baseline processing overhead
  const fiberRtt = (distanceKm * 2) / 200 + 12;
  return Math.max(9, Math.round(fiberRtt));
}

export const FREE_SERVER_IDS: string[] = [
  'ch-zrh-01',
  'de-fra-04',
  'gb-lon-07',
  'sg-sin-03',
  'us-nyc-08',
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Essential everyday privacy across 5 major hubs',
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    deviceLimit: 1,
    bandwidthLabel: 'Standard 1 Gbps',
    serverAccessLabel: '5 Global Locations',
    features: [
      '5 global server cities across 3 continents',
      'WireGuard & OpenVPN encryption',
      '1 active device connection',
      'Automatic Kill Switch protection',
      'Strict zero-activity logging',
    ],
  },
  {
    id: 'pro',
    name: 'Meridian Pro',
    tagline: 'Full global network with high-speed streaming & ad blocking',
    monthlyPriceUsd: 6.99,
    yearlyMonthlyPriceUsd: 3.99,
    deviceLimit: 10,
    bandwidthLabel: '10 Gbps Turbo',
    serverAccessLabel: 'All 16 Global Locations',
    highlighted: true,
    features: [
      'Unlock all 16 countries & cities worldwide',
      '10 Gbps+ ultra-fast streaming & gaming routes',
      'Up to 10 devices connected simultaneously',
      'Built-in Ad & Tracker Blocker',
      'Streaming & P2P optimized nodes',
    ],
  },
  {
    id: 'max',
    name: 'Meridian Max',
    tagline: 'Multi-hop privacy & dedicated IP for power users worldwide',
    monthlyPriceUsd: 11.99,
    yearlyMonthlyPriceUsd: 6.99,
    deviceLimit: 25,
    bandwidthLabel: '40 Gbps Priority Core',
    serverAccessLabel: 'All Locations + Static IP',
    features: [
      'Everything in Meridian Pro',
      'Up to 25 simultaneous devices',
      'Double-Hop multi-country encrypted routing',
      'Dedicated Static IP address included',
      '24/7 priority global engineering support',
    ],
  },
];

export const VPN_SERVERS: VpnServer[] = [
  {
    id: 'ch-zrh-01',
    country: 'Switzerland',
    city: 'Zurich',
    code: 'CH',
    region: 'Europe',
    lat: 47.3769,
    lon: 8.5417,
    baseLatencyMs: 92,
    loadPercent: 21,
    virtualIp: '185.156.46.114',
    ipv6Prefix: '2a07:e00::4c11',
    hostname: 'zrh-core-01.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'de-fra-04',
    country: 'Germany',
    city: 'Frankfurt',
    code: 'DE',
    region: 'Europe',
    lat: 50.1109,
    lon: 8.6821,
    baseLatencyMs: 86,
    loadPercent: 34,
    virtualIp: '194.36.108.42',
    ipv6Prefix: '2a01:4f8::9a21',
    hostname: 'fra-edge-04.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'nl-ams-02',
    country: 'Netherlands',
    city: 'Amsterdam',
    code: 'NL',
    region: 'Europe',
    lat: 52.3676,
    lon: 4.9041,
    baseLatencyMs: 94,
    loadPercent: 29,
    virtualIp: '185.220.101.78',
    ipv6Prefix: '2a00:1450::77b',
    hostname: 'ams-core-02.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'gb-lon-07',
    country: 'United Kingdom',
    city: 'London',
    code: 'GB',
    region: 'Europe',
    lat: 51.5072,
    lon: -0.1276,
    baseLatencyMs: 99,
    loadPercent: 48,
    virtualIp: '185.199.108.153',
    ipv6Prefix: '2a02:6b8::31f',
    hostname: 'lon-edge-07.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: false,
    supportsDoubleHop: true,
    tierCapacityGbps: 25,
  },
  {
    id: 'se-sto-01',
    country: 'Sweden',
    city: 'Stockholm',
    code: 'SE',
    region: 'Europe',
    lat: 59.3293,
    lon: 18.0686,
    baseLatencyMs: 112,
    loadPercent: 18,
    virtualIp: '193.138.218.71',
    ipv6Prefix: '2a03:1b20::804',
    hostname: 'sto-vault-01.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 25,
  },
  {
    id: 'is-rek-01',
    country: 'Iceland',
    city: 'Reykjavik',
    code: 'IS',
    region: 'Europe',
    lat: 64.1466,
    lon: -21.9426,
    baseLatencyMs: 134,
    loadPercent: 14,
    virtualIp: '185.112.147.22',
    ipv6Prefix: '2a04:2180::19c',
    hostname: 'rek-shield-01.meridianvpn.net',
    supportsStreaming: false,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 10,
  },
  {
    id: 'ae-dxb-02',
    country: 'United Arab Emirates',
    city: 'Dubai',
    code: 'AE',
    region: 'Middle East',
    lat: 25.2048,
    lon: 55.2708,
    baseLatencyMs: 28,
    loadPercent: 31,
    virtualIp: '185.107.56.19',
    ipv6Prefix: '2a06:98c0::55e',
    hostname: 'dxb-relay-02.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: false,
    supportsDoubleHop: true,
    tierCapacityGbps: 25,
  },
  {
    id: 'qa-doh-01',
    country: 'Qatar',
    city: 'Doha',
    code: 'QA',
    region: 'Middle East',
    lat: 25.2854,
    lon: 51.531,
    baseLatencyMs: 36,
    loadPercent: 19,
    virtualIp: '185.182.195.84',
    ipv6Prefix: '2a05:dfc0::12a',
    hostname: 'doh-relay-01.meridianvpn.net',
    supportsStreaming: false,
    supportsP2P: false,
    supportsDoubleHop: false,
    tierCapacityGbps: 10,
  },
  {
    id: 'sg-sin-03',
    country: 'Singapore',
    city: 'Singapore',
    code: 'SG',
    region: 'Asia Pacific',
    lat: 1.3521,
    lon: 103.8198,
    baseLatencyMs: 64,
    loadPercent: 39,
    virtualIp: '103.107.196.109',
    ipv6Prefix: '2400:6180::8b4',
    hostname: 'sin-core-03.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'jp-tyo-05',
    country: 'Japan',
    city: 'Tokyo',
    code: 'JP',
    region: 'Asia Pacific',
    lat: 35.6762,
    lon: 139.6503,
    baseLatencyMs: 118,
    loadPercent: 44,
    virtualIp: '138.199.21.204',
    ipv6Prefix: '2406:da14::6d2',
    hostname: 'tyo-edge-05.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'au-syd-02',
    country: 'Australia',
    city: 'Sydney',
    code: 'AU',
    region: 'Asia Pacific',
    lat: -33.8688,
    lon: 151.2093,
    baseLatencyMs: 148,
    loadPercent: 25,
    virtualIp: '103.214.220.66',
    ipv6Prefix: '2401:c080::33b',
    hostname: 'syd-edge-02.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: false,
    tierCapacityGbps: 25,
  },
  {
    id: 'kr-sel-01',
    country: 'South Korea',
    city: 'Seoul',
    code: 'KR',
    region: 'Asia Pacific',
    lat: 37.5665,
    lon: 126.978,
    baseLatencyMs: 124,
    loadPercent: 27,
    virtualIp: '146.70.118.92',
    ipv6Prefix: '2403:8940::71e',
    hostname: 'sel-core-01.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: false,
    supportsDoubleHop: true,
    tierCapacityGbps: 25,
  },
  {
    id: 'us-nyc-08',
    country: 'United States',
    city: 'New York',
    code: 'US',
    region: 'Americas',
    lat: 40.7128,
    lon: -74.006,
    baseLatencyMs: 162,
    loadPercent: 52,
    virtualIp: '198.54.132.88',
    ipv6Prefix: '2606:4700::2c4',
    hostname: 'nyc-core-08.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'us-sfo-03',
    country: 'United States',
    city: 'San Francisco',
    code: 'US',
    region: 'Americas',
    lat: 37.7749,
    lon: -122.4194,
    baseLatencyMs: 188,
    loadPercent: 33,
    virtualIp: '172.98.67.141',
    ipv6Prefix: '2600:1f18::94a',
    hostname: 'sfo-edge-03.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 40,
  },
  {
    id: 'ca-tor-02',
    country: 'Canada',
    city: 'Toronto',
    code: 'CA',
    region: 'Americas',
    lat: 43.6532,
    lon: -79.3832,
    baseLatencyMs: 169,
    loadPercent: 24,
    virtualIp: '149.248.55.12',
    ipv6Prefix: '2607:f8b0::41c',
    hostname: 'tor-core-02.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: true,
    supportsDoubleHop: true,
    tierCapacityGbps: 25,
  },
  {
    id: 'br-sao-01',
    country: 'Brazil',
    city: 'Sao Paulo',
    code: 'BR',
    region: 'Americas',
    lat: -23.5505,
    lon: -46.6333,
    baseLatencyMs: 214,
    loadPercent: 22,
    virtualIp: '177.54.148.39',
    ipv6Prefix: '2804:10c0::52d',
    hostname: 'sao-relay-01.meridianvpn.net',
    supportsStreaming: true,
    supportsP2P: false,
    supportsDoubleHop: false,
    tierCapacityGbps: 10,
  },
];

export const PROTOCOL_OPTIONS: ProtocolOption[] = [
  {
    id: 'wireguard',
    name: 'WireGuard',
    cipher: 'ChaCha20-Poly1305 · Curve25519',
    port: 'UDP 51820',
    speedRating: 98,
    stealthRating: 78,
    batteryRating: 95,
    summary: 'Modern kernel-space cryptography delivering minimal latency and maximum throughput.',
  },
  {
    id: 'openvpn-udp',
    name: 'OpenVPN UDP',
    cipher: 'AES-256-GCM · SHA-512',
    port: 'UDP 1194',
    speedRating: 82,
    stealthRating: 80,
    batteryRating: 76,
    summary: 'Battle-tested cipher suite tuned for fast streaming and low-overhead packet delivery.',
  },
  {
    id: 'openvpn-tcp',
    name: 'OpenVPN TCP',
    cipher: 'AES-256-GCM · TLS 1.3',
    port: 'TCP 443',
    speedRating: 68,
    stealthRating: 96,
    batteryRating: 72,
    summary: 'Routes encrypted traffic over HTTPS port 443 to bypass restrictive firewalls.',
  },
  {
    id: 'ikev2',
    name: 'IKEv2 / IPsec',
    cipher: 'AES-256-CBC · ECDH-384',
    port: 'UDP 500 / 4500',
    speedRating: 88,
    stealthRating: 72,
    batteryRating: 90,
    summary: 'Instant session handoff when switching between Wi-Fi and mobile cellular networks.',
  },
];

export const DNS_PROVIDERS: DnsProvider[] = [
  {
    id: 'meridian-dns',
    name: 'Meridian Zero-Log DNS',
    primaryIp: '10.64.0.1',
    secondaryIp: '10.64.0.2',
    dohEndpoint: 'https://dns.meridianvpn.net/dns-query',
    description: 'RAM-only internal resolvers with built-in tracker and malware sinkholing.',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare 1.1.1.1',
    primaryIp: '1.1.1.1',
    secondaryIp: '1.0.0.1',
    dohEndpoint: 'https://cloudflare-dns.com/dns-query',
    description: 'Anycast high-speed resolver with DNSSEC validation.',
  },
  {
    id: 'quad9',
    name: 'Quad9 Threat Block',
    primaryIp: '9.9.9.9',
    secondaryIp: '149.112.112.112',
    dohEndpoint: 'https://dns.quad9.net/dns-query',
    description: 'Swiss-based non-profit threat intelligence blocking known phishing domains.',
  },
  {
    id: 'custom',
    name: 'Custom Resolver',
    primaryIp: '94.140.14.14',
    secondaryIp: '94.140.15.15',
    dohEndpoint: 'https://custom.resolver/dns-query',
    description: 'Specify your own upstream DNS IPv4 endpoint inside the tunnel.',
  },
];

export const INITIAL_SHIELD_LOGS: ShieldLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '21:54:12',
    domain: 'metrics.icloud-telemetry.example',
    category: 'Telemetry',
    action: 'Blocked',
    nodeCode: 'CH',
  },
  {
    id: 'log-2',
    timestamp: '21:53:48',
    domain: 'pixel.doubleclick-ads.example',
    category: 'Ad Network',
    action: 'Blocked',
    nodeCode: 'CH',
  },
  {
    id: 'log-3',
    timestamp: '21:52:19',
    domain: 'fp-beacon.analytics-edge.example',
    category: 'Tracker',
    action: 'Blocked',
    nodeCode: 'CH',
  },
  {
    id: 'log-4',
    timestamp: '21:51:04',
    domain: 'cdn-verify.auth-portal.example',
    category: 'Malware',
    action: 'Blocked',
    nodeCode: 'AE',
  },
  {
    id: 'log-5',
    timestamp: '21:49:33',
    domain: 'adservice.partner-syndicate.example',
    category: 'Ad Network',
    action: 'Blocked',
    nodeCode: 'SG',
  },
];

export const INITIAL_SPLIT_RULES: SplitTunnelRule[] = [
  {
    id: 'rule-1',
    target: 'banking.local-portal.net',
    type: 'Domain',
    mode: 'Bypass VPN',
    enabled: true,
  },
  {
    id: 'rule-2',
    target: '192.168.1.0/24 (LAN Printers)',
    type: 'Domain',
    mode: 'Bypass VPN',
    enabled: true,
  },
  {
    id: 'rule-3',
    target: 'Terminal / SSH Client',
    type: 'Application',
    mode: 'Force Tunnel',
    enabled: true,
  },
  {
    id: 'rule-4',
    target: 'Media Player Stream',
    type: 'Application',
    mode: 'Force Tunnel',
    enabled: false,
  },
];

export const DEFAULT_PREFERENCES: VpnPreferences = {
  killSwitch: true,
  adTrackerShield: true,
  doubleHop: false,
  autoConnectUntrusted: true,
  protocol: 'wireguard',
  dnsId: 'meridian-dns',
  customDnsIp: '94.140.14.14',
  theme: 'dark',
};

export const SAMPLE_BLOCK_DOMAINS: Array<{ domain: string; category: ShieldLogEntry['category'] }> = [
  { domain: 'beacon.telemetry-cloud.net', category: 'Telemetry' },
  { domain: 'trk.cross-site-sync.io', category: 'Tracker' },
  { domain: 'ads.programmatic-bidder.com', category: 'Ad Network' },
  { domain: 'collect.device-fingerprint.org', category: 'Tracker' },
  { domain: 'dropper.spoof-cdn.net', category: 'Malware' },
  { domain: 'events.mobile-attribution.co', category: 'Telemetry' },
];
