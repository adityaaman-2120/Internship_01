// ── Target environment ──────────────────────────────────────────────────────
//   'local'    → your local dev server
//   'tunnel'   → ngrok/LHR tunnel for sharing
//   'production' → Render.com (set RENDER_URL below after deploy)
const TARGET: 'local' | 'tunnel' | 'production' = 'local';

const TUNNEL_URL = 'https://cf7f29b309cceb.lhr.life';
const LOCAL_URL = 'http://10.90.212.156:8000';
const RENDER_URL = 'https://REPLACE_ME.onrender.com';

const BASE_URL =
  TARGET === 'production' ? RENDER_URL :
  TARGET === 'tunnel' ? TUNNEL_URL :
  LOCAL_URL;

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
