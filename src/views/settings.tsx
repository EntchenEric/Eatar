import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Bell, Shield, Palette, Info, Globe } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../api/client";
import { ensureNotificationPermission } from "../utils/notifications";
import "../App.css";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=007AFF&color=fff&size=256&name=";

export const Settings = () => {
  const { settings, refreshSettings, setSettings } = useData();
  const navigate = useNavigate();
  const [, setUpdating] = useState<string | null>(null);
  const radiusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const radius = settings.radius || 10;

  const toggleSetting = (key: keyof typeof settings, currentValue: boolean) => {
    const next = !currentValue;
    // Optimistisch: Toggle springt sofort, Server wird im Hintergrund synchronisiert.
    setSettings((prev) => ({ ...prev, [key]: next }));
    setUpdating(key);

    // Benachrichtigungen brauchen eine echte Berechtigung, sonst hat der Toggle keine
    // sichtbare Wirkung. Nur beim Einschalten anfragen.
    if (key === "notifications" && next) {
      ensureNotificationPermission().then((granted) => {
        if (!granted) {
          // Ohne Erlaubnis bleibt der Toggle zwar an, aber es passiert nichts – daher
          // den Nutzer darauf hinweisen und den echten Stand vom Server holen.
          console.warn("Notification permission not granted.");
        }
      });
    }

    api
      .updateSetting(key, next)
      .then(refreshSettings)
      .catch((e) => {
        console.error(`Failed to update ${key}:`, e);
        refreshSettings(); // bei Fehler echten Stand holen
      })
      .finally(() => setUpdating(null));
  };

  // Radius: optimistisch aktualisieren, debounced persistieren (wie im Swipe-Menü).
  const onRadiusChange = (val: number) => {
    setSettings((prev) => ({ ...prev, radius: val }));
    if (radiusTimer.current) clearTimeout(radiusTimer.current);
    radiusTimer.current = setTimeout(() => {
      api
        .updateSetting("radius", val)
        .then(refreshSettings)
        .catch(console.error);
    }, 350);
  };

  const profileName = settings.profile_name?.trim();
  const profileAvatar = settings.profile_avatar?.trim();

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="page-header animate-in">
        <h1 className="app-title">Einstellungen</h1>
        <p className="app-subtitle">Deine Präferenzen ⚙️</p>
      </div>

      {/* Profil-Karte – direkt funktional: öffnet die Profilbearbeitung. */}
      <div
        className="animate-in animate-delay-1"
        onClick={() => navigate("/settings/profile")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 16,
          marginBottom: 24,
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "background 0.2s ease",
        }}
      >
        <img
          src={profileAvatar || `${DEFAULT_AVATAR}${encodeURIComponent(profileName || "EataR")}`}
          alt="Profil"
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
            background: "var(--accent-gradient)",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
            {profileName || "Profil einrichten"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {profileName ? "Profil bearbeiten" : "Tippe, um deinen Namen hinzuzufügen"}
          </div>
        </div>
        <ChevronRight size={20} color="var(--text-tertiary)" />
      </div>

      {/* Account */}
      <div className="animate-in animate-delay-2">
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Account
        </div>
        <div className="settings-group">
          <div
            className="settings-item"
            onClick={() => navigate("/settings/groups")}
            style={{ cursor: "pointer" }}
          >
            <div className="settings-item-label">WG verwalten</div>
            <div className="settings-item-value">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="animate-in animate-delay-2">
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Präferenzen
        </div>
        <div className="settings-group">
          <div className="settings-item">
            <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={18} />
              Benachrichtigungen
            </div>
            <div
              className={`toggle ${settings.notifications ? "active" : ""}`}
              onClick={() => toggleSetting("notifications", settings.notifications)}
            >
              <div className="toggle-knob" />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={18} />
              Standort
            </div>
            <div
              className={`toggle ${settings.location ? "active" : ""}`}
              onClick={() => toggleSetting("location", settings.location)}
            >
              <div className="toggle-knob" />
            </div>
          </div>
          <div className="settings-item">
            <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Palette size={18} />
              Dark Mode
            </div>
            <div
              className={`toggle ${settings.dark_mode ? "active" : ""}`}
              onClick={() => toggleSetting("dark_mode", settings.dark_mode)}
            >
              <div className="toggle-knob" />
            </div>
          </div>

          {/* Suchradius – zusätzlich auf der Settings-Seite steuerbar. */}
          <div className="settings-item" style={{ alignItems: "flex-start", padding: "16px 20px" }}>
            <div style={{ flex: 1 }}>
              <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <Globe size={18} />
                Suchradius
              </div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 12 }}>
                Radius für das Laden echter Restaurants.
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={radius}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="range-slider"
              />
            </div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 12px",
              background: "var(--accent-gradient)",
              color: "white",
              borderRadius: "100px",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {radius} km
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="animate-in animate-delay-3">
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Mehr
        </div>
        <div className="settings-group">
          <div
            className="settings-item"
            onClick={() => navigate("/settings/privacy")}
            style={{ cursor: "pointer" }}
          >
            <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Shield size={18} />
              Datenschutz
            </div>
            <div className="settings-item-value">
              <ChevronRight size={18} />
            </div>
          </div>
          <div
            className="settings-item"
            onClick={() => navigate("/settings/about")}
            style={{ cursor: "pointer" }}
          >
            <div className="settings-item-label" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Info size={18} />
              Über EataR
            </div>
            <div className="settings-item-value">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};