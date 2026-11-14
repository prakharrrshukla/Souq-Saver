// Illustrations for the phone screens, drawn as inline SVG (the project has no image assets).
// Each tile illustration sits in a 56 x 56 box.
import type { ReactNode } from 'react';

const Art = ({ children, size = 56 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" focusable="false">{children}</svg>
);

export const TILE_ART: Record<string, ReactNode> = {
  Rides: (
    <Art>
      <rect x="8" y="22" width="40" height="16" rx="6" fill="#1fbf75" />
      <path d="M16 22l5-9h14l5 9z" fill="#17a765" />
      <path d="M20 21l3.5-6h9l3.5 6z" fill="#cdeee0" />
      <circle cx="17" cy="39" r="5" fill="#1f2a33" /><circle cx="39" cy="39" r="5" fill="#1f2a33" />
      <circle cx="17" cy="39" r="2" fill="#c9d1d8" /><circle cx="39" cy="39" r="2" fill="#c9d1d8" />
      <rect x="10" y="27" width="5" height="3" rx="1.5" fill="#ffe37a" /><rect x="41" y="27" width="5" height="3" rx="1.5" fill="#ffe37a" />
    </Art>
  ),
  Food: (
    <Art>
      <path d="M12 26a16 11 0 0 1 32 0z" fill="#f2a93b" />
      <circle cx="22" cy="20" r="1.2" fill="#fff4d6" /><circle cx="28" cy="17" r="1.2" fill="#fff4d6" /><circle cx="34" cy="21" r="1.2" fill="#fff4d6" />
      <rect x="10" y="26" width="36" height="4" rx="2" fill="#5bbf4a" />
      <rect x="11" y="30" width="34" height="5" rx="2" fill="#8a4b2a" />
      <rect x="10" y="35" width="36" height="3" rx="1.5" fill="#ffcf3f" />
      <path d="M12 38h32a4 4 0 0 1-4 5H16a4 4 0 0 1-4-5z" fill="#f2a93b" />
    </Art>
  ),
  Quik: (
    <Art>
      <path d="M14 20h28l-2 24H16z" fill="#1fbf75" />
      <path d="M21 20v-3a7 7 0 0 1 14 0v3" stroke="#17a765" strokeWidth="3" fill="none" />
      <path d="M30 25l-7 9h5l-2 7 8-10h-5z" fill="#ffe37a" />
    </Art>
  ),
  Pay: (
    <Art>
      <rect x="9" y="16" width="34" height="22" rx="4" fill="#3a8dde" />
      <rect x="14" y="21" width="34" height="22" rx="4" fill="#1fbf75" />
      <rect x="14" y="26" width="34" height="4" fill="#17a765" />
      <rect x="19" y="35" width="10" height="3" rx="1.5" fill="#cdeee0" />
    </Art>
  ),
  'Hala Taxi': (
    <Art>
      <rect x="23" y="12" width="10" height="5" rx="1.5" fill="#1f2a33" />
      <rect x="8" y="24" width="40" height="14" rx="5" fill="#f5c518" />
      <path d="M15 24l5-7h16l5 7z" fill="#e8b600" />
      <path d="M19 23l3-4.5h12l3 4.5z" fill="#fff1b3" />
      <rect x="8" y="30" width="40" height="3" fill="#1f2a33" opacity=".75" />
      <circle cx="17" cy="39" r="5" fill="#1f2a33" /><circle cx="39" cy="39" r="5" fill="#1f2a33" />
    </Art>
  ),
  Shops: (
    <Art>
      <rect x="11" y="24" width="34" height="20" rx="2" fill="#ffffff" stroke="#c7d0d8" />
      <path d="M9 18h38l-2 8H11z" fill="#ef5b5b" />
      <path d="M15 18l-1 8M22 18v8M29 18v8M36 18l1 8" stroke="#ffffff" strokeWidth="2" />
      <rect x="16" y="31" width="9" height="13" rx="1" fill="#3a8dde" />
      <rect x="29" y="30" width="11" height="7" rx="1" fill="#cfe6fb" />
    </Art>
  ),
  Box: (
    <Art>
      <path d="M28 10l17 8v20l-17 8-17-8V18z" fill="#c98b4a" />
      <path d="M28 26l17-8v20l-17 8z" fill="#b07436" />
      <path d="M11 18l17 8 17-8" stroke="#8f5a26" strokeWidth="1.5" fill="none" />
      <path d="M19.5 14l17 8v6" stroke="#f3dcb6" strokeWidth="3" fill="none" />
    </Art>
  ),
  'Home & Spa': (
    <Art>
      <path d="M10 27l18-14 18 14" stroke="#1fbf75" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M15 25v18h26V25L28 15z" fill="#e7f8f0" />
      <path d="M28 41c-6-4-7-10-2-15 5 5 4 11 2 15z" fill="#1fbf75" />
      <path d="M28 41c4-3 9-3 11-8-6 0-10 3-11 8z" fill="#17a765" />
    </Art>
  ),
};

export const Basket = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
    <circle cx="25" cy="22" r="8" fill="#f2a93b" />
    <path d="M36 26c0-8 6-13 12-13-1 7-5 12-12 13z" fill="#1fbf75" />
    <rect x="38" y="12" width="9" height="18" rx="2" fill="#e7f1fb" stroke="#3a8dde" strokeWidth="2" />
    <path d="M45 18c4 0 7 3 7 8l-6 2z" fill="#ef5b5b" />
    <path d="M10 30h52l-6 30a4 4 0 0 1-4 3H20a4 4 0 0 1-4-3z" fill="#17a765" />
    <path d="M10 30h52" stroke="#0f7a4a" strokeWidth="4" strokeLinecap="round" />
    <path d="M24 38v18M36 38v18M48 38v18" stroke="#9fe0c2" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** A simple green mark for the splash and the top of Home. Not Careem's real logo artwork. */
export const Mark = ({ size = 56, color = '#ffffff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" focusable="false">
    <circle cx="28" cy="28" r="26" fill="none" stroke={color} strokeWidth="5" />
    <path d="M37 19a13 13 0 1 0 0 18" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const Icon = ({ d, size = 24 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const IconHome = () => <Icon d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
export const IconOffers = () => <Icon d="M20 12l-8 8-9-9V3h8zM7.5 7.5h.01" />;
export const IconWallet = () => <Icon d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 13.5h2" />;
export const IconAccount = () => <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />;
export const IconSearch = () => <Icon d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" size={20} />;
export const IconBack = () => <Icon d="M15 5l-7 7 7 7" />;
export const IconPin = () => <Icon d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" size={18} />;
export const IconPlus = () => <Icon d="M12 5v14M5 12h14" size={20} />;
export const IconCar = () => <Icon d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7.5 13.5h.01M16.5 13.5h.01" size={20} />;

/** iPhone status bar: time, signal, wifi, battery. */
export const StatusBar = () => (
  <div className="status-bar" aria-hidden="true">
    <span className="status-time">9:41</span>
    <span className="status-icons">
      <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 4.2a10.5 10.5 0 0 1 14 0M3.6 7a6.6 6.6 0 0 1 8.8 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="8" cy="10.2" r="1.5" /></svg>
      <svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="17" height="8" rx="2" /><rect x="23.5" y="4" width="1.8" height="4" rx=".9" opacity=".4" /></svg>
    </span>
  </div>
);
