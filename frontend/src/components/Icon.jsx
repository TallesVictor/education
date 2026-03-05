const iconPaths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="14" y="10" width="7" height="11" rx="1.5" />
      <rect x="3" y="13" width="7" height="8" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M7.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M2.5 20c.7-3 2.7-4.5 5-4.5S11.8 17 12.5 20" />
      <path d="M16.5 10a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z" />
      <path d="M14.2 19.6c.4-2 1.6-3.2 3.3-3.2 1.6 0 2.8 1.2 3.2 3.2" />
    </>
  ),
  school: (
    <>
      <path d="M2.5 10 12 4l9.5 6" />
      <path d="M4.5 10.8V20h15V10.8" />
      <path d="M9 20v-5h6v5" />
      <path d="M11 7.8h2" />
    </>
  ),
  subject: (
    <>
      <path d="M4.5 5.5h9.2a2.3 2.3 0 0 1 0 4.6H4.5Z" />
      <path d="M4.5 10.1h9.2a2.3 2.3 0 0 1 0 4.6H4.5Z" />
      <path d="M4.5 14.7h9.2a2.3 2.3 0 0 1 0 4.6H4.5Z" />
      <path d="M15.5 5.5h4" />
      <path d="M15.5 10.1h4" />
      <path d="M15.5 14.7h4" />
    </>
  ),
  material: (
    <>
      <path d="M6 3.5h8.8L20 8.7V20a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14.8 3.5V9H20" />
      <path d="M8.5 12h7" />
      <path d="M8.5 15.5h7" />
      <path d="M8.5 19h5" />
    </>
  ),
  class: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h3" />
    </>
  ),
  enrollment: (
    <>
      <path d="M8 12.2a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6Z" />
      <path d="M3.2 20c.6-2.8 2.3-4.2 4.8-4.2s4.2 1.4 4.8 4.2" />
      <path d="M14 8.4h6.5" />
      <path d="M14 12h6.5" />
      <path d="M14 15.6h4.5" />
    </>
  ),
  role: (
    <>
      <path d="M12 3.8 19.2 7v5.6c0 3.8-2.5 6.8-7.2 8.6-4.7-1.8-7.2-4.8-7.2-8.6V7Z" />
      <path d="m9.2 12 1.8 1.8 3.8-3.8" />
    </>
  ),
  permission: (
    <>
      <path d="M12 3.8 19.2 7v5.6c0 3.8-2.5 6.8-7.2 8.6-4.7-1.8-7.2-4.8-7.2-8.6V7Z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
      <path d="M14 8l5 4-5 4" />
      <path d="M19 12H9" />
    </>
  ),
  session: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.8 19.2 7v5.6c0 3.8-2.5 6.8-7.2 8.6-4.7-1.8-7.2-4.8-7.2-8.6V7Z" />
      <path d="M9.2 12.2 11 14l3.8-3.8" />
    </>
  ),
  teacher: (
    <>
      <path d="M12 4.6 21 9l-9 4.4L3 9Z" />
      <path d="M6 10.5V15c0 2.3 2.7 4.1 6 4.1s6-1.8 6-4.1v-4.5" />
      <path d="M21 9v6" />
    </>
  ),
  student: (
    <>
      <path d="M12 5.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
      <path d="M5.2 20c.8-3 3.1-4.5 6.8-4.5s6 1.5 6.8 4.5" />
    </>
  ),
  spark: (
    <>
      <path d="m12 2.8 2.2 5 5 2.2-5 2.2-2.2 5-2.2-5-5-2.2 5-2.2Z" />
      <path d="m18.5 15.5.8 2 .8.8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
    </>
  ),
  add: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10.4-10.4a2.2 2.2 0 0 0-3.1-3.1L4.8 16.9 4 20Z" />
      <path d="m13.5 8.5 3 3" />
    </>
  ),
  delete: (
    <>
      <path d="M4.5 7.2h15" />
      <path d="M9.3 7.2V5.4a1.4 1.4 0 0 1 1.4-1.4h2.6a1.4 1.4 0 0 1 1.4 1.4v1.8" />
      <path d="m7 7.2 1 12a1.6 1.6 0 0 0 1.6 1.5h4.8A1.6 1.6 0 0 0 16 19.2l1-12" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M8.5 4v5h6V4" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  close: (
    <>
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </>
  ),
  preview: (
    <>
      <path d="M2.8 12s3.2-5.8 9.2-5.8 9.2 5.8 9.2 5.8-3.2 5.8-9.2 5.8S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  chevronLeft: (
    <>
      <path d="m14.5 5-6.5 7 6.5 7" />
    </>
  ),
  chevronRight: (
    <>
      <path d="m9.5 5 6.5 7-6.5 7" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M5 4h14" />
    </>
  ),
  unlink: (
    <>
      <path d="m9.5 14.5-1.8 1.8a3 3 0 0 1-4.2-4.2l2.2-2.2a3 3 0 0 1 4.2 0" />
      <path d="m14.5 9.5 1.8-1.8a3 3 0 0 1 4.2 4.2l-2.2 2.2a3 3 0 0 1-4.2 0" />
      <path d="m8 16 8-8" />
    </>
  ),
}

export function Icon({ name, className = '', size = 18, strokeWidth = 1.8 }) {
  const icon = iconPaths[name]

  if (!icon) {
    return null
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${className}`.trim()}
    >
      {icon}
    </svg>
  )
}
