import * as Location from 'expo-location';
import type { CoarseLocation } from '@/types/domain';

/** About 5 km of precision: enough for "About 12 km away", too coarse to find someone. */
export function coarsen(location: CoarseLocation): CoarseLocation {
  const round = (v: number) => Math.round(v * 20) / 20;
  return { lat: round(location.lat), lng: round(location.lng) };
}

export type LocationResult =
  | { ok: true; location: CoarseLocation; areaLabel?: string }
  | { ok: false; reason: 'denied' | 'unavailable'; message: string };

/** Asks for foreground permission, reads an approximate position and rounds it before returning. */
export async function getCoarseDeviceLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, reason: 'denied', message: 'Location is off for Hall Pass. You can keep using your typed area, or allow location in Settings.' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const location = coarsen({ lat: position.coords.latitude, lng: position.coords.longitude });
    let areaLabel: string | undefined;
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: location.lat, longitude: location.lng });
      areaLabel = place?.district ?? place?.subregion ?? place?.city ?? undefined;
    } catch {
      // Reverse geocoding isn't available everywhere (for example on the web); the typed area is kept.
    }
    return { ok: true, location, areaLabel };
  } catch {
    return { ok: false, reason: 'unavailable', message: 'We couldn’t get your location right now. Your typed area will be used instead.' };
  }
}
