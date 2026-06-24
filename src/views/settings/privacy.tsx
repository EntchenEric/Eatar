import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, Database, MapPin, Image, Lock } from "lucide-react";
import "../../App.css";

export const Privacy = () => {
  const navigate = useNavigate();

  const rows = [
    {
      icon: <Database size={18} />,
      title: "Lokale Datenbank",
      text: "Alle deine Daten liegen lokal in einer SQLite-Datei auf deinem Gerät. Es fließen keine Daten an externe Server von EataR ab.",
    },
    {
      icon: <MapPin size={18} />,
      title: "Restaurantdaten",
      text: "Restaurant-Einträge stammen von OpenStreetMap. Dein Standort wird nur dann abgefragt, wenn du den Standort-Toggle aktivierst und „Echte laden“ auslöst.",
    },
    {
      icon: <Image size={18} />,
      title: "Hochgeladene Bilder",
      text: "Von dir hochgeladene Avatare und Gruppen-Icons werden lokal im Server-Ordner gespeichert – nicht bei einem Cloud-Anbieter.",
    },
    {
      icon: <Lock size={18} />,
      title: "Kein Tracking",
      text: "EataR setzt keine Cookies und verfolgt dich nicht. Es gibt keine Analyse- oder Werbe-Integration.",
    },
  ];

  return (
    <div className="page-container">
      <button
        onClick={() => navigate("/settings")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--accent)",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          marginBottom: 12,
        }}
      >
        <ChevronLeft size={20} />
        Einstellungen
      </button>

      <div className="page-header animate-in">
        <h1 className="app-title">Datenschutz</h1>
        <p className="app-subtitle">Was mit deinen Daten passiert 🔒</p>
      </div>

      <div className="animate-in animate-delay-1" style={{ marginTop: 8 }}>
        <div className="settings-group">
          {rows.map((row) => (
            <div key={row.title} className="settings-item" style={{ alignItems: "flex-start", padding: 16 }}>
              <div style={{ flex: 1 }}>
                <div
                  className="settings-item-label"
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}
                >
                  <span style={{ color: "var(--accent)" }}>{row.icon}</span>
                  {row.title}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {row.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-tertiary)",
          fontSize: 13,
        }}>
          <Shield size={16} />
          Diese Demo-App ist nur lokal verfügbar und nicht öffentlich gehostet.
        </div>
      </div>
    </div>
  );
};