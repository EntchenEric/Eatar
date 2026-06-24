import React, { useState, useCallback, useEffect, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  X,
  Trash2,
  ExternalLink,
  Camera,
  UserPlus,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { api } from "../../api/client";
import type { Friend } from "../../types";
import "../../App.css";

const DEFAULT_GROUP_ICON =
  "https://api.dicebear.com/7.x/identicon/svg?seed=EataR&backgroundColor=ffd166";

export const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const navigate = useNavigate();
  const { groups, friends, setGroups, refreshGroups } = useData();

  const group = groups.find((g) => g.id === groupId);

  const [name, setName] = useState(group?.name ?? "");
  const [icon, setIcon] = useState(group?.icon_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const [members, setMembers] = useState<Friend[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Wenn die Gruppe aus dem Context nachgeladen wird, lokale Felder synchronisieren.
  useEffect(() => {
    if (group) {
      setName(group.name);
      if (!icon || icon === DEFAULT_GROUP_ICON) setIcon(group.icon_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const refreshMembers = useCallback(async () => {
    if (!groupId) return;
    setMembersLoading(true);
    try {
      const list = await api.getGroupMembers(groupId);
      setMembers(list);
    } catch (e) {
      console.error("Failed to load members:", e);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  if (!group) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate("/settings/groups")}
          style={backBtnStyle}
        >
          <ChevronLeft size={20} />
          WG verwalten
        </button>
        <div style={{ color: "var(--text-tertiary)", marginTop: 20 }}>
          Gruppe nicht gefunden.
        </div>
      </div>
    );
  }

  const memberIds = new Set(members.map((m) => m.id));
  const availableFriends = friends.filter((f) => !memberIds.has(f.id));

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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await api.uploadImage(dataUrl);
      setIcon(url);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveGroup = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setSavedNote("");
    // Optimistisch: Gruppe im Context aktualisieren.
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name: trimmed, icon_url: icon || group.icon_url } : g))
    );
    try {
      await api.updateGroup(groupId, { name: trimmed, icon_url: icon || group.icon_url });
      refreshGroups();
      setSavedNote("✅ Gespeichert");
    } catch (e) {
      console.error("Failed to save group:", e);
      setSavedNote("❌ Speichern fehlgeschlagen");
      refreshGroups();
    } finally {
      setSaving(false);
      setTimeout(() => setSavedNote(""), 2500);
    }
  };

  const addMember = async (friend: Friend) => {
    // Optimistisch: Freund sofort in die Mitgliederliste aufnehmen.
    setMembers((prev) => [...prev, friend]);
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, member_ids: [...(g.member_ids ?? []), friend.id], members: (g.member_ids?.length ?? 0) + 1 }
          : g
      )
    );
    try {
      await api.addGroupMember(groupId, friend.id);
      refreshGroups();
    } catch (e) {
      console.error("Failed to add member:", e);
      refreshMembers();
      refreshGroups();
    }
  };

  const removeMember = async (friend: Friend) => {
    setMembers((prev) => prev.filter((m) => m.id !== friend.id));
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const next = (g.member_ids ?? []).filter((fid) => fid !== friend.id);
        return { ...g, member_ids: next, members: next.length };
      })
    );
    try {
      await api.removeGroupMember(groupId, friend.id);
      refreshGroups();
    } catch (e) {
      console.error("Failed to remove member:", e);
      refreshMembers();
      refreshGroups();
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm(`Gruppe „${group.name}" wirklich löschen?`)) return;
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    try {
      await api.deleteGroup(groupId);
      refreshGroups();
      navigate("/settings/groups");
    } catch (e) {
      console.error("Failed to delete group:", e);
      refreshGroups();
    }
  };

  return (
    <div className="page-container">
      <button
        onClick={() => navigate("/settings/groups")}
        style={backBtnStyle}
      >
        <ChevronLeft size={20} />
        WG verwalten
      </button>

      <div className="page-header animate-in">
        <h1 className="app-title">Gruppe bearbeiten</h1>
        <p className="app-subtitle">{group.name} 🍕</p>
      </div>

      {/* Gruppendaten */}
      <div className="animate-in animate-delay-1" style={{ marginTop: 8 }}>
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Gruppe
        </div>
        <div className="settings-group">
          <div style={{ padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
            <img
              src={icon || group.icon_url || DEFAULT_GROUP_ICON}
              alt={group.name}
              style={{
                width: 72,
                height: 72,
                borderRadius: "16px",
                objectFit: "cover",
                flexShrink: 0,
                background: "var(--accent-gradient)",
              }}
            />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGroup()}
                placeholder="Gruppenname..."
                style={inputStyle}
              />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <div style={{ padding: "0 20px 20px" }}>
            <button onClick={onPickFile} disabled={uploading} style={uploadBtnStyle(uploading)}>
              <Camera size={18} />
              {uploading ? "Wird hochgeladen..." : icon ? "Icon ändern" : "Icon hochladen (optional)"}
            </button>
            {icon && icon !== group.icon_url && !uploading && (
              <button
                onClick={() => setIcon(group.icon_url)}
                style={{ marginTop: 8, background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", padding: 0 }}
              >
                Icon zurücksetzen
              </button>
            )}
            {uploadError && <div style={{ marginTop: 8, color: "#E53935", fontSize: 13 }}>{uploadError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={saveGroup} disabled={saving || !name.trim()} style={primaryBtnStyle(saving || !name.trim())}>
                {saving ? "Wird gespeichert..." : "Speichern"}
              </button>
              <button onClick={() => navigate(`/swipe?group=${groupId}`)} style={secondaryBtnStyle}>
                <ExternalLink size={18} /> Öffnen
              </button>
            </div>
            {savedNote && (
              <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-secondary)" }}>{savedNote}</div>
            )}
          </div>
        </div>
      </div>

      {/* Mitglieder */}
      <div className="animate-in animate-delay-2" style={{ marginTop: 24 }}>
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Mitglieder · {membersLoading ? "…" : members.length}
          <span style={{ marginLeft: 8, textTransform: "none", fontWeight: 400, fontSize: 12, color: "var(--text-tertiary)" }}>
            alle gleichberechtigt
          </span>
        </div>
        <div className="settings-group">
          {membersLoading ? (
            <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 14 }}>Lädt …</div>
          ) : members.length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 14 }}>
              Noch keine Mitglieder. Füge Freunde aus der Liste unten hinzu.
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="settings-item" style={{ padding: "12px 16px" }}>
                <img
                  src={m.avatar_url}
                  alt={m.name}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "var(--accent-gradient)" }}
                />
                <div style={{ flex: 1, marginLeft: 12, fontSize: 16, color: "var(--text-primary)" }}>{m.name}</div>
                <button onClick={() => removeMember(m)} title="Entfernen" style={iconBtn}>
                  <X size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Freunde, die noch nicht in der Gruppe sind */}
        <div className="settings-group-title" style={{ marginTop: 16, marginBottom: 12 }}>
          Freund hinzufügen
        </div>
        <div className="settings-group">
          {friends.length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 14 }}>
              Du hast noch keine Freunde. Lege sie im Freunde-Tab an.
            </div>
          ) : availableFriends.length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-tertiary)", fontSize: 14 }}>
              Alle Freunde sind bereits in dieser Gruppe.
            </div>
          ) : (
            availableFriends.map((f) => (
              <div key={f.id} className="settings-item" style={{ padding: "12px 16px" }}>
                <img
                  src={f.avatar_url}
                  alt={f.name}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "var(--accent-gradient)" }}
                />
                <div style={{ flex: 1, marginLeft: 12, fontSize: 16, color: "var(--text-primary)" }}>{f.name}</div>
                <button onClick={() => addMember(f)} title="Zur Gruppe hinzufügen" style={iconBtnAccent}>
                  <UserPlus size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Gefahrenzone */}
      <div className="animate-in animate-delay-3" style={{ marginTop: 24 }}>
        <button onClick={deleteGroup} style={dangerBtnStyle}>
          <Trash2 size={18} /> Gruppe löschen
        </button>
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

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "var(--radius-sm)",
  fontSize: 16,
  color: "var(--text-primary)",
  outline: "none",
};

const uploadBtnStyle = (disabled: boolean): CSSProperties => ({
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
  color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
  cursor: disabled ? "default" : "pointer",
});

const primaryBtnStyle = (disabled: boolean): CSSProperties => ({
  flex: 1,
  padding: 14,
  background: disabled ? "rgba(0,0,0,0.06)" : "var(--accent-gradient)",
  color: disabled ? "var(--text-tertiary)" : "white",
  borderRadius: "var(--radius-md)",
  fontSize: 16,
  fontWeight: 600,
  cursor: disabled ? "default" : "pointer",
  border: "none",
  transition: "all 0.2s ease",
});

const secondaryBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "14px 18px",
  background: "rgba(0,0,0,0.04)",
  color: "var(--text-primary)",
  borderRadius: "var(--radius-md)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(0,0,0,0.08)",
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
};

const iconBtnAccent: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "none",
  background: "var(--accent-gradient)",
  color: "white",
  cursor: "pointer",
};

const dangerBtnStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  padding: 14,
  background: "rgba(229, 57, 53, 0.08)",
  color: "#E53935",
  borderRadius: "var(--radius-md)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(229, 57, 53, 0.2)",
};