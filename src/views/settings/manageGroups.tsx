import { type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, ExternalLink } from "lucide-react";
import { useData } from "../../context/DataContext";
import "../../App.css";

export const ManageGroups = () => {
  const { groups, loading } = useData();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <button
        onClick={() => navigate("/settings")}
        style={backBtnStyle}
      >
        <ChevronLeft size={20} />
        Einstellungen
      </button>

      <div className="page-header animate-in">
        <h1 className="app-title">WG verwalten</h1>
        <p className="app-subtitle">Deine Gruppen 🍕</p>
      </div>

      <div className="animate-in animate-delay-1" style={{ marginTop: 8 }}>
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Gruppen · {loading ? "…" : groups.length}
        </div>
        {loading ? (
          <div style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Lädt …</div>
        ) : groups.length === 0 ? (
          <div className="settings-group">
            <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 14 }}>
              Noch keine Gruppen. Lege eine auf der Startseite an.
            </div>
          </div>
        ) : (
          <div className="settings-group">
            {groups.map((group) => (
              <div
                key={group.id}
                className="settings-item"
                style={{ padding: "12px 16px" }}
              >
                <img
                  src={group.icon_url}
                  alt={group.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    background: "var(--accent-gradient)",
                  }}
                />
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={{ fontSize: 16, color: "var(--text-primary)" }}>
                    {group.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {group.restaurant_ids.length} Restaurants · {group.members} Mitglieder
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button
                    onClick={() => navigate(`/swipe?group=${group.id}`)}
                    title="Öffnen"
                    style={iconBtn}
                  >
                    <ExternalLink size={18} />
                  </button>
                  <button
                    onClick={() => navigate(`/settings/groups/${group.id}`)}
                    title="Bearbeiten"
                    style={iconBtn}
                  >
                    <Pencil size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// —— geteilte Stil-Konstanten ——
const backBtnStyle: CSSProperties = {
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
};

const iconBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "none",
  background: "rgba(0,0,0,0.04)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  transition: "background 0.2s ease",
};