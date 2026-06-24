import React from "react";
import "../App.css";

/**
 * Wiederverwendbare Skeleton-Bausteine für Ladezustände.
 * Nutzt die .skeleton-* Klassen aus App.css.
 */

export function SkeletonBox({
  width,
  height,
  radius = 12,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonStatCards() {
  return (
    <div className="home-stats-grid">
      {[0, 1, 2].map((i) => (
        <div className="home-stat-card" key={i}>
          <SkeletonBox width={24} height={24} radius="50%" />
          <SkeletonBox width={48} height={22} style={{ marginTop: 4 }} />
          <SkeletonBox width={60} height={11} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGroupPills({ count = 3 }: { count?: number }) {
  return (
    <div className="tag-container">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={120 + (i % 2) * 40}
          height={42}
          radius="100px"
        />
      ))}
    </div>
  );
}

export function SkeletonMatchRow({ count = 4 }: { count?: number }) {
  return (
    <div className="match-scroll">
      {Array.from({ length: count }).map((_, i) => (
        <div className="match-card" key={i}>
          <SkeletonBox width="100%" height={140} radius={0} />
          <div className="match-card-info">
            <SkeletonBox width="70%" height={15} />
            <SkeletonBox width="50%" height={12} style={{ marginTop: 8 }} />
            <SkeletonBox width="40%" height={12} style={{ marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonFriendRows({ count = 4 }: { count?: number }) {
  return (
    <div className="friends-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="friend-row" key={i} style={{ cursor: "default" }}>
          <SkeletonBox width={48} height={48} radius="50%" />
          <div className="friend-row-info">
            <SkeletonBox width="40%" height={16} />
          </div>
          <SkeletonBox width={22} height={22} radius="50%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonSwipeCard() {
  return (
    <div className="swipe-card">
      <SkeletonBox width="100%" height={300} radius={0} />
      <div className="swipe-card-info">
        <SkeletonBox width="60%" height={22} />
        <SkeletonBox width="40%" height={15} style={{ marginTop: 10 }} />
        <SkeletonBox width={90} height={26} radius="100px" style={{ marginTop: 14 }} />
      </div>
    </div>
  );
}