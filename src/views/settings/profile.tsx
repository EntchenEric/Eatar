import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, User, Camera } from "lucide-react";
import { useData } from "../../context/DataContext";
import { api } from "../../api/client";
import "../../App.css";

// Fallback-Avatar (entspricht dem Muster aus friendsscreen.tsx).
const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?background=007AFF&color=fff&size=256&name=";

export const ProfileSettings = () => {
  const { settings, refreshSettings } = useData();
  const navigate = useNavigate();

  const [name, setName] = useState(settings.profile_name ?? "");
  const [avatar, setAvatar] = useState(settings.profile_avatar ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const previewAvatar =
    avatar.trim() ||
    `${DEFAULT_AVATAR}${encodeURIComponent(name.trim() || "EataR")}`;

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
      setAvatar(url);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async () => {
    setSaving(true);
    setSavedNote("");
    try {
      // Name immer persistieren (auch leer). Avatar: setzen, wenn vorhanden –
      // löschen, wenn der Nutzer ihn entfernt hat und zuvor einer gespeichert war.
      await api.updateSetting("profile_name", name.trim());
      if (avatar) {
        await api.updateSetting("profile_avatar", avatar);
      } else if (settings.profile_avatar) {
        await api.deleteSetting("profile_avatar");
      }
      await refreshSettings();
      setSavedNote("✅ Gespeichert");
    } catch (e) {
      console.error("Failed to save profile:", e);
      setSavedNote("❌ Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedNote(""), 2500);
    }
  };

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
        <h1 className="app-title">Profil</h1>
        <p className="app-subtitle">So erscheinst du in EataR 😎</p>
      </div>

      <div className="animate-in animate-delay-1" style={{ marginTop: 8 }}>
        <div className="settings-group-title" style={{ marginBottom: 12 }}>
          Anzeige
        </div>
        <div className="settings-group">
          <div style={{ padding: 20, display: "flex", gap: 16, alignItems: "center" }}>
            <img
              src={previewAvatar}
              alt="Avatar-Vorschau"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                background: "var(--accent-gradient)",
              }}
            />
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Dein Name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <div style={{ padding: "0 20px 20px" }}>
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
              <Camera size={18} />
              {uploading
                ? "Wird hochgeladen..."
                : avatar
                  ? "Avatar ändern"
                  : "Avatar hochladen (optional)"}
            </button>
            {avatar && !uploading && (
              <button
                onClick={() => setAvatar("")}
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
                Avatar entfernen
              </button>
            )}
            {uploadError && (
              <div style={{ marginTop: 8, color: "#E53935", fontSize: 13 }}>
                {uploadError}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              flex: 1,
              padding: 14,
              background: saving ? "rgba(0,0,0,0.06)" : "var(--accent-gradient)",
              color: saving ? "var(--text-tertiary)" : "white",
              borderRadius: "var(--radius-md)",
              fontSize: 16,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              border: "none",
              transition: "all 0.2s ease",
            }}
          >
            {saving ? "Wird gespeichert..." : "Speichern"}
          </button>
        </div>
        {savedNote && (
          <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-secondary)" }}>
            {savedNote}
          </div>
        )}
        {!settings.profile_name && !name && (
          <div style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-tertiary)",
            fontSize: 13,
          }}>
            <User size={16} />
            Noch kein Profil hinterlegt – dein Name erscheint dann auf der Startseite.
          </div>
        )}
      </div>
    </div>
  );
};