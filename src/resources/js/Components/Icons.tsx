import React from 'react'

interface P {
  size?: number
  className?: string
  style?: React.CSSProperties
  strokeWidth?: number
}

const Ic = ({ size = 16, strokeWidth = 1.5, className, style, children }: P & { children: React.ReactNode }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}
  >
    {children}
  </svg>
)

export const Icons = {
  Dashboard:    (p: P) => <Ic {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ic>,
  Task:         (p: P) => <Ic {...p}><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></Ic>,
  Project:      (p: P) => <Ic {...p}><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></Ic>,
  Habit:        (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ic>,
  Journal:      (p: P) => <Ic {...p}><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h12"/><path d="M8 8h7M8 12h5"/></Ic>,
  Finance:      (p: P) => <Ic {...p}><path d="M3 20V8M8 20V4M13 20v-9M18 20v-5"/></Ic>,
  Library:      (p: P) => <Ic {...p}><path d="M4 4v16M9 4v16M14 5l6 14M14 5l-2 1M20 19l-2 1"/></Ic>,
  Note:         (p: P) => <Ic {...p}><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v3h3"/><path d="M9 12h6M9 16h4"/></Ic>,
  Contact:      (p: P) => <Ic {...p}><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.7-3.5 3.5-6 7-6s6.3 2.5 7 6"/></Ic>,
  Review:       (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M7 4l-2 2M17 4l2 2"/></Ic>,
  Search:       (p: P) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></Ic>,
  Bell:         (p: P) => <Ic {...p}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7z"/><path d="M10 19a2 2 0 0 0 4 0"/></Ic>,
  Plus:         (p: P) => <Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>,
  ChevronRight: (p: P) => <Ic {...p}><path d="M9 6l6 6-6 6"/></Ic>,
  ChevronLeft:  (p: P) => <Ic {...p}><path d="M15 6l-6 6 6 6"/></Ic>,
  ChevronDown:  (p: P) => <Ic {...p}><path d="M6 9l6 6 6-6"/></Ic>,
  ArrowUpRight: (p: P) => <Ic {...p}><path d="M7 17L17 7M9 7h8v8"/></Ic>,
  ArrowDownRight:(p: P)=> <Ic {...p}><path d="M7 7l10 10M17 9v8h-8"/></Ic>,
  More:         (p: P) => <Ic {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Ic>,
  Flag:         (p: P) => <Ic {...p}><path d="M5 21V4M5 4h13l-3 4 3 4H5"/></Ic>,
  Calendar:     (p: P) => <Ic {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Ic>,
  Filter:       (p: P) => <Ic {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></Ic>,
  Sun:          (p: P) => <Ic {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></Ic>,
  Moon:         (p: P) => <Ic {...p}><path d="M21 13a8.5 8.5 0 1 1-9.5-11 6.5 6.5 0 0 0 9.5 11z"/></Ic>,
  Trend:        (p: P) => <Ic {...p}><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></Ic>,
  Check:        (p: P) => <Ic {...p}><path d="M5 12l5 5L20 7"/></Ic>,
  X:            (p: P) => <Ic {...p}><path d="M6 6l12 12M18 6L6 18"/></Ic>,
  Edit:         (p: P) => <Ic {...p}><path d="M4 20h4l11-11-4-4L4 16z"/></Ic>,
  Trash:        (p: P) => <Ic {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></Ic>,
  Logout:       (p: P) => <Ic {...p}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="M15 8l4 4-4 4M19 12H10"/></Ic>,
  Star:         (p: P) => <Ic {...p}><path d="M12 3l2.8 5.7 6.3.9-4.5 4.4 1 6.3L12 17.3 6.4 20.3l1-6.3-4.4-4.4 6.3-.9z"/></Ic>,
  Pin:          (p: P) => <Ic {...p}><path d="M9 4v6l-2 4h10l-2-4V4"/><path d="M12 14v7"/><path d="M8 4h8"/></Ic>,
  Tag:          (p: P) => <Ic {...p}><path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="9" r="1.5"/></Ic>,
  Clock:        (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ic>,
  Inbox:        (p: P) => <Ic {...p}><path d="M4 13l3-9h10l3 9"/><path d="M4 13v6h16v-6"/><path d="M4 13h5l1 2h4l1-2h5"/></Ic>,
  Settings:     (p: P) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1c0 .7.4 1.3 1 1.5a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1c-.7 0-1.3.4-1.5 1z"/></Ic>,
  // Goal icons
  Home:         (p: P) => <Ic {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Ic>,
  Plane:        (p: P) => <Ic {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Ic>,
  Car:          (p: P) => <Ic {...p}><path d="M7 17H3V9l3-5h10l3 5v8h-4"/><path d="M7 17h6"/><circle cx="5.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></Ic>,
  GraduationCap:(p: P) => <Ic {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Ic>,
  Heart:        (p: P) => <Ic {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.9 1.1-1.1a5.5 5.5 0 0 0-.1-7.4z"/></Ic>,
  Briefcase:    (p: P) => <Ic {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M10 14h4"/></Ic>,
  Shield:       (p: P) => <Ic {...p}><path d="M12 3L4 7v5c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V7z"/></Ic>,
  Smartphone:   (p: P) => <Ic {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></Ic>,
  Leaf:         (p: P) => <Ic {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></Ic>,
  Coin:         (p: P) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2.5A2 2 0 0 1 9 15M12 7v2M12 15v2"/></Ic>,
  Wrench:       (p: P) => <Ic {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Ic>,
  GamePad:      (p: P) => <Ic {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="17" y1="10" x2="17.01" y2="10"/></Ic>,
}
