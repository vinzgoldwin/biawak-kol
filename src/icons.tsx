import type { ReactElement, SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

export type IconComponent = (props: IconProps) => ReactElement

function IconBase({ size = 20, strokeWidth = 2, children, ...props }: IconProps): ReactElement {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></IconBase>
}

export function BellIcon(props: IconProps) {
  return <IconBase {...props}><path d="M10.3 21a2 2 0 0 0 3.4 0" /><path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 9h18c0-2-3-2-3-9" /></IconBase>
}

export function HomeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 10 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></IconBase>
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14" /><path d="M5 12h14" /></IconBase>
}

export function CheckIcon(props: IconProps) {
  return <IconBase {...props}><path d="m5 12 5 5L20 7" /></IconBase>
}

export function CheckCircleIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" /></IconBase>
}

export function HistoryIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 7v5l3 2" /></IconBase>
}

export function UsersIcon(props: IconProps) {
  return <IconBase {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></IconBase>
}

export function CalendarIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></IconBase>
}

export function TrophyIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a2 2 0 0 0 2 4h1" /><path d="M17 6h3a2 2 0 0 1-2 4h-1" /></IconBase>
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></IconBase>
}

export function SaveIcon(props: IconProps) {
  return <IconBase {...props}><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></IconBase>
}

export function BarChartIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 3v18h18" /><path d="M7 16v-5" /><path d="M12 16V7" /><path d="M17 16v-8" /></IconBase>
}

export function PencilIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></IconBase>
}

export function TrashIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></IconBase>
}

export function XIcon(props: IconProps) {
  return <IconBase {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></IconBase>
}

export function ImageIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></IconBase>
}

export function CopyIcon(props: IconProps) {
  return <IconBase {...props}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></IconBase>
}

export function DownloadIcon(props: IconProps) {
  return <IconBase {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></IconBase>
}
