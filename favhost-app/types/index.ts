export interface Listing {
  id: number;
  room_title: string;
  image_url: string | null;
  reservation_count?: number;
}

export interface Reservation {
  id: number;
  listing_id: number;
  listing_title: string;
  guest_name: string;
  guest_photo_url: string | null;
  checkin_date: string;   // 'YYYY-MM-DD'
  checkout_date: string;  // 'YYYY-MM-DD'
  nights: number;
  price_per_night: string | null;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  reservations: Reservation[];
}
