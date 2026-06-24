export interface Restaurant {
  id: number;
  name: string;
  image_url: string;
  location: string;
  category: string;
  rating: number;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  icon_url: string;
  members: number;
  restaurant_ids: number[];
  member_ids?: number[];
  created_at: string;
}

export interface Friend {
  id: number;
  name: string;
  avatar_url: string;
  is_favorite: boolean;
  created_at: string;
}

export interface Swipe {
  id: number;
  restaurant_id: number;
  direction: 'like' | 'reject';
  created_at: string;
}

export interface SwipeWithRestaurant extends Swipe {
  name: string;
  image_url: string;
  location: string;
  category: string;
  rating: number;
}

export interface Settings {
  notifications: boolean;
  dark_mode: boolean;
  location: boolean;
  radius: number;
  // Profil wird in der Settings-Tabelle persistiert (beliebige Keys via /api/settings/:key).
  profile_name?: string;
  profile_avatar?: string;
}