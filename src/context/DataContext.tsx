import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Restaurant, Group, Friend, SwipeWithRestaurant, Settings } from '../types';

interface DataContextType {
  restaurants: Restaurant[];
  groups: Group[];
  friends: Friend[];
  likes: SwipeWithRestaurant[];
  settings: Settings;
  loading: boolean;
  refreshRestaurants: () => void;
  refreshGroups: () => void;
  refreshFriends: () => void;
  refreshLikes: () => void;
  refreshSettings: () => void;
  // Optmistische Updates (UI reagiert sofort, Server wird im Hintergrund synchronisiert)
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  setLikes: React.Dispatch<React.SetStateAction<SwipeWithRestaurant[]>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [likes, setLikes] = useState<SwipeWithRestaurant[]>([]);
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    dark_mode: false,
    location: true,
    radius: 10,
  });
  const [loading, setLoading] = useState(true);

  const refreshRestaurants = useCallback(() => {
    api.getRestaurants().then(setRestaurants).catch(console.error);
  }, []);
  const refreshGroups = useCallback(() => {
    api.getGroups().then(setGroups).catch(console.error);
  }, []);
  const refreshFriends = useCallback(() => {
    api.getFriends().then(setFriends).catch(console.error);
  }, []);
  const refreshLikes = useCallback(() => {
    api.getSwipes().then(setLikes).catch(console.error);
  }, []);
  const refreshSettings = useCallback(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getRestaurants().then(setRestaurants),
      api.getGroups().then(setGroups),
      api.getFriends().then(setFriends),
      api.getSwipes().then(setLikes),
      api.getSettings().then(setSettings),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider
      value={{
        restaurants, groups, friends, likes, settings, loading,
        refreshRestaurants, refreshGroups, refreshFriends, refreshLikes, refreshSettings,
        setRestaurants, setGroups, setFriends, setLikes, setSettings,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}