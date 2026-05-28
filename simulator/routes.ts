export interface Waypoint {
  lat: number;
  lng: number;
}

// Build a closed loop of waypoints around a center (degrees).
function makeLoop(
  centerLat: number,
  centerLng: number,
  radius: number,
  steps = 12,
): Waypoint[] {
  const points: Waypoint[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    points.push({
      lat: centerLat + radius * Math.cos(angle),
      lng: centerLng + radius * Math.sin(angle),
    });
  }
  return points;
}

// Five loops around different areas of Hyderabad, Sindh, Pakistan (~25.39N, 68.37E).
export const ROUTES: Record<string, Waypoint[]> = {
  'v-001': makeLoop(25.396, 68.374, 0.01),
  'v-002': makeLoop(25.38, 68.36, 0.012),
  'v-003': makeLoop(25.41, 68.39, 0.008),
  'v-004': makeLoop(25.42, 68.355, 0.011),
  'v-005': makeLoop(25.37, 68.385, 0.009),
};

export const VEHICLE_IDS = Object.keys(ROUTES);
