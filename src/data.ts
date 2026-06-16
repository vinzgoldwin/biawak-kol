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
  seedStats?: {
    games: number
    wins: number
    losses: number
    points: number
  }
}

export const navItems: Array<{ id: NavKey; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Beranda', icon: '◧' },
  { id: 'record', label: 'Catat', icon: '◎' },
  { id: 'history', label: 'Riwayat', icon: '◫' },
  { id: 'players', label: 'Pemain', icon: '◌' },
]

export const playerDirectory: RosterPlayer[] = [
  { id: 'kevin', name: 'Kevin', seedStats: { games: 9, wins: 7, losses: 2, points: 19 } },
  { id: 'ko-giri', name: 'Ko Giri', seedStats: { games: 7, wins: 6, losses: 1, points: 17 } },
  { id: 'ko-anton', name: 'Ko Anton', seedStats: { games: 7, wins: 4, losses: 3, points: 9 } },
  { id: 'aal', name: 'AAL', seedStats: { games: 7, wins: 4, losses: 3, points: 9 } },
  { id: 'bg-andes', name: 'BG Andes', seedStats: { games: 7, wins: 4, losses: 3, points: 9 } },
  { id: 'bg-budi-dor', name: 'BG Budi Dor', seedStats: { games: 5, wins: 3, losses: 2, points: 7 } },
  { id: 'koyok', name: 'Koyok', seedStats: { games: 6, wins: 3, losses: 3, points: 6 } },
  { id: 'tommy', name: 'Tommy', seedStats: { games: 6, wins: 3, losses: 3, points: 6 } },
  { id: 'fandi', name: 'Fandi', seedStats: { games: 7, wins: 3, losses: 4, points: 5 } },
  { id: 'dinda', name: 'Dinda', seedStats: { games: 6, wins: 2, losses: 4, points: 2 } },
  { id: 'momot', name: 'Momot', seedStats: { games: 7, wins: 2, losses: 5, points: 1 } },
  { id: 'syauli', name: 'Syauli', seedStats: { games: 7, wins: 2, losses: 5, points: 1 } },
  { id: 'eko', name: 'Eko', seedStats: { games: 7, wins: 2, losses: 5, points: 1 } },
  { id: 'yoyok', name: 'Yoyok', seedStats: { games: 5, wins: 1, losses: 4, points: -1 } },
  { id: 'ko-mentro', name: 'Ko Mentro', seedStats: { games: 5, wins: 1, losses: 4, points: -1 } },
  { id: 'ko-akun', name: 'Ko Akun', seedStats: { games: 4, wins: 4, losses: 0, points: 12 } },
  { id: 'ko-yusin', name: 'Ko Yusin', seedStats: { games: 4, wins: 3, losses: 1, points: 8 } },
  { id: 'bg-frans', name: 'BG Frans', seedStats: { games: 2, wins: 2, losses: 0, points: 6 } },
  { id: 'yuriko', name: 'Yuriko', seedStats: { games: 2, wins: 2, losses: 0, points: 6 } },
  { id: 'yoa', name: 'Yoa', seedStats: { games: 2, wins: 2, losses: 0, points: 6 } },
  { id: 'agus', name: 'Agus', seedStats: { games: 3, wins: 2, losses: 1, points: 5 } },
  { id: 'bmt', name: 'BMT', seedStats: { games: 4, wins: 2, losses: 2, points: 4 } },
  { id: 'alun', name: 'Alun', seedStats: { games: 4, wins: 2, losses: 2, points: 4 } },
  { id: 'hengki', name: 'Hengki', seedStats: { games: 4, wins: 2, losses: 2, points: 4 } },
  { id: 'yanuar', name: 'Yanuar', seedStats: { games: 2, wins: 1, losses: 1, points: 2 } },
  { id: 'onny', name: 'Onny', seedStats: { games: 2, wins: 1, losses: 1, points: 2 } },
  { id: 'puji', name: 'Puji', seedStats: { games: 3, wins: 1, losses: 2, points: 1 } },
  { id: 'bg-hendra', name: 'BG Hendra', seedStats: { games: 2, wins: 0, losses: 2, points: -2 } },
  { id: 'ko-atong', name: 'Ko Atong', seedStats: { games: 2, wins: 0, losses: 2, points: -2 } },
  { id: 'ucup', name: 'Ucup', seedStats: { games: 2, wins: 0, losses: 2, points: -2 } },
  { id: 'matthew', name: 'Matthew', seedStats: { games: 3, wins: 0, losses: 3, points: -3 } },
  { id: 'ko-awan', name: 'Ko Awan', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
]

export const historySeed: HistoryGame[] = []
