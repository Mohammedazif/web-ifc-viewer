import type { ReactNode } from 'react'

const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12 5 5 9-10" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6A17.3 17.3 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  download: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  target: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  grid: <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />,
  cube: <path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM12 22V12M21 7l-9 5-9-5" />,
  section: (
    <>
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />
      <path d="m3 12 9 5 9-5" strokeDasharray="2.5 2.5" />
    </>
  ),
  isolate: (
    <>
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
    </>
  ),
  stats: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  perspective: <path d="m4 7 16-3v16L4 17V7Z" />,
  orthographic: <path d="M4 5h16v14H4z" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v6M12 16.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
  sidebar: <path d="M3 4h18v16H3zM9 4v16" />,
  file: <path d="M6 2h8l4 4v16H6zM14 2v4h4" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5" />,
  folder: <path d="M3 6h6l2 2h10v11H3z" />,
  box: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  flip: <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />,
  shield: <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 16, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}
