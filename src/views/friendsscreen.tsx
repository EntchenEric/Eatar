import React, { useState } from "react";
import { Star, PlusCircle, Users } from "lucide-react";
import { useData } from "../context/DataContext";
import { api } from "../api/client";
import { SkeletonFriendRows } from "../components/Skeleton";
import "../App.css";

// Fallback-Avatar für Freunde ohne eigenes Bild
const DEFAULT_FRIEND_AVATAR =
  "https://ui-avatars.com/api/?background=007AFF&color=fff&size=128&name=";

export const Friends = () => {
  const { friends, refreshFriends, setFriends, loading } = useData();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendAvatar, setNewFriendAvatar] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const previewAvatar =
    newFriendAvatar.trim() ||
    `${DEFAULT_FRIEND_AVATAR}${encodeURIComponent(newFriendName.trim() || "EataR")}`;

  const toggleFavorite = (id: number, currentFavorite: boolean) => {
    const next = !currentFavorite;
    // Optimistisch: UI reagiert sofort, Server wird im Hintergrund synchronisiert.
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_favorite: next } : f))
    );
    api
      .updateFriend(id, { is_favorite: next })
      .then(refreshFriends)
      .catch((e) => {
        console.error("Failed to update favorite:", e);
        refreshFriends(); // bei Fehler vom Server abweichenden Stand holen
      });
  };

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
      setNewFriendAvatar(url);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addFriend = async () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await api.addFriend(trimmed, newFriendAvatar.trim() || undefined);
      refreshFriends();
      setNewFriendName("");
      setNewFriendAvatar("");
      setUploadError("");
      setShowAddFriend(false);
    } catch (e) {
      console.error("Failed to add friend:", e);
    } finally {
      setAdding(false);
    }
  };

  const favoriteFriends = friends.filter((f) => f.is_favorite);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <h1 className="app-title">Freunde</h1>
        <p className="app-subtitle">Eure Food-Squad 🤝</p>
      </div>

      {/* Favorites */}
      {favoriteFriends.length > 0 && (
        <div className="favorites-section animate-in animate-delay-1">
          <div className="section-subtitle" style={{ marginBottom: 12 }}>
            Favoriten
          </div>
          <div className="favorites-scroll">
            {favoriteFriends.map((friend) => (
              <div key={friend.id} className="friend-avatar-lg">
                <img src={friend.avatar_url} alt={friend.name} />
                <span>{friend.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="animate-in animate-delay-2">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-subtitle">
            Alle Freunde · {loading ? "…" : friends.length}
          </div>
        </div>
        {loading ? (
          <SkeletonFriendRows count={4} />
        ) : (
          <div className="friends-list">
            {friends.map((friend) => (
              <div key={friend.id} className="friend-row">
                <img src={friend.avatar_url} alt={friend.name} />
                <div className="friend-row-info">
                  <div className="friend-row-name">{friend.name}</div>
                </div>
                <div
                  className={`friend-row-action ${friend.is_favorite ? "favorited" : ""}`}
                  onClick={() => toggleFavorite(friend.id, friend.is_favorite)}
                >
                  <Star
                    size={22}
                    fill={friend.is_favorite ? "#FFCC00" : "none"}
                    stroke={friend.is_favorite ? "#FFCC00" : "currentColor"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          className="add-friend-button"
          onClick={() => setShowAddFriend(true)}
        >
          <PlusCircle size={22} />
          Freund hinzufügen
        </button>
      </div>

      {/* Add Friend Sheet */}
      {showAddFriend && (
        <div className="menu-overlay" onClick={() => setShowAddFriend(false)}>
          <div
            className="menu-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slideUp 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)" }}
          >
            <div className="menu-handle" />
            <div className="menu-title">Freund hinzufügen</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <img
                src={previewAvatar}
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
                  placeholder="Name eingeben..."
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFriend()}
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

            {/* Avatar-Upload */}
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
                : newFriendAvatar
                  ? "Avatar ändern"
                  : "Avatar hochladen (optional)"}
            </button>
            {newFriendAvatar && !uploading && (
              <button
                onClick={() => setNewFriendAvatar("")}
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

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                className="close-btn"
                onClick={() => setShowAddFriend(false)}
                style={{ flex: 1 }}
              >
                Abbrechen
              </button>
              <button
                onClick={addFriend}
                disabled={!newFriendName.trim() || adding}
                style={{
                  flex: 1,
                  padding: 14,
                  background: newFriendName.trim() && !adding ? "var(--accent-gradient)" : "rgba(0,0,0,0.06)",
                  color: newFriendName.trim() && !adding ? "white" : "var(--text-tertiary)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: newFriendName.trim() && !adding ? "pointer" : "default",
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
};