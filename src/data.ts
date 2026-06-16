export type NavKey = 'dashboard' | 'record' | 'saved' | 'history' | 'players'

export type LeaderboardRow = {
  name: string
  games: number
  wins: number
  losses: number
  points: number
  coefficient: string
  winRate: string
}

export type HistoryGame = {
  id: number
  dateLabel: string
  dateShort: string
  winner: 'A' | 'B'
  teamA: string[]
  teamB: string[]
}

export type PlayerCard = {
  id: string
  name: string
  active: boolean
  games: number
  wins: number
  losses: number
  points: number
  coefficient: string
  winRate: string
  recentGames: Array<{
    label: string
    result: string
  }>
}

export type RosterPlayer = {
  id: string
  name: string
}

export const navItems: Array<{ id: NavKey; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Beranda', icon: '◧' },
  { id: 'record', label: 'Catat', icon: '◎' },
  { id: 'history', label: 'Riwayat', icon: '◫' },
  { id: 'players', label: 'Pemain', icon: '◌' },
]

export const playerDirectory: RosterPlayer[] = [
  { id: 'kevin', name: 'Kevin' },
  { id: 'ko-giri', name: 'Ko Giri' },
  { id: 'ko-anton', name: 'Ko Anton' },
  { id: 'aal', name: 'AAL' },
  { id: 'agus', name: 'Agus' },
  { id: 'johan', name: 'Johan' },
  { id: 'bg-frans', name: 'BG Frans' },
  { id: 'alun', name: 'Alun' },
  { id: 'koyok', name: 'Koyok' },
  { id: 'bg-hendra', name: 'BG Hendra' },
  { id: 'syaili', name: 'Syaili' },
  { id: 'hengki', name: 'Hengki' },
  { id: 'dori', name: 'Dori' },
  { id: 'raka', name: 'Raka' },
  { id: 'fadly', name: 'Fadly' },
  { id: 'satria', name: 'Satria' },
  { id: 'rizky', name: 'Rizky' },
]

export const historySeed: HistoryGame[] = [
  {
    id: 12,
    dateLabel: '16 Juni 2026',
    dateShort: '16 Jun 2026',
    winner: 'A',
    teamA: ['Kevin', 'AAL', 'Agus', 'Johan', 'BG Frans'],
    teamB: ['Alun', 'Koyok', 'BG Hendra', 'Syaili', 'Hengki'],
  },
  {
    id: 11,
    dateLabel: '13 Juni 2026',
    dateShort: '13 Jun 2026',
    winner: 'A',
    teamA: ['Ko Anton', 'Dori', 'Fadly', 'Raka', 'Koyok'],
    teamB: ['Kevin', 'Agus', 'Johan', 'BG Frans', 'AAL'],
  },
  {
    id: 10,
    dateLabel: '10 Juni 2026',
    dateShort: '10 Jun 2026',
    winner: 'A',
    teamA: ['Kevin', 'Ko Giri', 'Dori', 'Raka', 'Fadly'],
    teamB: ['Alun', 'Agus', 'Johan', 'BG Frans', 'Hengki'],
  },
]
