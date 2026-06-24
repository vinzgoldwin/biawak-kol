import { cn } from '@/lib/utils'

type MvpCrestLogoProps = {
  className?: string
}

export function MvpCrestLogo({ className }: MvpCrestLogoProps) {
  return (
    <svg viewBox="0 0 180 210" aria-label="Biawak KOL MVP" className={cn('drop-shadow-[0_0_24px_rgba(0,130,54,0.55)]', className)} fill="none">
      <defs>
        <linearGradient id="mvp-crest-green" x1="22" x2="158" y1="12" y2="198" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A63E" />
          <stop offset="1" stopColor="#78F2BC" />
        </linearGradient>
      </defs>
      <path
        d="M90 11 158 35v70c0 45-27 78-68 99-41-21-68-54-68-99V35L90 11Z"
        fill="rgba(0,0,0,0.22)"
        stroke="url(#mvp-crest-green)"
        strokeWidth="6"
      />
      <path d="M59 61h62" stroke="url(#mvp-crest-green)" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M63 61 58 38l15 11 17-24 17 24 15-11-5 23"
        fill="rgba(0,166,62,0.2)"
        stroke="url(#mvp-crest-green)"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <text x="90" y="113" textAnchor="middle" fill="#F4F4F5" fontFamily="Georgia, serif" fontSize="42" fontWeight="900" letterSpacing="-1.3">
        MVP
      </text>
      <text x="90" y="140" textAnchor="middle" fill="#78F2BC" fontFamily="Inter, system-ui, sans-serif" fontSize="12.5" fontWeight="900" letterSpacing="1.6">
        BIAWAK KOL
      </text>
      <path d="m90 154 4.8 9.7 10.7 1.5-7.7 7.5 1.8 10.6-9.6-5-9.6 5 1.8-10.6-7.7-7.5 10.7-1.5L90 154Z" fill="#F4F4F5" />
    </svg>
  )
}
