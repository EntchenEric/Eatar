import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, TrendingUp, Clock, Sparkles, PlusCircle, Users, RefreshCw } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../api/client";
import {
  SkeletonStatCards,
  SkeletonGroupPills,
  SkeletonMatchRow,
} from "../components/Skeleton";
import "../App.css";

// Fallback-Icon für Gruppen ohne eigene Icon-URL
const DEFAULT_GROUP_ICON =
  "https://api.dicebear.com/7.x/identicon/svg?seed=EataR&backgroundColor=ffd166";

export function Home() {
  const { restaurants, groups, likes, refreshGroups, refreshRestaurants, settings, loading } = useData();
  const navigate = useNavigate();
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loadingReal, setLoadingReal] = useState(false);
  const [realInfo, setRealInfo] = useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadRealRestaurants = async (useGeo: boolean) => {
    setLoadingReal(true);
    setRealInfo("Lade echte Daten von OpenStreetMap …");
    try {
      let params: { lat?: number; lon?: number; radiusKm?: number } = {
        radiusKm: settings.radius || 5,
      };
      if (useGeo && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 60000,
          })
        );
        params = { lat: pos.coords.latitude, lon: pos.coords.longitude, radiusKm: settings.radius || 5 };
      }
      const result = await api.refreshFromArea(params);
      refreshRestaurants();
      setRealInfo(
        `✅ ${result.inserted} echte Restaurants geladen (${result.found} in OSM gefunden)`
      );
    } catch (err) {
      console.error(err);
      setRealInfo(
        useGeo && err instanceof GeolocationPositionError
          ? "Standort abgelehnt – lade mit Default-Umgebung (Gelsenkirchen-Buer)."
          : "❌ Laden fehlgeschlagen – Overpass gerade nicht erreichbar."
      );
      // Bei abgelehntem Standort einmalig mit Default-Umgebung versuchen.
      if (useGeo && err instanceof GeolocationPositionError) {
        try {
          const result = await api.refreshFromArea({ radiusKm: settings.radius || 5 });
          refreshRestaurants();
          setRealInfo(`✅ ${result.inserted} echte Restaurants geladen (Default-Umgebung)`);
        } catch (e) {
          setRealInfo("❌ Laden fehlgeschlagen – Overpass gerade nicht erreichbar.");
        }
      }
    } finally {
      setLoadingReal(false);
    }
  };

  const previewIcon =
    newGroupIcon.trim() ||
    `${DEFAULT_GROUP_ICON}&seed=${encodeURIComponent(newGroupName.trim() || "EataR")}`;

  const onPickFile = () => {
    setUploadError("");
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Bitte eine Bilddatei wählen.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      // Lokal als DataURL lesen (für Vorschau + Upload)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await api.uploadImage(dataUrl);
      setNewGroupIcon(url);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      // Reset, damit dieselbe Datei erneut gewählt werden kann
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addGroup = async () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;
    setAdding(true);
    try {
      await api.createGroup({
        name: trimmedName,
        icon_url: newGroupIcon.trim() || `${DEFAULT_GROUP_ICON}&seed=${encodeURIComponent(trimmedName)}`,
        members: 1,
      });
      refreshGroups();
      setNewGroupName("");
      setNewGroupIcon("");
      setUploadError("");
      setShowAddGroup(false);
    } catch (e) {
      console.error("Failed to add group:", e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <h1 className="app-title">EataR</h1>
        <p className="app-subtitle">
          {settings.profile_name?.trim()
            ? `Hallo, ${settings.profile_name.trim()}! 👋 Swipe your Meal 🍴`
            : "Swipe your Meal 🍴"}
        </p>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="animate-in animate-delay-1">
          <SkeletonStatCards />
        </div>
      ) : (
        <div className="animate-in animate-delay-1 home-stats-grid">
          <div className="home-stat-card">
            <span className="home-stat-icon">🔥</span>
            <span className="home-stat-value">{likes.length}</span>
            <span className="home-stat-label">Matches</span>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-icon">✨</span>
            <span className="home-stat-value">{restaurants.length}</span>
            <span className="home-stat-label">Restaurants</span>
          </div>
          <div className="home-stat-card">
            <span className="home-stat-icon">👥</span>
            <span className="home-stat-value">{groups.length}</span>
            <span className="home-stat-label">Gruppen</span>
          </div>
        </div>
      )}

      {/* Groups */}
      <div className="animate-in animate-delay-1" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-subtitle">Deine Gruppen</div>
          <button
            onClick={() => setShowAddGroup(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--accent)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <PlusCircle size={18} />
            Gruppe
          </button>
        </div>
        {loading ? (
          <SkeletonGroupPills />
        ) : groups.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
            Noch keine Gruppen. Lege eine an über „Gruppe".
          </div>
        ) : (
          <div className="tag-container">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-pill"
                onClick={() => navigate(`/swipe?group=${group.id}`)}
                title={`„${group.name}" swipen (${group.restaurant_ids.length} Restaurants)`}
                style={{ cursor: "pointer" }}
              >
                <img src={group.icon_url} alt={group.name} />
                <span>{group.name}</span>
                <span style={{
                  fontSize: 12,
                  background: "var(--accent-gradient)",
                  color: "white",
                  borderRadius: "100px",
                  padding: "2px 8px",
                  fontWeight: 600,
                }}>
                  {group.restaurant_ids.length}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Matches */}
      {loading ? (
        <div className="animate-in animate-delay-2" style={{ marginBottom: 28 }}>
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <TrendingUp size={20} style={{ color: "var(--accent)" }} />
            Latest Matches
          </h2>
          <SkeletonMatchRow count={3} />
        </div>
      ) : likes.length > 0 && (
        <div className="animate-in animate-delay-2" style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={20} style={{ color: "var(--accent)" }} />
              Latest Matches
            </h2>
          </div>
          <div className="match-scroll">
            {likes.map((like) => (
              <div key={like.id} className="match-card">
                <div className="match-card-image-wrapper">
                  <img src={like.image_url} alt={like.name} />
                  <div className="match-card-type-badge">{like.category}</div>
                </div>
                <div className="match-card-info">
                  <div className="match-card-name">{like.name}</div>
                  <div className="match-card-location">
                    <MapPin size={12} />
                    {like.location}
                  </div>
                  <div className="match-card-meta">
                    {like.rating > 0 && (
                      <span className="match-card-rating">⭐ {like.rating}</span>
                    )}
                    <span className="match-card-time">
                      <Clock size={11} />
                      {new Date(like.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Restaurants */}
      <div className="animate-in animate-delay-3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={20} style={{ color: "#FF9500" }} />
            Entdecke Restaurants
          </h2>
          <button
            onClick={() => loadRealRestaurants(settings.location)}
            disabled={loadingReal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--accent)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loadingReal ? "wait" : "pointer",
              padding: 0,
              opacity: loadingReal ? 0.6 : 1,
            }}
          >
            <RefreshCw size={18} className={loadingReal ? "spin" : ""} />
            {loadingReal ? "Lädt …" : "Echte laden"}
          </button>
        </div>
        {realInfo && (
          <div style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginBottom: 10,
            marginTop: -4,
          }}>
            {realInfo}
          </div>
        )}
        {loading ? (
          <SkeletonMatchRow count={4} />
        ) : (
          <div className="match-scroll">
            {restaurants.map((r) => (
              <div key={r.id} className="match-card">
                <div className="match-card-image-wrapper">
                  <img src={r.image_url} alt={r.name} />
                  <div className="match-card-type-badge">{r.category}</div>
                </div>
                <div className="match-card-info">
                  <div className="match-card-name">{r.name}</div>
                  <div className="match-card-location">
                    <MapPin size={12} />
                    {r.location}
                  </div>
                  <div className="match-card-meta">
                    {r.rating > 0 ? (
                      <span className="match-card-rating">⭐ {r.rating}</span>
                    ) : (
                      <span className="match-card-rating" style={{ color: "var(--text-tertiary)" }}>
                        Quelle: OpenStreetMap
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Group Sheet */}
      {showAddGroup && (
        <div className="menu-overlay" onClick={() => setShowAddGroup(false)}>
          <div
            className="menu-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
          >
            <div className="menu-handle" />
            <div className="menu-title">Gruppe hinzufügen</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <img
                src={previewIcon}
                alt="Vorschau"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                  background: "var(--accent-gradient)",
                }}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  placeholder="Gruppenname eingeben..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGroup()}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 16,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Icon-Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            <button
              onClick={onPickFile}
              disabled={uploading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                background: "rgba(0,0,0,0.04)",
                border: "1px dashed rgba(0,0,0,0.16)",
                borderRadius: "var(--radius-sm)",
                fontSize: 15,
                fontWeight: 500,
                color: uploading ? "var(--text-tertiary)" : "var(--text-primary)",
                cursor: uploading ? "default" : "pointer",
              }}
            >
              <Users size={18} />
              {uploading
                ? "Wird hochgeladen..."
                : newGroupIcon
                  ? "Icon ändern"
                  : "Icon hochladen (optional)"}
            </button>
            {newGroupIcon && !uploading && (
              <button
                onClick={() => setNewGroupIcon("")}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Icon entfernen
              </button>
            )}
            {uploadError && (
              <div style={{ marginTop: 8, color: "#E53935", fontSize: 13 }}>
                {uploadError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="close-btn"
                onClick={() => setShowAddGroup(false)}
                style={{ flex: 1 }}
              >
                Abbrechen
              </button>
              <button
                onClick={addGroup}
                disabled={!newGroupName.trim() || adding}
                style={{
                  flex: 1,
                  padding: 14,
                  background: newGroupName.trim() && !adding ? "var(--accent-gradient)" : "rgba(0,0,0,0.06)",
                  color: newGroupName.trim() && !adding ? "white" : "var(--text-tertiary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: newGroupName.trim() && !adding ? "pointer" : "default",
                  border: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {adding ? "Wird hinzugefügt..." : "Hinzufügen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}