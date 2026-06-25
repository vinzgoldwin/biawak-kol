export type NavKey = 'dashboard' | 'mvp' | 'record' | 'saved' | 'history' | 'players'

export type LeaderboardRow = {
  name: string
  isQualified: boolean
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

export type PlayerProfile = {
  heightCm?: number
  marketValueRp?: number
  birthDate?: string
  position?: string
  dominantHand?: 'Kanan' | 'Kiri' | 'Keduanya'
}

export type PlayerCard = {
  id: string
  name: string
  isHiddenFromTeams: boolean
  isExcludedFromLeaderboard: boolean
  active: boolean
  games: number
  wins: number
  losses: number
  points: number
  coefficient: string
  winRate: string
  profile?: PlayerProfile
  recentGames: Array<{
    label: string
    result: string
  }>
}

export type RosterPlayer = {
  id: string
  name: string
  isHiddenFromTeams?: boolean
  isRepeatable?: boolean
  isExcludedFromLeaderboard?: boolean
  profile?: PlayerProfile
  seedStats?: {
    games: number
    wins: number
    losses: number
    points: number
  }
}

export const navItems: Array<{ id: NavKey; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Beranda', icon: '◧' },
  { id: 'mvp', label: 'MVP', icon: '♕' },
  { id: 'record', label: 'Catat', icon: '◎' },
  { id: 'history', label: 'Riwayat', icon: '◫' },
  { id: 'players', label: 'Pemain', icon: '◌' },
]

export const seedStatsMonth = '2026-06'

export const playerDirectory: RosterPlayer[] = [
  { id: 'anonim', name: 'Anonim', isRepeatable: true, isExcludedFromLeaderboard: true },
  {
    id: 'kevin',
    name: 'Kevin',
    profile: { heightCm: 188, marketValueRp: 125000000, birthDate: '2002-03-18', position: 'Small Forward', dominantHand: 'Kanan' },
    seedStats: { games: 12, wins: 9, losses: 3, points: 24 },
  },
  { id: 'ko-giri', name: 'Ko Giri', seedStats: { games: 10, wins: 8, losses: 2, points: 22 } },
  { id: 'ko-anton', name: 'Ko Anton', seedStats: { games: 10, wins: 7, losses: 3, points: 18 } },
  { id: 'fandi', name: 'Fandi', seedStats: { games: 14, wins: 8, losses: 6, points: 18 } },
  { id: 'aal', name: 'AAL', seedStats: { games: 14, wins: 8, losses: 6, points: 18 } },
  { id: 'bg-andes', name: 'Andes', seedStats: { games: 9, wins: 6, losses: 3, points: 15 } },
  { id: 'ko-yusin', name: 'Ko Yusin', seedStats: { games: 10, wins: 6, losses: 4, points: 14 } },
  { id: 'bg-budi-dor', name: 'BG Budi', seedStats: { games: 10, wins: 6, losses: 4, points: 14 } },
  { id: 'tommy', name: 'Tommy', seedStats: { games: 13, wins: 6, losses: 7, points: 11 } },
  { id: 'syauli', name: 'Syauli', seedStats: { games: 13, wins: 6, losses: 7, points: 11 } },
  { id: 'bg-frans', name: 'Frans', seedStats: { games: 9, wins: 5, losses: 4, points: 11 } },
  { id: 'bmt', name: 'BMT', seedStats: { games: 7, wins: 4, losses: 3, points: 9 } },
  { id: 'hengki', name: 'Hengki', seedStats: { games: 7, wins: 4, losses: 3, points: 9 } },
  { id: 'momot', name: 'Momot', seedStats: { games: 14, wins: 5, losses: 9, points: 6 } },
  { id: 'agus', name: 'Agus', seedStats: { games: 10, wins: 4, losses: 6, points: 6 } },
  { id: 'alun', name: 'Alun', seedStats: { games: 11, wins: 4, losses: 7, points: 5 } },
  { id: 'yanuar', name: 'Yanuar', seedStats: { games: 8, wins: 3, losses: 5, points: 4 } },
  { id: 'yoyok', name: 'Yoyok', seedStats: { games: 9, wins: 3, losses: 6, points: 3 } },
  { id: 'eko', name: 'Eko', seedStats: { games: 10, wins: 3, losses: 7, points: 2 } },
  { id: 'koyok', name: 'Koyok', seedStats: { games: 12, wins: 3, losses: 9, points: 0 } },
  { id: 'dinda', name: 'Dinda', seedStats: { games: 8, wins: 2, losses: 6, points: 0 } },
  { id: 'ko-akun', name: 'Ko Akun', seedStats: { games: 6, wins: 4, losses: 2, points: 10 } },
  { id: 'yuriko', name: 'Yuriko', seedStats: { games: 2, wins: 2, losses: 0, points: 6 } },
  { id: 'yoa', name: 'Yoa', seedStats: { games: 2, wins: 2, losses: 0, points: 6 } },
  { id: 'ko-atong', name: 'Atong', seedStats: { games: 5, wins: 2, losses: 3, points: 3 } },
  { id: 'ucup', name: 'Ucup', seedStats: { games: 5, wins: 2, losses: 3, points: 3 } },
  { id: 'awi', name: 'Awi', seedStats: { games: 2, wins: 1, losses: 1, points: 2 } },
  { id: 'onny', name: 'Onny', seedStats: { games: 2, wins: 1, losses: 1, points: 2 } },
  { id: 'puji', name: 'Puji', seedStats: { games: 3, wins: 1, losses: 2, points: 1 } },
  { id: 'ko-mentro', name: 'Mentro', seedStats: { games: 5, wins: 1, losses: 4, points: -1 } },
  { id: 'matthew', name: 'Matthew', seedStats: { games: 6, wins: 1, losses: 5, points: -2 } },
  { id: 'bg-hendra', name: 'Hendra', seedStats: { games: 2, wins: 0, losses: 2, points: -2 } },
  { id: 'ko-awan', name: 'Ko Awan', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'wilgun', name: 'Wilgun', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'piping', name: 'Piping', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'asun', name: 'Asun', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'ko-lolok', name: 'Ko Lolok', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'ko-amui', name: 'Ko Amui', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'akuang', name: 'Akuang', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'nando', name: 'Nando', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'firman', name: 'Firman', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
  { id: 'cadangan', name: 'Cadangan', seedStats: { games: 0, wins: 0, losses: 0, points: 0 } },
]

const legacySeedNames: Record<string, string> = {
  'bg-andes': 'BG Andes',
  'bg-budi-dor': 'BG Budi Dor',
  'bg-frans': 'BG Frans',
  'ko-atong': 'Ko Atong',
  'ko-mentro': 'Ko Mentro',
  'bg-hendra': 'BG Hendra',
}

export function reconcileRosterSeed(rosterPlayers: RosterPlayer[]) {
  const seededPlayersById = new Map(playerDirectory.map((player) => [player.id, player]))
  const storedPlayerIds = new Set(rosterPlayers.map((player) => player.id))

  const storedPlayers = rosterPlayers.map((storedPlayer) => {
    const seededPlayer = seededPlayersById.get(storedPlayer.id)
    if (!seededPlayer) return storedPlayer

    return {
      ...storedPlayer,
      name: storedPlayer.name === legacySeedNames[seededPlayer.id] ? seededPlayer.name : storedPlayer.name,
      isRepeatable: seededPlayer.isRepeatable,
      isExcludedFromLeaderboard: seededPlayer.isExcludedFromLeaderboard,
      profile: seededPlayer.profile,
      seedStats: seededPlayer.seedStats,
    }
  })

  const missingSeededPlayers = playerDirectory.filter((player) => !storedPlayerIds.has(player.id))
  return [...storedPlayers, ...missingSeededPlayers]
}

export const historySeed: HistoryGame[] = []
