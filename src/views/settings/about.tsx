import { useNavigate } from "react-router-dom";
import { ChevronLeft, Info, UtensilsCrossed } from "lucide-react";
import "../../App.css";

const APP_VERSION = "0.1.0";

export const About = () => {
  const navigate = useNavigate();

  const rows = [
    { title: "Version", text: APP_VERSION },
    { title: "Datenquelle", text: "OpenStreetMap (Overpass API)" },
    { title: "Tech-Stack", text: "React + TypeScript · Express + sql.js" },
    { title: "Zustand", text: "Lokale Demo-App – nicht öffentlich gehostet" },
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
        <h1 className="app-title">Über EataR</h1>
        <p className="app-subtitle">Swipe your Meal 🍴</p>
      </div>

      <div className="animate-in animate-delay-1" style={{ marginTop: 8 }}>
        <div className="settings-group" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "16px",
              background: "var(--accent-gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
            }}>
              <UtensilsCrossed size={28} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                EataR
              </div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                Entdecke Restaurants mit deiner WG
              </div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: "12px 0 0" }}>
            EataR ist ein Tinder-ähnlicher Restaurant-Finder: Swipe durch Vorschläge,
            sammle Matches und stimme dich gemeinsam mit deinen Gruppen ab – statt ewig
            über den Ort zu diskutieren.
          </p>
        </div>

        <div className="settings-group" style={{ marginTop: 16 }}>
          {rows.map((row) => (
            <div key={row.title} className="settings-item">
              <div className="settings-item-label" style={{ color: "var(--text-secondary)" }}>
                {row.title}
              </div>
              <div className="settings-item-value">{row.text}</div>
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
          <Info size={16} />
          Restaurantdaten © OpenStreetMap-Mitwirkende (ODbL).
        </div>
      </div>
    </div>
  );
};