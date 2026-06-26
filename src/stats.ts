import type { HistoryGame, LeaderboardRow, PlayerCard, RosterPlayer } from './data'

export type SummaryStat = {
  label: string
  value: string
}

export type LeaderboardData = {
  minimumGames: number
  all: LeaderboardRow[]
  qualified: LeaderboardRow[]
  unqualified: LeaderboardRow[]
}

type MutablePlayerStats = {
  id: string
  name: string
  isHiddenFromTeams: boolean
  isExcludedFromLeaderboard: boolean
  games: number
  wins: number
  losses: number
  points: number
  profile: PlayerCard['profile']
  recentGames: PlayerCard['recentGames']
  sourceIndex: number
}

const slugifyName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-')
const formatCoefficient = (points: number, games: number) => {
  if (games === 0) return '0.00'

  const coefficient = points / games
  return coefficient < 0 ? `(${Math.abs(coefficient).toFixed(2)})` : coefficient.toFixed(2)
}
const formatWinRate = (wins: number, games: number) => (games === 0 ? '0%' : `${Math.round((wins / games) * 100)}%`)
const getWinRateValue = (player: Pick<PlayerCard, 'games' | 'wins'>) => (player.games === 0 ? 0 : player.wins / player.games)
const getCoefficientValue = (coefficient: string) => (
  coefficient.startsWith('(') && coefficient.endsWith(')')
    ? -Number(coefficient.slice(1, -1))
    : Number(coefficient)
)

const createEmptyStats = (player: RosterPlayer, sourceIndex: number, includeSeedStats = true): MutablePlayerStats => ({
  id: player.id,
  name: player.name,
  isHiddenFromTeams: player.isHiddenFromTeams === true,
  isExcludedFromLeaderboard: player.isExcludedFromLeaderboard === true,
  games: includeSeedStats ? player.seedStats?.games ?? 0 : 0,
  wins: includeSeedStats ? player.seedStats?.wins ?? 0 : 0,
  losses: includeSeedStats ? player.seedStats?.losses ?? 0 : 0,
  points: includeSeedStats ? player.seedStats?.points ?? 0 : 0,
  profile: player.profile,
  recentGames: [],
  sourceIndex,
})

const ensurePlayerStats = (statsByName: Map<string, MutablePlayerStats>, playerName: string) => {
  const existing = statsByName.get(playerName)
  if (existing) return existing

  const created = createEmptyStats({ id: slugifyName(playerName), name: playerName }, statsByName.size)
  statsByName.set(playerName, created)
  return created
}

const toPlayerCard = (player: MutablePlayerStats): PlayerCard => ({
  id: player.id,
  name: player.name,
  isHiddenFromTeams: player.isHiddenFromTeams,
  isExcludedFromLeaderboard: player.isExcludedFromLeaderboard,
  active: player.games > 0,
  games: player.games,
  wins: player.wins,
  losses: player.losses,
  points: player.points,
  coefficient: formatCoefficient(player.points, player.games),
  winRate: formatWinRate(player.wins, player.games),
  profile: player.profile,
  recentGames: player.recentGames,
})

const toLeaderboardRow = (player: PlayerCard, isQualified: boolean): LeaderboardRow => ({
  name: player.name,
  isQualified,
  games: player.games,
  wins: player.wins,
  losses: player.losses,
  points: player.points,
  coefficient: player.coefficient,
  winRate: player.winRate,
  profile: player.profile,
})

const compareLeaderboardPlayers = (left: PlayerCard, right: PlayerCard) => (
  right.points - left.points
  || getCoefficientValue(right.coefficient) - getCoefficientValue(left.coefficient)
  || getWinRateValue(right) - getWinRateValue(left)
  || right.wins - left.wins
  || left.name.localeCompare(right.name)
)

const sortByBestWinRate = (left: PlayerCard, right: PlayerCard) => (
  getWinRateValue(right) - getWinRateValue(left)
  || compareLeaderboardPlayers(left, right)
)

export function getMinimumQualifiedGames(players: Pick<PlayerCard, 'games'>[]) {
  return Math.ceil(Math.max(0, ...players.map((player) => player.games)) / 2)
}

export function buildPlayerStats(
  rosterPlayers: RosterPlayer[],
  games: HistoryGame[],
  options: { includeSeedStats?: boolean } = {},
): PlayerCard[] {
  const statsByName = new Map<string, MutablePlayerStats>()
  const includeSeedStats = options.includeSeedStats ?? true

  rosterPlayers.forEach((player, index) => {
    statsByName.set(player.name, createEmptyStats(player, index, includeSeedStats))
  })

  const sortedGames = [...games].sort((left, right) => right.id - left.id)

  sortedGames.forEach((game) => {
    const teams = [
      { key: 'A' as const, players: game.teamA, opponent: 'Tim B' },
      { key: 'B' as const, players: game.teamB, opponent: 'Tim A' },
    ]

    teams.forEach((team) => {
      const didWin = game.winner === team.key

      team.players.forEach((playerName) => {
        const player = ensurePlayerStats(statsByName, playerName)
        player.games += 1

        if (didWin) {
          player.wins += 1
          player.points += 3
        } else {
          player.losses += 1
          player.points -= 1
        }

        if (player.recentGames.length < 5) {
          player.recentGames.push({
            label: `${game.dateShort} vs ${team.opponent}`,
            result: didWin ? '+3' : '-1',
          })
        }
      })
    })
  })

  return Array.from(statsByName.values())
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map(toPlayerCard)
}

export function buildLeaderboard(players: PlayerCard[]): LeaderboardData {
  const rankedPlayers = players
    .filter((player) => !player.isExcludedFromLeaderboard && player.games > 0)
    .sort(compareLeaderboardPlayers)
  const minimumGames = getMinimumQualifiedGames(rankedPlayers)
  const qualifiedPlayers = rankedPlayers.filter((player) => player.games >= minimumGames)
  const unqualifiedPlayers = rankedPlayers.filter((player) => player.games < minimumGames)

  return {
    minimumGames,
    all: [
      ...qualifiedPlayers.map((player) => toLeaderboardRow(player, true)),
      ...unqualifiedPlayers.map((player) => toLeaderboardRow(player, false)),
    ],
    qualified: qualifiedPlayers.map((player) => toLeaderboardRow(player, true)),
    unqualified: unqualifiedPlayers.map((player) => toLeaderboardRow(player, false)),
  }
}

export function buildDashboardSummary(games: HistoryGame[], players: PlayerCard[], leaderboard: LeaderboardData): SummaryStat[] {
  const activePlayers = players.filter((player) => !player.isExcludedFromLeaderboard && player.games > 0)
  const topPlayer = leaderboard.qualified[0] ?? leaderboard.unqualified[0]
  const bestWinRatePlayer = [...activePlayers]
    .filter((player) => leaderboard.qualified.length === 0 || player.games >= leaderboard.minimumGames)
    .sort(sortByBestWinRate)[0]

  return [
    { label: 'Total Game', value: String(games.length) },
    { label: 'Pemain', value: String(activePlayers.length) },
    { label: 'Pemain Teratas', value: topPlayer?.name ?? '-' },
    { label: `Persen Menang Terbaik (≥${leaderboard.minimumGames} Game)`, value: bestWinRatePlayer?.winRate ?? '-' },
  ]
}
