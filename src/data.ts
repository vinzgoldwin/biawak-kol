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

export const navItems: Array<{ id: NavKey; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧' },
  { id: 'record', label: 'Record', icon: '◎' },
  { id: 'history', label: 'History', icon: '◫' },
  { id: 'players', label: 'Players', icon: '◌' },
]

export const summaryStats = [
  { label: 'Total Games', value: '12' },
  { label: 'Active Players', value: '15' },
  { label: 'Top Player', value: 'Kevin' },
  { label: 'Best Win Rate', value: '86%' },
]

export const leaderboardQualified: LeaderboardRow[] = [
  {
    name: 'Kevin',
    games: 9,
    wins: 7,
    losses: 2,
    points: 19,
    coefficient: '2.11',
    winRate: '78%',
  },
  {
    name: 'Ko Giri',
    games: 7,
    wins: 6,
    losses: 1,
    points: 17,
    coefficient: '2.43',
    winRate: '86%',
  },
  {
    name: 'Ko Anton',
    games: 7,
    wins: 4,
    losses: 3,
    points: 9,
    coefficient: '1.29',
    winRate: '57%',
  },
  {
    name: 'AAL',
    games: 7,
    wins: 4,
    losses: 3,
    points: 9,
    coefficient: '1.29',
    winRate: '57%',
  },
]

export const leaderboardUnqualified: LeaderboardRow[] = [
  {
    name: 'Alun',
    games: 3,
    wins: 2,
    losses: 1,
    points: 5,
    coefficient: '1.67',
    winRate: '67%',
  },
  {
    name: 'BG Hendra',
    games: 2,
    wins: 1,
    losses: 1,
    points: 2,
    coefficient: '1.00',
    winRate: '50%',
  },
  {
    name: 'Syaili',
    games: 1,
    wins: 1,
    losses: 0,
    points: 3,
    coefficient: '3.00',
    winRate: '100%',
  },
]

export const recordPool = [
  'Kevin',
  'Ko Giri',
  'Ko Anton',
  'AAL',
  'Agus',
  'Johan',
  'BG Frans',
  'Alun',
  'Koyok',
  'BG Hendra',
  'Syaili',
  'Hengki',
  'Dori',
  'Raka',
  'Fadly',
  'Satria',
  'Rizky',
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

export const playerDirectory: PlayerCard[] = [
  {
    id: 'kevin',
    name: 'Kevin',
    active: true,
    games: 9,
    wins: 7,
    losses: 2,
    points: 19,
    coefficient: '2.11',
    winRate: '78%',
    recentGames: [
      { label: '16 Jun 2026 vs Team B', result: 'W +3' },
      { label: '13 Jun 2026 vs Team A', result: 'L -1' },
      { label: '10 Jun 2026 vs Team B', result: 'W +3' },
    ],
  },
  {
    id: 'ko-giri',
    name: 'Ko Giri',
    active: true,
    games: 7,
    wins: 6,
    losses: 1,
    points: 17,
    coefficient: '2.43',
    winRate: '86%',
    recentGames: [
      { label: '10 Jun 2026 vs Team B', result: 'W +3' },
      { label: '8 Jun 2026 vs Team A', result: 'W +3' },
      { label: '6 Jun 2026 vs Team B', result: 'L -1' },
    ],
  },
  {
    id: 'ko-anton',
    name: 'Ko Anton',
    active: true,
    games: 7,
    wins: 4,
    losses: 3,
    points: 9,
    coefficient: '1.29',
    winRate: '57%',
    recentGames: [
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
      { label: '10 Jun 2026 vs Team A', result: 'W +3' },
      { label: '7 Jun 2026 vs Team A', result: 'L -1' },
    ],
  },
  {
    id: 'aal',
    name: 'AAL',
    active: true,
    games: 7,
    wins: 4,
    losses: 3,
    points: 9,
    coefficient: '1.29',
    winRate: '57%',
    recentGames: [
      { label: '16 Jun 2026 vs Team B', result: 'W +3' },
      { label: '13 Jun 2026 vs Team A', result: 'L -1' },
      { label: '5 Jun 2026 vs Team B', result: 'W +3' },
    ],
  },
  {
    id: 'alun',
    name: 'Alun',
    active: true,
    games: 3,
    wins: 2,
    losses: 1,
    points: 5,
    coefficient: '1.67',
    winRate: '67%',
    recentGames: [
      { label: '16 Jun 2026 vs Team A', result: 'L -1' },
      { label: '9 Jun 2026 vs Team B', result: 'W +3' },
    ],
  },
  {
    id: 'bg-hendra',
    name: 'BG Hendra',
    active: true,
    games: 2,
    wins: 1,
    losses: 1,
    points: 2,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '16 Jun 2026 vs Team A', result: 'L -1' },
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
    ],
  },
  {
    id: 'syaili',
    name: 'Syaili',
    active: true,
    games: 1,
    wins: 1,
    losses: 0,
    points: 3,
    coefficient: '3.00',
    winRate: '100%',
    recentGames: [{ label: '8 Jun 2026 vs Team B', result: 'W +3' }],
  },
  {
    id: 'agus',
    name: 'Agus',
    active: true,
    games: 4,
    wins: 2,
    losses: 2,
    points: 4,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '16 Jun 2026 vs Team B', result: 'W +3' },
      { label: '13 Jun 2026 vs Team A', result: 'L -1' },
    ],
  },
  {
    id: 'johan',
    name: 'Johan',
    active: true,
    games: 4,
    wins: 2,
    losses: 2,
    points: 4,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '16 Jun 2026 vs Team B', result: 'W +3' },
      { label: '13 Jun 2026 vs Team A', result: 'L -1' },
    ],
  },
  {
    id: 'bg-frans',
    name: 'BG Frans',
    active: true,
    games: 4,
    wins: 2,
    losses: 2,
    points: 4,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '16 Jun 2026 vs Team B', result: 'W +3' },
      { label: '13 Jun 2026 vs Team A', result: 'L -1' },
    ],
  },
  {
    id: 'koyok',
    name: 'Koyok',
    active: true,
    games: 3,
    wins: 1,
    losses: 2,
    points: 1,
    coefficient: '0.33',
    winRate: '33%',
    recentGames: [
      { label: '16 Jun 2026 vs Team A', result: 'L -1' },
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
    ],
  },
  {
    id: 'hengki',
    name: 'Hengki',
    active: true,
    games: 3,
    wins: 1,
    losses: 2,
    points: 1,
    coefficient: '0.33',
    winRate: '33%',
    recentGames: [
      { label: '16 Jun 2026 vs Team A', result: 'L -1' },
      { label: '10 Jun 2026 vs Team A', result: 'L -1' },
    ],
  },
  {
    id: 'dori',
    name: 'Dori',
    active: true,
    games: 2,
    wins: 1,
    losses: 1,
    points: 2,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
      { label: '10 Jun 2026 vs Team A', result: 'W +3' },
    ],
  },
  {
    id: 'raka',
    name: 'Raka',
    active: true,
    games: 2,
    wins: 1,
    losses: 1,
    points: 2,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
      { label: '10 Jun 2026 vs Team A', result: 'W +3' },
    ],
  },
  {
    id: 'fadly',
    name: 'Fadly',
    active: true,
    games: 2,
    wins: 1,
    losses: 1,
    points: 2,
    coefficient: '1.00',
    winRate: '50%',
    recentGames: [
      { label: '13 Jun 2026 vs Team B', result: 'W +3' },
      { label: '10 Jun 2026 vs Team A', result: 'W +3' },
    ],
  },
  {
    id: 'satria',
    name: 'Satria',
    active: false,
    games: 0,
    wins: 0,
    losses: 0,
    points: 0,
    coefficient: '0.00',
    winRate: '0%',
    recentGames: [],
  },
  {
    id: 'rizky',
    name: 'Rizky',
    active: false,
    games: 0,
    wins: 0,
    losses: 0,
    points: 0,
    coefficient: '0.00',
    winRate: '0%',
    recentGames: [],
  },
]
