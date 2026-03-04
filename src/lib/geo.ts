/**
 * Haversine distance calculation between two GPS coordinates.
 * Returns distance in kilometers.
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API.
 * Returns village, district, state, and pincode.
 */
export interface GeocodedLocation {
    village: string;
    district: string;
    state: string;
    pincode: string;
}

export async function reverseGeocode(
    lat: number,
    lon: number
): Promise<GeocodedLocation> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        {
            headers: {
                "Accept-Language": "en",
            },
        }
    );
    const data = await response.json();
    const addr = data.address || {};

    return {
        village: addr.village || addr.town || addr.city || addr.suburb || "",
        district: addr.county || addr.state_district || addr.district || "",
        state: addr.state || "",
        pincode: addr.postcode || "",
    };
}
