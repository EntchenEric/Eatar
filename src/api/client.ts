import type { Restaurant, Group, Friend, SwipeWithRestaurant, Settings } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} ${text}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  // Restaurants
  getRestaurants: () => request<Restaurant[]>('/restaurants'),
  getRestaurant: (id: number) => request<Restaurant>(`/restaurants/${id}`),
  createRestaurant: (data: Partial<Restaurant>) =>
    request<Restaurant>('/restaurants', { method: 'POST', body: JSON.stringify(data) }),
  updateRestaurant: (id: number, data: Partial<Restaurant>) =>
    request<Restaurant>(`/restaurants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRestaurant: (id: number) =>
    request<void>(`/restaurants/${id}`, { method: 'DELETE' }),
  // Echte Restaurants aus OpenStreetMap (neu) laden.
  refreshFromArea: (params?: { lat?: number; lon?: number; radiusKm?: number }) =>
    request<{ source: string; found: number; inserted: number }>('/restaurants/refresh', {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    }),

  // Groups
  getGroups: () => request<Group[]>('/groups'),
  getGroupRestaurants: (groupId: number) =>
    request<Restaurant[]>(`/groups/${groupId}/restaurants`),
  createGroup: (data: Partial<Group>) =>
    request<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: number, data: Partial<Group>) =>
    request<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: number) =>
    request<void>(`/groups/${id}`, { method: 'DELETE' }),
  setGroupRestaurants: (groupId: number, restaurant_ids: number[]) =>
    request<Group & { restaurant_ids: number[] }>(`/groups/${groupId}/restaurants`, {
      method: 'POST',
      body: JSON.stringify({ restaurant_ids }),
    }),

  // Group members (aus der Freunde-Liste zugeordnet)
  getGroupMembers: (groupId: number) =>
    request<Friend[]>(`/groups/${groupId}/members`),
  addGroupMember: (groupId: number, friend_id: number) =>
    request<{ group_id: number; member_ids: number[]; members: number }>(
      `/groups/${groupId}/members`,
      { method: 'POST', body: JSON.stringify({ friend_id }) }
    ),
  removeGroupMember: (groupId: number, friend_id: number) =>
    request<{ group_id: number; member_ids: number[]; members: number }>(
      `/groups/${groupId}/members/${friend_id}`,
      { method: 'DELETE' }
    ),

  // Friends
  getFriends: () => request<Friend[]>('/friends'),
  addFriend: (name: string, avatar_url?: string) =>
    request<Friend>('/friends', { method: 'POST', body: JSON.stringify({ name, avatar_url }) }),
  updateFriend: (id: number, data: Partial<Friend>) =>
    request<Friend>(`/friends/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFriend: (id: number) =>
    request<void>(`/friends/${id}`, { method: 'DELETE' }),

  // Swipes
  getSwipes: () => request<SwipeWithRestaurant[]>('/swipes/likes'),
  createSwipe: (restaurant_id: number, direction: 'like' | 'reject') =>
    request<{ id: number; restaurant_id: number; direction: string }>('/swipes', {
      method: 'POST',
      body: JSON.stringify({ restaurant_id, direction }),
    }),
  resetSwipes: () =>
    request<void>('/swipes', { method: 'DELETE' }),

  // Settings
  getSettings: () => request<Settings>('/settings'),
  updateSetting: (key: string, value: string | boolean | number) =>
    request<{ key: string; value: string }>(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  deleteSetting: (key: string) =>
    request<void>(`/settings/${key}`, { method: 'DELETE' }),

  // Uploads
  uploadImage: (dataUrl: string) =>
    request<{ url: string }>('/uploads', { method: 'POST', body: JSON.stringify({ image: dataUrl }) }),
};