// ── Toggle this for remote testing ──────────────────────────────────────────
// Set USE_TUNNEL=true and paste your ngrok URL below when sharing with remote users.
// Revert USE_TUNNEL=false when back to local development.
const USE_TUNNEL = false;
const TUNNEL_URL = 'https://cf7f29b309cceb.lhr.life';
const LOCAL_URL = 'http://10.90.212.156:8000';
const BASE_URL = USE_TUNNEL ? TUNNEL_URL : LOCAL_URL;

export const API = {
  base: BASE_URL,
  listings: `${BASE_URL}/api/listings/`,
  listingDetail: (id: number) => `${BASE_URL}/api/listings/${id}/`,
  listingCreate: `${BASE_URL}/api/listings/create/`,
  listingUpdate: (id: number) => `${BASE_URL}/api/listings/${id}/update/`,
  listingDelete: (id: number) => `${BASE_URL}/api/listings/${id}/delete/`,
  reservations: (month?: number, year?: number, listingId?: number) => {
    let url = `${BASE_URL}/api/reservations/?`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    if (listingId) url += `listing_id=${listingId}&`;
    return url;
  },
  reservationDetail: (id: number) => `${BASE_URL}/api/reservations/${id}/`,
  reservationCreate: `${BASE_URL}/api/reservations/create/`,
  reservationUpdate: (id: number) => `${BASE_URL}/api/reservations/${id}/update/`,
  reservationDelete: (id: number) => `${BASE_URL}/api/reservations/${id}/delete/`,
};

export default API;
