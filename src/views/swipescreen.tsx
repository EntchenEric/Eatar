import { Menu, Search, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { api } from "../api/client";
import { notifyMatch } from "../utils/notifications";
import { SkeletonSwipeCard, SkeletonBox } from "../components/Skeleton";
import "../App.css";

// Direction: -1 = left, 1 = right
const variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 200 : -200,
    rotate: direction > 0 ? 10 : -10,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotate: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 200 : -200,
    rotate: direction > 0 ? 10 : -10,
  }),
};

export const Swipe = () => {
  const { restaurants, groups, settings, refreshSettings, setSettings, loading } = useData();
  const [searchParams] = useSearchParams();
  const [[currentIndex, direction], setPage] = useState([0, 0]);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [swipedIds, setSwipedIds] = useState<Set<number>>(new Set());
  // Vorausgewählte Gruppe via ?group=<id> (z.B. vom Home-Screen aus)
  const initialGroup = searchParams.get("group");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    initialGroup ? Number(initialGroup) : null
  );

  // Debounce-Referenz für den Radius-Slider
  const radiusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const radius = settings.radius || 10;

  const categories = Array.from(new Set(restaurants.map((r) => r.category)));

  const suggestions = categories.filter((category) =>
    category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by group, then by category, then by swipe status
  const groupFilteredRestaurants = selectedGroupId !== null
    ? restaurants.filter((r) => {
        const group = groups.find((g) => g.id === selectedGroupId);
        return group ? group.restaurant_ids.includes(r.id) : true;
      })
    : restaurants;

  const filteredRestaurants = groupFilteredRestaurants.filter((r) =>
    selectedTypes.length === 0 ? true : selectedTypes.includes(r.category)
  );

  const unswipedRestaurants = filteredRestaurants.filter(
    (r) => !swipedIds.has(r.id)
  );

  const isFinished = currentIndex >= unswipedRestaurants.length;
  const currentItem = unswipedRestaurants[Math.min(currentIndex, Math.max(0, unswipedRestaurants.length - 1))];

  // Reset index when filters change
  useEffect(() => {
    setPage([0, direction]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, selectedGroupId]);

  // Gruppe aus URL übernehmen, wenn sie sich ändert (z.B. vom Home-Screen)
  useEffect(() => {
    const g = searchParams.get("group");
    setSelectedGroupId(g ? Number(g) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const toggleCategory = (category: string) => {
    if (selectedTypes.includes(category)) {
      setSelectedTypes(selectedTypes.filter((type) => type !== category));
    } else {
      setSelectedTypes([...selectedTypes, category]);
    }
    setSearchQuery("");
  };

  const handleSwipe = useCallback(async (swipeDir: "left" | "right") => {
    if (!currentItem) return;
    const dir = swipeDir === "right" ? 1 : -1;
    const direction = swipeDir === "right" ? "like" : "reject" as const;
    try {
      await api.createSwipe(currentItem.id, direction);
      setSwipedIds((prev) => new Set(prev).add(currentItem.id));
      // Bei einem Match (Like) und aktivierten Benachrichtigungen: echte
      // System-Notification anzeigen, sofern der Browser die Erlaubnis erteilt hat.
      if (direction === "like" && settings.notifications) {
        notifyMatch(currentItem.name);
      }
    } catch (e) {
      console.error("Failed to record swipe:", e);
    }
    setPage([currentIndex + 1, dir]);
  }, [currentItem, currentIndex, settings.notifications]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="swipe-header animate-in">
          <div className="swipe-group-strip">
            {[0, 1, 2].map((i) => (
              <SkeletonBox key={i} width={120} height={42} radius="100px" />
            ))}
          </div>
        </div>
        <div className="swipe-container">
          <SkeletonSwipeCard />
          <div className="swipe-actions">
            <SkeletonBox width={56} height={56} radius="50%" />
            <SkeletonBox width={56} height={56} radius="50%" />
          </div>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-title">Keine Restaurants</div>
          <div className="empty-state-text">Lade Restaurants in die Datenbank.</div>
        </div>
      </div>
    );
  }

  if (unswipedRestaurants.length === 0 && !isFinished) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">😋</div>
          <div className="empty-state-title">Alle geswipet!</div>
          <div className="empty-state-text">
            Du hast alle Restaurants durch. Setze die Swipes zurück.
          </div>
          <button
            onClick={async () => {
              await api.resetSwipes();
              setSwipedIds(new Set());
              setPage([0, 0]);
            }}
            style={{
              marginTop: 20,
              padding: "12px 28px",
              background: "var(--accent-gradient)",
              color: "white",
              borderRadius: "100px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              border: "none",
            }}
          >
            Nochmal swipen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="swipe-header animate-in">
        <div className="swipe-group-strip">
          {/* Alle pill */}
          <div
            className={`group-pill ${selectedGroupId === null ? "group-pill-active" : ""}`}
            onClick={() => setSelectedGroupId(null)}
            style={{ cursor: "pointer", flexShrink: 0 }}
          >
            <span>🍽️</span>
            <span>Alle</span>
          </div>
          {groups.map((group) => (
            <div
              key={group.id}
              className={`group-pill ${selectedGroupId === group.id ? "group-pill-active" : ""}`}
              onClick={() => setSelectedGroupId(group.id)}
              style={{ cursor: "pointer", flexShrink: 0 }}
              title={`${group.restaurant_ids.length} Restaurants`}
            >
              <img src={group.icon_url} alt={group.name} />
              <span>{group.name}</span>
              <span style={{
                fontSize: 11,
                background: selectedGroupId === group.id ? "rgba(255,255,255,0.3)" : "var(--accent-gradient)",
                color: "white",
                borderRadius: "100px",
                padding: "1px 7px",
                fontWeight: 600,
              }}>
                {group.restaurant_ids.length}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowMenu(true)}
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "12px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
        >
          <Menu size={20} color="var(--accent)" />
        </button>
      </div>

      {/* Swipe Area */}
      <div className="swipe-container">
        <AnimatePresence mode="wait" custom={direction}>
          {isFinished ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="empty-state"
            >
              <div className="empty-state-icon">😋</div>
              <div className="empty-state-title">Keine Restaurants mehr!</div>
              <div className="empty-state-text">
                Fange von vorne an, um Restaurants wieder zu entdecken.
              </div>
              <button
                onClick={async () => {
                  await api.resetSwipes();
                  setSwipedIds(new Set());
                  setPage([0, 0]);
                }}
                style={{
                  marginTop: 20,
                  padding: "12px 28px",
                  background: "var(--accent-gradient)",
                  color: "white",
                  borderRadius: "100px",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Nochmal swipen
              </button>
            </motion.div>
          ) : currentItem ? (
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: "easeOut" }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 100) {
                  handleSwipe(info.offset.x < 0 ? "left" : "right");
                }
              }}
              className="swipe-card"
            >
              <img
                className="swipe-card-image"
                src={currentItem.image_url}
                alt={currentItem.name}
              />
              <div className="swipe-card-info">
                <div className="swipe-card-name">🏠 {currentItem.name}</div>
                <div className="swipe-card-location">📍 {currentItem.location}</div>
                <div className="swipe-card-type">{currentItem.category}</div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Action Buttons */}
        {!isFinished && currentItem && (
          <div className="swipe-actions">
            <button
              className="swipe-btn swipe-btn-reject"
              onClick={() => handleSwipe("left")}
            >
              <X size={28} />
            </button>
            <button
              className="swipe-btn swipe-btn-accept"
              onClick={() => handleSwipe("right")}
            >
              <Check size={28} />
            </button>
          </div>
        )}
      </div>

      {/* Menu Sheet */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="menu-overlay"
            onClick={() => setShowMenu(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="menu-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="menu-handle" />
              <div className="menu-title">Einstellungen</div>

              {/* Radius */}
              <div className="menu-section">
                <div className="menu-section-header">
                  <span className="menu-section-label">Suchradius</span>
                  <span className="menu-section-badge">{radius} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    // Optimistisch: Badge sofort aktualisieren
                    setSettings((prev) => ({ ...prev, radius: val }));
                    // Debounced: nur eine Anfrage am Ende der Slider-Bewegung
                    if (radiusTimer.current) clearTimeout(radiusTimer.current);
                    radiusTimer.current = setTimeout(() => {
                      api
                        .updateSetting("radius", val)
                        .then(refreshSettings)
                        .catch(console.error);
                    }, 350);
                  }}
                  className="range-slider"
                />
              </div>

              {/* Categories */}
              <div className="menu-section">
                <div className="menu-section-header">
                  <span className="menu-section-label">Kategorien</span>
                </div>
                {selectedTypes.length > 0 && (
                  <div className="tag-container" style={{ marginBottom: 12 }}>
                    {selectedTypes.map((type) => (
                      <div
                        key={type}
                        className="tag tag-active"
                        onClick={() => toggleCategory(type)}
                      >
                        {type} ×
                      </div>
                    ))}
                  </div>
                )}
                <div className="search-container">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Kategorie suchen..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="search-input"
                  />
                  {showSuggestions && (
                    <div className="search-suggestions">
                      {suggestions.map((category) => (
                        <div
                          key={category}
                          className="search-suggestion-item"
                          onClick={() => {
                            toggleCategory(category);
                            setShowSuggestions(false);
                          }}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="tag-container">
                  {categories.map((category) => (
                    <div
                      key={category}
                      className={`tag ${selectedTypes.includes(category) ? "tag-active" : ""}`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              </div>

              <button className="close-btn" onClick={() => setShowMenu(false)}>
                Schließen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};