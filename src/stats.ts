import type { HistoryGame, LeaderboardRow, PlayerCard, RosterPlayer } from './data'

const MINIMUM_QUALIFIED_GAMES = 5

export type SummaryStat = {
  label: string
  value: string
}

export type LeaderboardData = {
  all: LeaderboardRow[]
  qualified: LeaderboardRow[]
  unqualified: LeaderboardRow[]
}

type MutablePlayerStats = {
  id: string
  name: string
  games: number
  wins: number
  losses: number
  points: number
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

const createEmptyStats = (player: RosterPlayer, sourceIndex: number): MutablePlayerStats => ({
  id: player.id,
  name: player.name,
  games: player.seedStats?.games ?? 0,
  wins: player.seedStats?.wins ?? 0,
  losses: player.seedStats?.losses ?? 0,
  points: player.seedStats?.points ?? 0,
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
  active: player.games > 0,
  games: player.games,
  wins: player.wins,
  losses: player.losses,
  points: player.points,
  coefficient: formatCoefficient(player.points, player.games),
  winRate: formatWinRate(player.wins, player.games),
  recentGames: player.recentGames,
})

const toLeaderboardRow = (player: PlayerCard): LeaderboardRow => ({
  name: player.name,
  games: player.games,
  wins: player.wins,
  losses: player.losses,
  points: player.points,
  coefficient: player.coefficient,
  winRate: player.winRate,
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

export function buildPlayerStats(rosterPlayers: RosterPlayer[], games: HistoryGame[]): PlayerCard[] {
  const statsByName = new Map<string, MutablePlayerStats>()

  rosterPlayers.forEach((player, index) => {
    statsByName.set(player.name, createEmptyStats(player, index))
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

        if (player.recentGames.length < 3) {
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
    .filter((player) => player.games > 0)
    .sort(compareLeaderboardPlayers)

  return {
    all: rankedPlayers.map(toLeaderboardRow),
    qualified: rankedPlayers
      .filter((player) => player.games >= MINIMUM_QUALIFIED_GAMES)
      .map(toLeaderboardRow),
    unqualified: rankedPlayers
      .filter((player) => player.games < MINIMUM_QUALIFIED_GAMES)
      .map(toLeaderboardRow),
  }
}

export function buildDashboardSummary(games: HistoryGame[], players: PlayerCard[], leaderboard: LeaderboardData): SummaryStat[] {
  const activePlayers = players.filter((player) => player.games > 0)
  const topPlayer = leaderboard.qualified[0] ?? leaderboard.unqualified[0]
  const bestWinRatePlayer = [...activePlayers]
    .filter((player) => leaderboard.qualified.length === 0 || player.games >= MINIMUM_QUALIFIED_GAMES)
    .sort(sortByBestWinRate)[0]

  return [
    { label: 'Total Game', value: String(games.length) },
    { label: 'Pemain', value: String(activePlayers.length) },
    { label: 'Pemain Teratas', value: topPlayer?.name ?? '-' },
    { label: 'Persen Menang Terbaik (≥5 Game)', value: bestWinRatePlayer?.winRate ?? '-' },
  ]
}
