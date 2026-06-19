import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react'
import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Menu } from '@base-ui/react/menu'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { toBlob } from 'html-to-image'
import { cn } from '@/lib/utils'
import { Avatar as ShadAvatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  historySeed,
  navItems,
  playerDirectory,
  reconcileRosterSeed,
  seedStatsMonth,
  type HistoryGame,
  type LeaderboardRow,
  type NavKey,
  type PlayerCard,
  type RosterPlayer,
} from './data'
import { ArrowLeftRight, EllipsisVertical, EyeIcon, EyeOff, GripVertical, NotebookPen, UserRound, X } from 'lucide-react'
import {
  BarChartIcon,
  CheckCircleIcon,
  CheckIcon,
  HistoryIcon,
  HomeIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
  type IconComponent,
} from './icons'
import { fetchSharedState, saveSharedState, SharedStateError, type SharedState } from './remote-state'
import { buildDashboardSummary, buildLeaderboard, buildPlayerStats, getMinimumQualifiedGames, type SummaryStat } from './stats'

type Winner = 'A' | 'B'
type PlayerSort = 'alphabetical' | 'matches'

const TEAM_SIZE = 5
const HISTORY_STORAGE_KEY = 'biawak-kol.historyGames'
const ROSTER_STORAGE_KEY = 'biawak-kol.rosterPlayers'
const PROTECTED_PASSWORD_STORAGE_KEY = 'biawak-kol.protectedPassword'
const ACTIVE_SCREEN_STORAGE_KEY = 'biawak-kol.activeScreen'
const PLAYER_SORT_OPTIONS: Array<{ value: PlayerSort; label: string }> = [
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'matches', label: 'Match' },
]

type RecordState = {
  dateValue: string
  search: string
  teamA: string[]
  teamB: string[]
  winner: Winner | null
}

type UndoToast = {
  id: number
  message: string
  actionLabel: string
} & (
  | { type: 'remove-saved'; gameId: number }
  | { type: 'restore-deleted'; game: HistoryGame; restoreIndex: number }
  | { type: 'restore-updated'; game: HistoryGame }
)

type PendingProtectedAction = {
  id: number
  title: string
  onAllowed: () => void | Promise<void>
}

const navIcon: Record<NavKey, IconComponent> = {
  dashboard: HomeIcon,
  record: NotebookPen as IconComponent,
  saved: CheckCircleIcon,
  history: HistoryIcon,
  players: UsersIcon,
}

const monthShortNames: Record<string, string> = {
  Januari: 'Jan',
  Februari: 'Feb',
  Maret: 'Mar',
  April: 'Apr',
  Mei: 'Mei',
  Juni: 'Jun',
  Juli: 'Jul',
  Agustus: 'Agu',
  September: 'Sep',
  Oktober: 'Okt',
  November: 'Nov',
  Desember: 'Des',
}

const monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

type MonthOption = {
  value: string
  label: string
}

function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function getCurrentMonthValue() {
  const today = new Date()
  return toMonthValue(today.getFullYear(), today.getMonth())
}

function getCurrentDateValue() {
  const today = new Date()
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function createEmptyRecordState(): RecordState {
  return {
    dateValue: getCurrentDateValue(),
    search: '',
    teamA: [],
    teamB: [],
    winner: null,
  }
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return `${monthNames[month - 1] ?? value} ${year}`
}

function createMonthOptions(extraMonthValues: string[] = [], monthsBack = 11): MonthOption[] {
  const today = new Date()
  const monthValues = new Set<string>()

  for (let index = 0; index <= monthsBack; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1)
    monthValues.add(toMonthValue(date.getFullYear(), date.getMonth()))
  }

  extraMonthValues.forEach((value) => monthValues.add(value))

  return Array.from(monthValues)
    .sort((first, second) => second.localeCompare(first))
    .map((value) => ({ value, label: formatMonthLabel(value) }))
}

function toDateShort(dateLabel: string) {
  const [day, month, year] = dateLabel.trim().split(/\s+/)
  if (!day || !month || !year) return dateLabel

  return `${day} ${monthShortNames[month] ?? month.slice(0, 3)} ${year}`
}

function formatDateLabel(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  if (!year || !month || !day) return dateValue

  return `${day} ${monthNames[month - 1] ?? month} ${year}`
}

function toDateValue(dateLabel: string) {
  const [day, month, year] = dateLabel.trim().split(/\s+/)
  const monthIndex = monthNames.indexOf(month)
  if (!day || !year || monthIndex === -1) return getCurrentDateValue()

  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
}

function toGameMonthValue(dateLabel: string) {
  const [, month, year] = dateLabel.trim().split(/\s+/)
  const monthIndex = monthNames.indexOf(month)
  if (monthIndex === -1 || !year) return null

  return toMonthValue(Number(year), monthIndex)
}

function createHistoryGame(recordState: RecordState, historyGames: HistoryGame[], gameId?: number): HistoryGame | null {
  if (recordState.winner === null) return null

  const dateLabel = formatDateLabel(recordState.dateValue)

  return {
    id: gameId ?? Math.max(0, ...historyGames.map((game) => game.id)) + 1,
    dateLabel,
    dateShort: toDateShort(dateLabel),
    winner: recordState.winner,
    teamA: [...recordState.teamA],
    teamB: [...recordState.teamB],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isHistoryGame(value: unknown): value is HistoryGame {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number'
    && typeof value.dateLabel === 'string'
    && typeof value.dateShort === 'string'
    && (value.winner === 'A' || value.winner === 'B')
    && isStringArray(value.teamA)
    && isStringArray(value.teamB)
  )
}

function isRosterPlayer(value: unknown): value is RosterPlayer {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.isHiddenFromTeams === undefined || typeof value.isHiddenFromTeams === 'boolean')
  )
}

function readStoredArray<T>(key: string, fallback: T[], isItem: (item: unknown) => item is T) {
  if (typeof window === 'undefined') return fallback

  try {
    const storedValue = window.localStorage.getItem(key)
    if (storedValue === null) return fallback

    const parsedValue: unknown = JSON.parse(storedValue)
    return Array.isArray(parsedValue) && parsedValue.every(isItem) ? parsedValue : fallback
  } catch {
    return fallback
  }
}

function writeStoredArray<T>(key: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Persistence should never block recording a game.
  }
}

function getStoredProtectedPassword() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(PROTECTED_PASSWORD_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeProtectedAccess(password: string) {
  try {
    window.localStorage.setItem(PROTECTED_PASSWORD_STORAGE_KEY, password)
  } catch {
    // Losing persistence only means the user may need to unlock again later.
  }
}

function clearProtectedAccess() {
  try {
    window.localStorage.removeItem(PROTECTED_PASSWORD_STORAGE_KEY)
  } catch {
    // The next protected write will ask for the password again.
  }
}

function isPersistentNavKey(value: string): value is Exclude<NavKey, 'saved'> {
  return value === 'dashboard' || value === 'record' || value === 'history' || value === 'players'
}

function getStoredActiveScreen(): NavKey {
  if (typeof window === 'undefined') return 'dashboard'

  try {
    const storedValue = window.localStorage.getItem(ACTIVE_SCREEN_STORAGE_KEY)
    return storedValue !== null && isPersistentNavKey(storedValue) ? storedValue : 'dashboard'
  } catch {
    return 'dashboard'
  }
}

function storeActiveScreen(screen: NavKey) {
  if (screen === 'saved') return

  try {
    window.localStorage.setItem(ACTIVE_SCREEN_STORAGE_KEY, screen)
  } catch {
    // Losing persistence only resets navigation to Beranda after a refresh.
  }
}

function App() {
  const [activeScreen, setActiveScreen] = useState<NavKey>(getStoredActiveScreen)
  const [recordState, setRecordState] = useState<RecordState>(createEmptyRecordState)
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>(() => readStoredArray(HISTORY_STORAGE_KEY, historySeed, isHistoryGame))
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>(() => (
    reconcileRosterSeed(readStoredArray(ROSTER_STORAGE_KEY, playerDirectory, isRosterPlayer))
  ))
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [playerQuery, setPlayerQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [dismissingUndoToastId, setDismissingUndoToastId] = useState<number | null>(null)
  const [editingGameId, setEditingGameId] = useState<number | null>(null)
  const [pendingProtectedAction, setPendingProtectedAction] = useState<PendingProtectedAction | null>(null)
  const [isCopyingImage, setIsCopyingImage] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const imageExportRef = useRef<HTMLDivElement>(null)

  const applySharedState = useCallback((sharedState: SharedState) => {
    setHistoryGames(sharedState.historyGames)
    setRosterPlayers(reconcileRosterSeed(sharedState.rosterPlayers))
    setRemoteVersion(sharedState.version)
  }, [])

  const handleSharedStateError = useCallback((error: unknown) => {
    if (error instanceof SharedStateError) {
      if (error.code === 'unauthorized') {
        clearProtectedAccess()
        toast.error('Password salah. Coba masukkan lagi.', { duration: 5000 })
        return
      }

      if (error.code === 'conflict') {
        if (error.latestState) applySharedState(error.latestState)
        toast.error('Data berubah di perangkat lain. Saya sudah memuat versi terbaru.', { duration: 5000 })
        return
      }

      toast.error('Data bersama belum bisa disinkronkan. Coba lagi nanti.', { duration: 5000 })
      return
    }

    toast.error('Terjadi masalah saat sinkronisasi.', { duration: 5000 })
  }, [applySharedState])

  const persistSharedState = useCallback(async (nextHistoryGames: HistoryGame[], nextRosterPlayers: RosterPlayer[]) => {
    const password = getStoredProtectedPassword()
    if (!password) {
      toast.error('Masukkan password sebelum menyimpan perubahan.', { duration: 5000 })
      return null
    }

    setIsSyncing(true)
    const toastId = toast.loading('Menyimpan...')
    try {
      const sharedState = await saveSharedState({
        password,
        expectedVersion: remoteVersion,
        historyGames: nextHistoryGames,
        rosterPlayers: nextRosterPlayers,
      })
      applySharedState(sharedState)
      toast.success('Data bersama tersimpan.', { id: toastId, duration: 3000 })
      return sharedState
    } catch (error) {
      toast.dismiss(toastId)
      handleSharedStateError(error)
      return null
    } finally {
      setIsSyncing(false)
    }
  }, [applySharedState, handleSharedStateError, remoteVersion])

  useEffect(() => {
    let shouldIgnore = false

    async function loadInitialSharedState() {
      try {
        const sharedState = await fetchSharedState()
        if (shouldIgnore) return

        if (sharedState === null) {
          setRemoteVersion(0)
          return
        }

        applySharedState(sharedState)
      } catch (error) {
        if (!shouldIgnore) handleSharedStateError(error)
      }
    }

    void loadInitialSharedState()

    return () => {
      shouldIgnore = true
    }
  }, [applySharedState, handleSharedStateError])

  useEffect(() => {
    writeStoredArray(HISTORY_STORAGE_KEY, historyGames)
  }, [historyGames])

  useEffect(() => {
    writeStoredArray(ROSTER_STORAGE_KEY, rosterPlayers)
  }, [rosterPlayers])

  useEffect(() => {
    storeActiveScreen(activeScreen)
  }, [activeScreen])

  const dismissUndoToast = useCallback((toastId: number) => {
    setDismissingUndoToastId(toastId)

    window.setTimeout(() => {
      setUndoToast((current) => (current?.id === toastId ? null : current))
      setDismissingUndoToastId((current) => (current === toastId ? null : current))
    }, 180)
  }, [])

  useEffect(() => {
    if (undoToast === null) return undefined

    const timeoutId = window.setTimeout(() => {
      dismissUndoToast(undoToast.id)
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [dismissUndoToast, undoToast])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeScreen])

  const computedPlayers = useMemo(() => buildPlayerStats(rosterPlayers, historyGames), [historyGames, rosterPlayers])
  const dashboardGames = useMemo(
    () => historyGames.filter((game) => toGameMonthValue(game.dateLabel) === selectedMonth),
    [historyGames, selectedMonth],
  )
  const dashboardPlayers = useMemo(
    () => buildPlayerStats(rosterPlayers, dashboardGames, { includeSeedStats: selectedMonth === seedStatsMonth }),
    [dashboardGames, rosterPlayers, selectedMonth],
  )
  const dashboardLeaderboard = useMemo(() => buildLeaderboard(dashboardPlayers), [dashboardPlayers])
  const dashboardSummaryStats = useMemo(
    () => buildDashboardSummary(dashboardGames, dashboardPlayers, dashboardLeaderboard),
    [dashboardGames, dashboardPlayers, dashboardLeaderboard],
  )
  const historyMonthValues = useMemo(
    () => historyGames.map((game) => toGameMonthValue(game.dateLabel)).filter((value): value is string => value !== null),
    [historyGames],
  )
  const monthOptions = useMemo(() => createMonthOptions(historyMonthValues), [historyMonthValues])
  const filteredHistoryGames = useMemo(
    () => historyGames.filter((game) => toGameMonthValue(game.dateLabel) === selectedMonth),
    [historyGames, selectedMonth],
  )

  const assignedPlayers = useMemo(
    () => new Set([...recordState.teamA, ...recordState.teamB]),
    [recordState.teamA, recordState.teamB],
  )

  const availablePlayers = useMemo(() => {
    const query = recordState.search.trim().toLowerCase()
    return rosterPlayers
      .filter((player) => player.isHiddenFromTeams !== true)
      .map((player) => player.name)
      .filter((player) => !assignedPlayers.has(player) && (query === '' || player.toLowerCase().includes(query)))
  }, [assignedPlayers, recordState.search, rosterPlayers])

  const playerMatchCounts = useMemo(
    () => new Map(computedPlayers.map((player) => [player.name, player.games])),
    [computedPlayers],
  )

  const filteredPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase()
    return computedPlayers.filter((player) => query === '' || player.name.toLowerCase().includes(query))
  }, [computedPlayers, playerQuery])

  const selectedPlayer = computedPlayers.find((player) => player.id === selectedPlayerId) ?? null
  const teamsEven = recordState.teamA.length === recordState.teamB.length
  const teamsFull = recordState.teamA.length === TEAM_SIZE && recordState.teamB.length === TEAM_SIZE
  const canSave = teamsEven && teamsFull && recordState.winner !== null

  const runProtectedAction = (title: string, onAllowed: () => void | Promise<void>) => {
    if (getStoredProtectedPassword()) {
      void onAllowed()
      return
    }

    setPendingProtectedAction({
      id: Date.now(),
      title,
      onAllowed,
    })
  }

  const unlockProtectedAction = (password: string) => {
    if (password.trim() === '' || pendingProtectedAction === null) return false

    storeProtectedAccess(password)
    const action = pendingProtectedAction.onAllowed
    setPendingProtectedAction(null)
    void action()
    return true
  }

  const openBlankRecorder = () => {
    setRecordState(createEmptyRecordState())
    setEditingGameId(null)
    setActiveScreen('record')
  }

  const navigateToScreen = (screen: NavKey) => {
    if (screen === 'record') {
      openBlankRecorder()
      return
    }

    setActiveScreen(screen)
  }

  const addPlayerToTeam = (playerName: string, team: Winner) => {
    setRecordState((current) => {
      const targetKey = team === 'A' ? 'teamA' : 'teamB'
      const targetTeam = current[targetKey]
      if (targetTeam.length >= TEAM_SIZE) return current
      if (current.teamA.includes(playerName) || current.teamB.includes(playerName)) return current
      return { ...current, [targetKey]: [...targetTeam, playerName] }
    })
  }

  const removePlayerFromTeam = (playerName: string, team: Winner) => {
    setRecordState((current) => {
      const targetKey = team === 'A' ? 'teamA' : 'teamB'
      return { ...current, [targetKey]: current[targetKey].filter((name) => name !== playerName) }
    })
  }

  const swapTeams = () => {
    setRecordState((current) => ({
      ...current,
      teamA: current.teamB,
      teamB: current.teamA,
      winner: current.winner === 'A' ? 'B' : current.winner === 'B' ? 'A' : null,
    }))
  }

  const loadGameIntoRecorder = (game: HistoryGame) => {
    setRecordState({
      dateValue: toDateValue(game.dateLabel),
      search: '',
      teamA: [...game.teamA],
      teamB: [...game.teamB],
      winner: game.winner,
    })
    setEditingGameId(game.id)
    setActiveScreen('record')
  }

  const saveGame = async () => {
    if (!canSave || isSyncing) return

    const originalGame = editingGameId === null ? null : historyGames.find((game) => game.id === editingGameId) ?? null
    const savedGame = createHistoryGame(recordState, historyGames, originalGame?.id)
    if (savedGame === null) return

    if (originalGame) {
      const nextHistoryGames = historyGames.map((game) => (game.id === originalGame.id ? savedGame : game))
      if ((await persistSharedState(nextHistoryGames, rosterPlayers)) === null) return

      setUndoToast({
        id: Date.now(),
        type: 'restore-updated',
        message: `Game #${savedGame.id} diperbarui`,
        actionLabel: 'Undo',
        game: originalGame,
      })
      setEditingGameId(null)
    } else {
      const nextHistoryGames = [savedGame, ...historyGames]
      if ((await persistSharedState(nextHistoryGames, rosterPlayers)) === null) return

      setUndoToast({
        id: Date.now(),
        type: 'remove-saved',
        message: 'Game tersimpan',
        actionLabel: 'Undo',
        gameId: savedGame.id,
      })
      setEditingGameId(null)
    }

    setActiveScreen('saved')
  }

  const removeGame = (gameId: number) => {
    runProtectedAction(`Hapus Game #${gameId}`, async () => {
      const restoreIndex = historyGames.findIndex((game) => game.id === gameId)
      const gameToRemove = historyGames[restoreIndex]
      if (!gameToRemove) return

      const nextHistoryGames = historyGames.filter((game) => game.id !== gameId)
      if ((await persistSharedState(nextHistoryGames, rosterPlayers)) === null) return

      setUndoToast({
        id: Date.now(),
        type: 'restore-deleted',
        message: `Game #${gameToRemove.id} dihapus`,
        actionLabel: 'Undo',
        game: gameToRemove,
        restoreIndex,
      })
    })
  }

  const undoLastAction = async () => {
    if (undoToast === null) return

    let nextHistoryGames = historyGames
    let nextScreen: NavKey = 'history'

    if (undoToast.type === 'remove-saved') {
      nextHistoryGames = historyGames.filter((game) => game.id !== undoToast.gameId)
      nextScreen = 'record'
    } else if (undoToast.type === 'restore-deleted') {
      if (!historyGames.some((game) => game.id === undoToast.game.id)) {
        const nextGames = [...historyGames]
        const boundedIndex = Math.min(Math.max(undoToast.restoreIndex, 0), nextGames.length)
        nextGames.splice(boundedIndex, 0, undoToast.game)
        nextHistoryGames = nextGames
      }
    } else {
      nextHistoryGames = historyGames.map((game) => (game.id === undoToast.game.id ? undoToast.game : game))
    }

    if ((await persistSharedState(nextHistoryGames, rosterPlayers)) === null) return

    setActiveScreen(nextScreen)
    setUndoToast(null)
  }

  const addPlayer = async () => {
    const trimmed = playerQuery.trim()
    if (!trimmed) return
    const id = trimmed.toLowerCase().replace(/\s+/g, '-')
    if (rosterPlayers.some((player) => player.id === id || player.name.toLowerCase() === trimmed.toLowerCase())) return

    const nextRosterPlayers = [{ id, name: trimmed }, ...rosterPlayers]
    if ((await persistSharedState(historyGames, nextRosterPlayers)) === null) return

    setSelectedPlayerId(id)
    setPlayerQuery('')
  }

  const runAddPlayer = () => {
    runProtectedAction('Tambah Pemain', addPlayer)
  }

  const renamePlayer = async (playerId: string, nextName: string) => {
    const trimmed = nextName.trim()
    if (!trimmed || isSyncing) return false

    const currentPlayer = rosterPlayers.find((player) => player.id === playerId)
    if (!currentPlayer) return false

    const currentName = currentPlayer.name
    if (currentName === trimmed) return true

    const duplicatePlayer = rosterPlayers.some((player) => (
      player.id !== playerId && player.name.toLowerCase() === trimmed.toLowerCase()
    ))
    if (duplicatePlayer) {
      toast.error('Nama pemain sudah ada.', { duration: 4000 })
      return false
    }

    const renameTeamPlayer = (name: string) => (name === currentName ? trimmed : name)
    const nextRosterPlayers = rosterPlayers.map((player) => (
      player.id === playerId ? { ...player, name: trimmed } : player
    ))
    const nextHistoryGames = historyGames.map((game) => ({
      ...game,
      teamA: game.teamA.map(renameTeamPlayer),
      teamB: game.teamB.map(renameTeamPlayer),
    }))

    return (await persistSharedState(nextHistoryGames, nextRosterPlayers)) !== null
  }

  const runRenamePlayer = (playerId: string, nextName: string) => renamePlayer(playerId, nextName)

  const setPlayerTeamVisibility = async (playerId: string, isHiddenFromTeams: boolean) => {
    if (isSyncing) return false

    const currentPlayer = rosterPlayers.find((player) => player.id === playerId)
    if (!currentPlayer) return false
    if ((currentPlayer.isHiddenFromTeams === true) === isHiddenFromTeams) return true

    const nextRosterPlayers = rosterPlayers.map((player) => (
      player.id === playerId ? { ...player, isHiddenFromTeams } : player
    ))

    return (await persistSharedState(historyGames, nextRosterPlayers)) !== null
  }

  const runSetPlayerTeamVisibility = (playerId: string, isHiddenFromTeams: boolean) => {
    const player = rosterPlayers.find((rosterPlayer) => rosterPlayer.id === playerId)
    const title = `${isHiddenFromTeams ? 'Sembunyikan' : 'Tampilkan'} ${player?.name ?? 'Pemain'}`
    runProtectedAction(title, async () => {
      await setPlayerTeamVisibility(playerId, isHiddenFromTeams)
    })
  }

  const copyLeaderboardImage = async () => {
    if (!imageExportRef.current || isCopyingImage) return

    setIsCopyingImage(true)
    try {
      const blob = await toBlob(imageExportRef.current, { pixelRatio: 2, cacheBust: true })
      if (!blob) throw new Error('Failed to generate leaderboard image')

      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Image clipboard is not supported in this browser')
      }

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast.success('Gambar klasemen tersalin.', { duration: 3000 })
    } catch {
      toast.error('Browser ini belum mengizinkan copy gambar. Coba dari Chrome atau Edge.', { duration: 5000 })
    } finally {
      setIsCopyingImage(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="desktop-sidebar sticky top-0 hidden h-screen border-r bg-card px-5 py-6 md:flex md:flex-col md:gap-8">
        <Brand compact />
        <Nav activeScreen={activeScreen} onNavigate={navigateToScreen} variant="side" />
      </aside>

      <main className="mx-auto w-full max-w-[430px] px-3.5 pb-28 pt-2 md:mx-0 md:max-w-5xl md:px-7 md:py-6">
        <header className="mb-2 flex h-11 items-center justify-center md:hidden">
          <Brand />
        </header>

        <div key={activeScreen} className="screen-motion">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              summaryStats={dashboardSummaryStats}
              leaderboardRows={dashboardLeaderboard.all}
              monthOptions={monthOptions}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onRecordNewGame={openBlankRecorder}
              onCopyImage={copyLeaderboardImage}
              isCopyingImage={isCopyingImage}
            />
          )}
          {activeScreen === 'record' && (
            <RecordScreen
              recordState={recordState}
              availablePlayers={availablePlayers}
              playerMatchCounts={playerMatchCounts}
              editingGameId={editingGameId}
              teamsFull={teamsFull}
              canSave={canSave && !isSyncing}
              onSearchChange={(search) => setRecordState((current) => ({ ...current, search }))}
              onDateChange={(dateValue) => setRecordState((current) => ({ ...current, dateValue }))}
              onAddPlayer={addPlayerToTeam}
              onRemovePlayer={removePlayerFromTeam}
              onSwapTeams={swapTeams}
              onWinnerChange={(winner) => setRecordState((current) => ({ ...current, winner }))}
              onSave={() => runProtectedAction(editingGameId === null ? 'Simpan Game' : 'Simpan Perubahan', saveGame)}
            />
          )}
          {activeScreen === 'saved' && (
            <SavedScreen recordState={recordState} onRecordAgain={openBlankRecorder} onViewLeaderboard={() => setActiveScreen('dashboard')} />
          )}
          {activeScreen === 'history' && (
            <HistoryScreen
              games={filteredHistoryGames}
              monthOptions={monthOptions}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onEdit={loadGameIntoRecorder}
              onRecordMore={openBlankRecorder}
              onRemove={removeGame}
            />
          )}
          {activeScreen === 'players' && (
            <PlayersScreen
              players={filteredPlayers}
              playerQuery={playerQuery}
              selectedPlayer={selectedPlayer}
              selectedPlayerId={selectedPlayerId}
              onSearchChange={setPlayerQuery}
              onSelectPlayer={setSelectedPlayerId}
              onAddPlayer={runAddPlayer}
              onRenamePlayer={runRenamePlayer}
              onSetPlayerTeamVisibility={runSetPlayerTeamVisibility}
              onProtectedAction={runProtectedAction}
            />
          )}
        </div>
      </main>

      {undoToast && (
        <UndoToastView
          message={undoToast.message}
          actionLabel={undoToast.actionLabel}
          onAction={undoLastAction}
          isDismissing={dismissingUndoToastId === undoToast.id}
          onDismiss={() => dismissUndoToast(undoToast.id)}
        />
      )}
      {pendingProtectedAction && (
        <PasswordGateDialog
          key={pendingProtectedAction.id}
          title={pendingProtectedAction.title}
          onUnlock={unlockProtectedAction}
          onCancel={() => setPendingProtectedAction(null)}
        />
      )}
      <LeaderboardImageExport exportRef={imageExportRef} players={dashboardPlayers} selectedMonth={selectedMonth} />

      <Nav activeScreen={activeScreen} onNavigate={navigateToScreen} variant="bottom" />
      <Toaster position="top-center" />
    </div>
  )
}

function PasswordGateDialog({ title, onUnlock, onCancel }: {
  title: string
  onUnlock: (password: string) => boolean
  onCancel: () => void
}) {
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (onUnlock(password)) return

    setHasError(true)
    setPassword('')
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-background/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="password-gate-title">
      <form className="grid w-full max-w-sm gap-4 rounded-3xl border bg-card p-5 shadow-xl" onSubmit={submitPassword}>
        <div className="grid gap-1">
          <h2 id="password-gate-title" className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">Masukkan password satu kali. Cloudflare akan memeriksanya saat menyimpan.</p>
        </div>
        <div className="grid gap-2">
          <Input
            autoFocus
            type="password"
            value={password}
            placeholder="Password"
            aria-invalid={hasError}
            onChange={(event) => {
              setPassword(event.target.value)
              setHasError(false)
            }}
          />
          {hasError && <p className="text-sm font-medium text-destructive">Password salah.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
          <Button type="submit">Buka</Button>
        </div>
      </form>
    </div>
  )
}

function UndoToastView({ message, actionLabel, isDismissing, onAction, onDismiss }: {
  message: string
  actionLabel: string
  isDismissing: boolean
  onAction: () => void
  onDismiss: () => void
}) {
  return (
    <div className={cn(
      'undo-toast fixed inset-x-3 bottom-[5.75rem] z-30 mx-auto flex max-w-[430px] items-center gap-3 rounded-3xl border bg-foreground px-4 py-3 text-background shadow-xl md:bottom-6 md:left-auto md:right-6 md:mx-0 md:w-96 md:max-w-none',
      isDismissing && 'is-dismissing',
    )} role="status" aria-live="polite">
      <span className="min-w-0 flex-1 text-sm font-medium">{message}</span>
      <Button type="button" variant="secondary" size="sm" className="h-8 rounded-2xl px-3" onClick={onAction}>
        {actionLabel}
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" className="text-background hover:bg-background/10 hover:text-background" aria-label="Tutup pesan" onClick={onDismiss}>
        x
      </Button>
    </div>
  )
}

function Nav({ activeScreen, onNavigate, variant }: { activeScreen: NavKey; onNavigate: (screen: NavKey) => void; variant: 'side' | 'bottom' }) {
  if (variant === 'bottom') {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-[430px] grid-cols-4 gap-1 border-t bg-background/95 px-3 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur md:hidden" aria-label="Navigasi utama">
        {navItems.map((item) => {
          const Icon = navIcon[item.id]

          return (
            <Button key={item.id} type="button" variant={activeScreen === item.id ? 'default' : 'ghost'} className="h-12 flex-col gap-0.5 rounded-2xl px-1 text-[10px] leading-none" data-active={activeScreen === item.id} onClick={() => onNavigate(item.id)}>
              <Icon />
              {item.label}
            </Button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
      {navItems.map((item) => {
        const Icon = navIcon[item.id]

        return (
          <Button key={item.id} type="button" variant={activeScreen === item.id ? 'default' : 'ghost'} className="justify-start rounded-2xl" onClick={() => onNavigate(item.id)}>
            <Icon data-icon="inline-start" />
            {item.label}
          </Button>
        )
      })}
    </nav>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand flex items-center justify-center md:justify-start" data-compact={compact ? 'true' : undefined}>
      <img
        src="/brand/biawak-kol-horizontal.webp"
        alt="Biawak Kol"
        className="brand-logo"
      />
    </div>
  )
}

function DashboardScreen({ summaryStats, leaderboardRows, monthOptions, selectedMonth, onMonthChange, onRecordNewGame, onCopyImage, isCopyingImage }: {
  summaryStats: SummaryStat[]
  leaderboardRows: LeaderboardRow[]
  monthOptions: MonthOption[]
  selectedMonth: string
  onMonthChange: (month: string) => void
  onRecordNewGame: () => void
  onCopyImage: () => void
  isCopyingImage: boolean
}) {
  return (
    <section className="grid gap-4 md:max-w-3xl">
      <div className="grid grid-cols-[1fr_1.1fr] gap-3 md:grid-cols-[1fr_12rem]">
        <Select value={selectedMonth} onValueChange={(value) => value && onMonthChange(value)} items={monthOptions}>
          <SelectTrigger className="h-11 w-full bg-card font-medium">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button type="button" className="h-11 grow" onClick={onRecordNewGame}>
            <PlusIcon data-icon="inline-start" />
            Catat Game Baru
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label={isCopyingImage ? 'Menyalin gambar klasemen' : 'Copy gambar klasemen'}
            disabled={isCopyingImage}
            onClick={onCopyImage}
          >
            <ImageIcon size={20} />
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-2">
        {summaryStats.map((item) => (
          <Card key={item.label} size="sm" className="min-h-24 justify-center rounded-2xl shadow-sm md:min-h-20 md:rounded-3xl">
            <CardContent className="grid gap-1.5 px-4 md:px-3">
              <span className="text-xs leading-tight text-muted-foreground md:text-[10px]">{item.label}</span>
              <strong className="text-2xl font-semibold tracking-normal text-foreground md:text-xl">{item.value}</strong>
            </CardContent>
          </Card>
        ))}
      </section>

      {leaderboardRows.length > 0 ? (
        <Card className="rounded-2xl py-2 shadow-sm md:rounded-3xl">
          <CardContent className="px-0">
            <LeaderboardTable rows={leaderboardRows} ranked animationKey={selectedMonth} />
          </CardContent>
        </Card>
      ) : (
        <Card className="min-h-44 place-items-center justify-center rounded-2xl text-center shadow-sm md:rounded-3xl">
          <CardHeader className="w-full">
            <CardTitle>Belum ada catatan game</CardTitle>
          </CardHeader>
          <CardContent className="w-full text-sm text-muted-foreground">Tidak ada statistik untuk {formatMonthLabel(selectedMonth)}.</CardContent>
        </Card>
      )}
    </section>
  )
}

function compareExportPlayers(left: PlayerCard, right: PlayerCard) {
  if (right.points !== left.points) return right.points - left.points

  const parseCoefficient = (value: string) => (
    value.startsWith('(') && value.endsWith(')')
      ? -Number(value.slice(1, -1))
      : Number(value)
  )
  const coefficientDiff = parseCoefficient(right.coefficient) - parseCoefficient(left.coefficient)
  if (coefficientDiff !== 0) return coefficientDiff

  const leftWinRate = left.games === 0 ? 0 : left.wins / left.games
  const rightWinRate = right.games === 0 ? 0 : right.wins / right.games
  if (rightWinRate !== leftWinRate) return rightWinRate - leftWinRate

  if (right.wins !== left.wins) return right.wins - left.wins

  return left.name.localeCompare(right.name)
}

const EXPORT_MAX_ROWS = 50

function buildExportRows(players: PlayerCard[]) {
  const minimumGames = getMinimumQualifiedGames(players)
  const qualified = players
    .filter((player) => player.games >= minimumGames && player.games > 0)
    .sort(compareExportPlayers)
  const unqualified = players
    .filter((player) => player.games < minimumGames)
    .sort((left, right) => {
      if (left.games === 0 && right.games > 0) return 1
      if (right.games === 0 && left.games > 0) return -1
      if (left.games === 0 && right.games === 0) return left.name.localeCompare(right.name)
      return compareExportPlayers(left, right)
    })

  return [...qualified, ...unqualified].slice(0, EXPORT_MAX_ROWS)
}

function LeaderboardImageExport({ players, selectedMonth, exportRef }: {
  players: PlayerCard[]
  selectedMonth: string
  exportRef: RefObject<HTMLDivElement | null>
}) {
  const exportRows = useMemo(() => buildExportRows(players), [players])
  const minimumGames = getMinimumQualifiedGames(players)
  const title = `KLASEMEN ${formatMonthLabel(selectedMonth).toUpperCase()} BIAWAK KOL GAMES`

  return (
    <div
      className="pointer-events-none fixed left-[-10000px] top-0"
      aria-hidden="true"
    >
      <div
        ref={exportRef}
        data-testid="leaderboard-image-export"
        className="relative w-[610px] overflow-hidden bg-white text-black"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <img
          src="/brand/biawak-kol-vertical.webp"
          alt=""
          className="absolute left-1/2 top-[52%] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-25"
        />
        <table className="relative z-10 w-full border-collapse text-[13px] leading-tight">
          <thead>
            <tr className="bg-[#ffff00] text-black">
              <th colSpan={8} className="border border-black px-1 py-1 text-center text-[22px] font-black uppercase">
                {title}
              </th>
            </tr>
            <tr className="bg-[#ffff00] text-black">
              <th className="w-[34px] border border-black px-1 py-1 text-center font-bold">NO</th>
              <th className="w-[110px] border border-black px-2 py-1 text-left font-bold">NAMA</th>
              <th className="w-[75px] border border-black px-1 py-1 text-center font-bold">JUMLAH<br />TANDING</th>
              <th className="w-[75px] border border-black px-1 py-1 text-center font-bold">JUMLAH<br />MENANG</th>
              <th className="w-[75px] border border-black px-1 py-1 text-center font-bold">JUMLAH<br />KALAH</th>
              <th className="w-[75px] border border-black px-1 py-1 text-center font-bold">JUMLAH<br />POIN</th>
              <th className="w-[75px] border border-black px-1 py-1 text-center font-bold">JUMLAH<br />KOEFISIEN</th>
              <th className="w-[90px] border border-black px-1 py-1 text-center font-bold">PERSENTASE<br />MENANG</th>
            </tr>
          </thead>
          <tbody>
            {exportRows.map((player, index) => {
              const isInactive = player.games === 0
              const isQualified = player.games >= minimumGames && player.games > 0
              const emptyValue = isInactive ? '-' : null

              return (
                <tr key={player.id} className={isQualified ? 'bg-transparent text-black' : 'bg-[#f8d7da] text-[#7f1d1d]'}>
                  <td className="border border-black px-1 py-1 text-right">{index + 1}</td>
                  <td className="border border-black px-2 py-1 text-left uppercase">{player.name}</td>
                  <td className="border border-black px-1 py-1 text-right">{emptyValue ?? player.games}</td>
                  <td className="border border-black px-1 py-1 text-right">{emptyValue ?? player.wins}</td>
                  <td className="border border-black px-1 py-1 text-right">{emptyValue ?? player.losses}</td>
                  <td className="border border-black px-1 py-1 text-right">{emptyValue ?? player.points}</td>
                  <td className="border border-black px-1 py-1 text-right">{emptyValue ?? player.coefficient}</td>
                  <td className="border border-black px-1 py-1 text-right">{player.winRate}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LeaderboardTable({ rows, ranked = false, animationKey }: { rows: LeaderboardRow[]; ranked?: boolean; animationKey?: string }) {
  return (
    <Table className="min-w-[390px] text-xs">
      <TableHeader>
        <TableRow>
          {ranked && <TableHead className="w-10 text-center">No</TableHead>}
          <TableHead>Pemain</TableHead>
          <TableHead>G</TableHead>
          <TableHead>M</TableHead>
          <TableHead>K</TableHead>
          <TableHead>Poin</TableHead>
          <TableHead>Koef</TableHead>
          <TableHead>Persentase</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody key={animationKey} className="leaderboard-motion-group">
        {rows.map((player, index) => {
          const rank = index + 1
          const nameCharacters = Array.from(player.name)
          const mobileName = nameCharacters.length > 8
            ? `${nameCharacters.slice(0, 8).join('')}…`
            : player.name
          const rankClassName = cn(
            'inline-grid h-7 min-w-7 place-items-center px-1.5 text-[11px] font-semibold tabular-nums',
            !player.isQualified && 'text-red-900',
            player.isQualified && rank === 1 && 'text-yellow-700',
            player.isQualified && rank === 2 && 'text-zinc-500',
            player.isQualified && rank === 3 && 'text-orange-700',
            player.isQualified && rank > 3 && 'text-foreground',
          )

          return (
            <TableRow
              key={player.name}
              className={cn(
                'leaderboard-row',
                !player.isQualified && 'bg-red-50 text-red-900 hover:bg-red-100',
              )}
              style={{ '--row-index': index } as CSSProperties}
            >
              {ranked && (
                <TableCell className="font-medium">
                  <span className={rankClassName}>{rank}</span>
                </TableCell>
              )}
              <TableCell>
                <span className="flex items-center gap-2 font-medium">
                  <PlayerAvatar name={player.name} seed={index} />
                  <span className="sm:hidden" title={player.name}>{mobileName}</span>
                  <span className="hidden sm:inline">{player.name}</span>
                </span>
              </TableCell>
              <TableCell>{player.games}</TableCell>
              <TableCell>{player.wins}</TableCell>
              <TableCell>{player.losses}</TableCell>
              <TableCell className="font-semibold">{player.points}</TableCell>
              <TableCell>{player.coefficient}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={cn(!player.isQualified && 'bg-red-100 text-red-900')}>
                  {player.winRate}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function RecordScreen({ recordState, availablePlayers, playerMatchCounts, editingGameId, teamsFull, canSave, onSearchChange, onDateChange, onAddPlayer, onRemovePlayer, onSwapTeams, onWinnerChange, onSave }: {
  recordState: RecordState
  availablePlayers: string[]
  playerMatchCounts: ReadonlyMap<string, number>
  editingGameId: number | null
  teamsFull: boolean
  canSave: boolean
  onSearchChange: (value: string) => void
  onDateChange: (value: string) => void
  onAddPlayer: (playerName: string, team: Winner) => void
  onRemovePlayer: (playerName: string, team: Winner) => void
  onSwapTeams: () => void
  onWinnerChange: (winner: Winner) => void
  onSave: () => void
}) {
  const [teamPickerPlayer, setTeamPickerPlayer] = useState<string | null>(null)
  const [playerSort, setPlayerSort] = useState<PlayerSort>('alphabetical')
  const teamAFull = recordState.teamA.length >= TEAM_SIZE
  const teamBFull = recordState.teamB.length >= TEAM_SIZE
  const sortedAvailablePlayers = useMemo(() => {
    return [...availablePlayers].sort((first, second) => {
      const alphabeticalOrder = first.localeCompare(second, 'id', { sensitivity: 'base' })
      if (playerSort === 'alphabetical') return alphabeticalOrder

      const matchDifference = (playerMatchCounts.get(second) ?? 0) - (playerMatchCounts.get(first) ?? 0)
      return matchDifference || alphabeticalOrder
    })
  }, [availablePlayers, playerMatchCounts, playerSort])

  const addPlayerAndClosePicker = (playerName: string, team: Winner) => {
    onAddPlayer(playerName, team)
    setTeamPickerPlayer(null)
  }

  return (
    <section className="grid gap-4 md:max-w-3xl">
      <h1 className="py-3 text-center font-heading text-lg font-semibold">
        {editingGameId === null ? 'Catat Game' : `Edit Game #${editingGameId}`}
      </h1>
      <div className="grid gap-2">
        <label htmlFor="game-date" className="px-1 text-sm font-semibold">Tanggal</label>
        <DatePicker id="game-date" value={recordState.dateValue} onChange={onDateChange} />
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-12 pl-10" value={recordState.search} placeholder="Cari pemain..." onChange={(event) => onSearchChange(event.target.value)} />
      </div>

      <section className="grid gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Pemain Tersedia</h2>
          <Select
            value={playerSort}
            onValueChange={(value) => {
              if (value === 'alphabetical' || value === 'matches') setPlayerSort(value)
            }}
            items={PLAYER_SORT_OPTIONS}
          >
            <SelectTrigger size="sm" className="w-24 border-border bg-background" aria-label="Urutkan pemain">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {PLAYER_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {sortedAvailablePlayers.map((player) => (
            teamPickerPlayer === player ? (
              <div key={player} className="flex h-11 min-w-0 overflow-hidden rounded-full border bg-background shadow-sm" aria-label={`Pilih tim untuk ${player}`}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-full min-w-0 flex-1 rounded-none border-r px-1 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                  disabled={teamAFull}
                  onClick={() => addPlayerAndClosePicker(player, 'A')}
                >
                  Tim A
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-full min-w-0 flex-1 rounded-none px-1 text-xs font-semibold text-chart-3 hover:bg-chart-3/10 hover:text-chart-3"
                  disabled={teamBFull}
                  onClick={() => addPlayerAndClosePicker(player, 'B')}
                >
                  Tim B
                </Button>
              </div>
            ) : (
              <Button
                key={player}
                type="button"
                variant="outline"
                className="h-11 w-full min-w-0 justify-start gap-2 rounded-full px-2 shadow-sm"
                aria-label={`Pilih ${player}`}
                onClick={() => setTeamPickerPlayer(player)}
              >
                <PlayerAvatar name={player} />
                <strong className="min-w-0 flex-1 truncate text-left text-sm font-medium">{player}</strong>
              </Button>
            )
          ))}
          {availablePlayers.length === 0 && (
            <p className="w-full rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada pemain yang tersedia.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-4 py-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-5">
        <TeamBox title="Tim A" tone="blue" players={recordState.teamA} teamSize={TEAM_SIZE} onRemove={(name) => onRemovePlayer(name, 'A')} />
        <div className="relative hidden w-px bg-border sm:block">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background text-muted-foreground shadow-none"
            aria-label="Tukar Tim A dan Tim B"
            onClick={onSwapTeams}
          >
            <ArrowLeftRight />
          </Button>
        </div>
        <div className="flex items-center gap-3 sm:hidden">
          <div className="h-px flex-1 bg-border" />
          <Button type="button" variant="outline" size="sm" className="rounded-xl text-muted-foreground" onClick={onSwapTeams}>
            <ArrowLeftRight /> Tukar tim
          </Button>
          <div className="h-px flex-1 bg-border" />
        </div>
        <TeamBox title="Tim B" tone="yellow" players={recordState.teamB} teamSize={TEAM_SIZE} onRemove={(name) => onRemovePlayer(name, 'B')} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Pemenang</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant={recordState.winner === 'A' ? 'default' : 'outline'} className="h-12" onClick={() => onWinnerChange('A')}>
            <TrophyIcon data-icon="inline-start" />
            Tim A
          </Button>
          <Button
            type="button"
            variant="outline"
            className={recordState.winner === 'B' ? 'h-12 bg-chart-3 text-white border-chart-3 hover:bg-chart-3/90 hover:text-white' : 'h-12'}
            onClick={() => onWinnerChange('B')}
          >
            <TrophyIcon data-icon="inline-start" />
            Tim B
          </Button>
        </div>
      </div>

      <p className={teamsFull ? 'text-sm font-medium text-primary' : 'text-sm font-medium text-destructive'}>{teamsFull ? 'Pemain lengkap. Siap disimpan!' : 'Pemain belum lengkap.'}</p>
      <Button type="button" className="h-11 w-full" disabled={!canSave} onClick={onSave}>
        <CheckIcon data-icon="inline-start" />
        {editingGameId === null ? 'Simpan Game' : 'Simpan Perubahan'}
      </Button>
    </section>
  )
}

function TeamBox({ title, tone, players, teamSize, onRemove }: { title: string; tone: 'blue' | 'yellow'; players: string[]; teamSize: number; onRemove: (name: string) => void }) {
  const toneClassName = tone === 'blue' ? 'text-primary' : 'text-chart-3'

  return (
    <section className="min-w-0">
      <header className="mb-3 flex items-center gap-2 px-1">
        <UserRound className={cn('size-5', toneClassName)} />
        <h3 className={cn('font-heading text-base font-semibold', toneClassName)}>{title}</h3>
        <span className="ml-auto rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {players.length}/{teamSize}
        </span>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-background">
        {players.map((player, index) => (
          <div key={player} className="flex min-h-11 items-center gap-2 border-b px-2.5 last:border-b-0">
            <GripVertical className="size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
            <PlayerAvatar name={player} seed={index} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{player}</span>
            <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg text-muted-foreground hover:text-foreground" aria-label={`Hapus ${player} dari ${title}`} onClick={() => onRemove(player)}>
              <X />
            </Button>
          </div>
        ))}
        {Array.from({ length: Math.max(teamSize - players.length, 0) }).map((_, index) => (
          <div key={index} className="flex min-h-11 items-center border-b px-3 text-sm text-muted-foreground/65 last:border-b-0">Slot kosong</div>
        ))}
      </div>
    </section>
  )
}

function SavedScreen({ recordState, onRecordAgain, onViewLeaderboard }: { recordState: RecordState; onRecordAgain: () => void; onViewLeaderboard: () => void }) {
  const winningPlayers = recordState.winner === 'A' ? recordState.teamA : recordState.teamB
  const losingPlayers = recordState.winner === 'A' ? recordState.teamB : recordState.teamA
  return (
    <section className="mx-auto grid max-w-xl gap-4 pt-5 text-center">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">OK</div>
      <h1 className="font-heading text-2xl font-semibold">Game tersimpan</h1>
      <p className="text-sm text-muted-foreground">Mantap! Statistik sudah diperbarui.</p>
      <div className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-2 text-left">
        <SavedTeam label="Tim Menang" title={recordState.winner === 'A' ? 'Tim A' : 'Tim B'} players={winningPlayers} winner />
        <div className="text-center text-sm font-semibold">VS</div>
        <SavedTeam label="Tim Kalah" title={recordState.winner === 'A' ? 'Tim B' : 'Tim A'} players={losingPlayers} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Pemenang" value="+3" tone="win" />
        <ScoreCard label="Kalah" value="-1" tone="loss" />
      </div>
      <Button type="button" className="h-11 w-full" onClick={onRecordAgain}>
        <PlusIcon data-icon="inline-start" />
        Catat Game Lagi
      </Button>
      <Button type="button" variant="outline" className="h-11 w-full" onClick={onViewLeaderboard}>
        <BarChartIcon data-icon="inline-start" />
        Lihat Ranking
      </Button>
    </section>
  )
}

function SavedTeam({ label, title, players, winner = false }: { label: string; title: string; players: string[]; winner?: boolean }) {
  return (
    <Card size="sm" className="min-h-44 rounded-3xl shadow-sm">
      <CardHeader>
        <Badge variant={winner ? 'default' : 'destructive'}>{label}</Badge>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 text-xs font-medium">
        {players.map((player) => <span key={player}>{player}</span>)}
      </CardContent>
    </Card>
  )
}

function ScoreCard({ label, value, tone }: { label: string; value: string; tone: 'win' | 'loss' }) {
  return (
    <Card size="sm" className="rounded-3xl text-center shadow-sm">
      <CardContent className="grid gap-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <strong className={tone === 'win' ? 'text-3xl font-semibold text-primary' : 'text-3xl font-semibold text-destructive'}>{value}</strong>
      </CardContent>
    </Card>
  )
}

function HistoryScreen({ games, monthOptions, selectedMonth, onMonthChange, onEdit, onRecordMore, onRemove }: {
  games: HistoryGame[]
  monthOptions: MonthOption[]
  selectedMonth: string
  onMonthChange: (month: string) => void
  onEdit: (game: HistoryGame) => void
  onRecordMore: () => void
  onRemove: (gameId: number) => void
}) {
  const [gamePendingDelete, setGamePendingDelete] = useState<HistoryGame | null>(null)

  const confirmDelete = () => {
    if (!gamePendingDelete) return

    const gameId = gamePendingDelete.id
    setGamePendingDelete(null)
    onRemove(gameId)
  }

  return (
    <section className="grid gap-4 md:max-w-3xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[12rem_1fr]">
        <Select value={selectedMonth} onValueChange={(value) => value && onMonthChange(value)} items={monthOptions}>
          <SelectTrigger className="h-11 w-full bg-card font-medium">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectGroup>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="whitespace-nowrap px-1 text-right text-xs font-medium text-muted-foreground md:text-left">
          {games.length} game di {formatMonthLabel(selectedMonth)}
        </p>
      </div>

      <div className="grid gap-3">
        {games.length === 0 && (
          <Card className="min-h-44 place-items-center justify-center rounded-3xl text-center shadow-sm">
            <CardHeader className="w-full">
              <CardTitle>Belum ada riwayat game</CardTitle>
            </CardHeader>
            <CardContent className="w-full text-sm text-muted-foreground">Tidak ada game untuk {formatMonthLabel(selectedMonth)}.</CardContent>
          </Card>
        )}
        {games.map((game) => (
          <Card key={game.id} size="sm" className="relative gap-0 overflow-hidden rounded-2xl py-0 shadow-sm md:grid md:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex items-center justify-between gap-3 bg-muted/35 px-4 py-3 md:flex-col md:items-start md:justify-center md:border-r md:px-6 md:py-5">
              <CardTitle className="font-semibold">Match {game.id}</CardTitle>
              <p className="text-xs font-medium text-muted-foreground">{game.dateShort}</p>
            </div>

            <div className="relative grid gap-4 px-4 py-4 pr-12 md:static md:px-6 md:py-5 md:pr-14">
              <CardAction className="absolute right-2 top-2">
                <Menu.Root>
                  <Menu.Trigger
                    className="inline-flex size-8 items-center justify-center outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                    aria-label={`Kelola Game #${game.id}`}
                  >
                    <EllipsisVertical className="size-4" />
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-[70] outline-none">
                      <Menu.Popup className="min-w-44 rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                        <Menu.Item className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted" onClick={() => onEdit(game)}>
                          <PencilIcon className="size-4" />
                          Edit
                        </Menu.Item>
                        <Menu.Item className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-destructive outline-none data-[highlighted]:bg-destructive/10" onClick={() => setGamePendingDelete(game)}>
                          <TrashIcon className="size-4" />
                          Hapus
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </CardAction>

              <div className="flex">
                <Badge variant={game.winner === 'A' ? 'default' : 'outline'} className={game.winner === 'A' ? 'gap-1.5' : 'gap-1.5 border-chart-3/20 bg-chart-3/10 text-chart-3'}>
                  <TrophyIcon className="size-3.5" />
                  Tim {game.winner} menang
                </Badge>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-3">
                <HistoryTeam title="Tim A" tone="green" players={game.teamA} />
                <span className="text-center font-heading text-base font-semibold">VS</span>
                <HistoryTeam title="Tim B" tone="yellow" players={game.teamB} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" className="mx-auto w-1/2 min-w-44" onClick={onRecordMore}>Catat game lainnya</Button>
      <AlertDialog.Root open={gamePendingDelete !== null} onOpenChange={(open) => !open && setGamePendingDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm" />
          <AlertDialog.Viewport className="fixed inset-0 z-[80] grid place-items-center px-4">
            <AlertDialog.Popup className="grid w-full max-w-sm gap-4 rounded-3xl border bg-card p-5 shadow-xl outline-none">
              <div className="grid gap-1">
                <AlertDialog.Title className="font-heading text-lg font-semibold">
                  Hapus Game #{gamePendingDelete?.id}?
                </AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-muted-foreground">
                  Game akan dihapus dari riwayat dan statistik akan diperbarui. Tindakan ini masih dapat di-undo.
                </AlertDialog.Description>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AlertDialog.Close render={<Button type="button" variant="outline" />}>Batal</AlertDialog.Close>
                <Button type="button" variant="destructive" onClick={confirmDelete}>Hapus</Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}

function HistoryTeam({ title, tone, players }: { title: string; tone: 'green' | 'yellow'; players: string[] }) {
  return (
    <div className="min-w-0">
      <h3 className={tone === 'green' ? 'text-xs font-semibold text-primary' : 'text-xs font-semibold text-chart-3'}>{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{players.join(', ')}</p>
    </div>
  )
}

function PlayersScreen({ players, playerQuery, selectedPlayer, selectedPlayerId, onSearchChange, onSelectPlayer, onAddPlayer, onRenamePlayer, onSetPlayerTeamVisibility, onProtectedAction }: {
  players: PlayerCard[]
  playerQuery: string
  selectedPlayer: PlayerCard | null
  selectedPlayerId: string | null
  onSearchChange: (value: string) => void
  onSelectPlayer: (playerId: string) => void
  onAddPlayer: () => void
  onRenamePlayer: (playerId: string, nextName: string) => Promise<boolean>
  onSetPlayerTeamVisibility: (playerId: string, isHiddenFromTeams: boolean) => void
  onProtectedAction: (title: string, onAllowed: () => void | Promise<void>) => void
}) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleSelectPlayer = (playerId: string) => {
    onSelectPlayer(playerId)
    setIsSheetOpen(true)
  }

  return (
    <section className="grid gap-4 md:max-w-3xl">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-12 pl-10" value={playerQuery} placeholder="Cari atau tambah pemain..." onChange={(event) => onSearchChange(event.target.value)} />
      </div>
      <Button type="button" className="h-11 w-full" onClick={onAddPlayer}>
        <PlusIcon data-icon="inline-start" />
        Tambah Pemain
      </Button>
      <div className="grid gap-3 md:grid-cols-2 md:items-start">
        <Card size="sm" className="rounded-3xl shadow-sm md:max-h-[calc(100dvh-13rem)] md:overflow-y-auto">
          <CardContent className="grid gap-2 md:pr-2">
            {players.map((player, index) => (
              <Button key={player.id} type="button" variant={selectedPlayerId === player.id ? 'default' : 'ghost'} className="h-auto min-h-12 justify-start rounded-2xl px-2 py-2 text-left" onClick={() => handleSelectPlayer(player.id)}>
                <PlayerAvatar name={player.name} seed={index} />
                <span className="grid">
                  <strong className="text-sm font-medium">{player.name}</strong>
                  <span className="text-xs opacity-80">{player.games} game - {player.winRate} menang</span>
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
        {selectedPlayer && (
          <div className="hidden md:block">
            <PlayerDetail key={selectedPlayer.id} player={selectedPlayer} onRenamePlayer={onRenamePlayer} onSetPlayerTeamVisibility={onSetPlayerTeamVisibility} onProtectedAction={onProtectedAction} />
          </div>
        )}
      </div>
      {selectedPlayer && (
        <PlayerDetailSheet open={isSheetOpen} player={selectedPlayer} onClose={() => setIsSheetOpen(false)} onRenamePlayer={onRenamePlayer} onSetPlayerTeamVisibility={onSetPlayerTeamVisibility} onProtectedAction={onProtectedAction} />
      )}
    </section>
  )
}

function PlayerDetail({ player, onRenamePlayer, onSetPlayerTeamVisibility, onProtectedAction }: {
  player: PlayerCard
  onRenamePlayer: (playerId: string, nextName: string) => Promise<boolean>
  onSetPlayerTeamVisibility: (playerId: string, isHiddenFromTeams: boolean) => void
  onProtectedAction: (title: string, onAllowed: () => void | Promise<void>) => void
}) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(player.name)
  const [isHideDialogOpen, setIsHideDialogOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditingName) return

    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [isEditingName])

  const startEditingName = () => {
    onProtectedAction('Edit Nama Pemain', () => {
      setDraftName(player.name)
      setIsEditingName(true)
    })
  }

  const saveName = async () => {
    const saved = await onRenamePlayer(player.id, draftName)
    if (saved) setIsEditingName(false)
  }

  const cancelEditingName = () => {
    setDraftName(player.name)
    setIsEditingName(false)
  }

  const changeTeamVisibility = () => {
    if (player.isHiddenFromTeams) {
      onSetPlayerTeamVisibility(player.id, false)
      return
    }

    setIsHideDialogOpen(true)
  }

  const hideFromTeamSelection = () => {
    setIsHideDialogOpen(false)
    onSetPlayerTeamVisibility(player.id, true)
  }

  return (
    <Card size="sm" className="rounded-3xl shadow-sm">
      <CardHeader className="grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar name={player.name} />
          {isEditingName ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                void saveName()
              }}
            >
              <Input
                ref={inputRef}
                className="h-9 flex-1 rounded-2xl px-3 font-heading text-lg font-semibold"
                value={draftName}
                aria-label="Nama pemain"
                onFocus={(event) => event.target.select()}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') cancelEditingName()
                }}
              />
              <Button type="submit" size="icon-sm" aria-label="Simpan nama pemain">
                <CheckIcon />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Batal edit nama pemain" onClick={cancelEditingName}>
                x
              </Button>
            </form>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <CardTitle className="min-w-0 truncate">{player.name}</CardTitle>
              {player.isHiddenFromTeams && <Badge variant="secondary">Disembunyikan</Badge>}
            </div>
          )}
        </div>
        {!isEditingName && (
          <CardAction>
            <Menu.Root>
              <Menu.Trigger
                className="inline-flex size-8 items-center justify-center rounded-2xl outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 data-[popup-open]:bg-muted"
                aria-label={`Kelola ${player.name}`}
              >
                <EllipsisVertical className="size-4" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-[70] outline-none">
                  <Menu.Popup className="min-w-52 rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none">
                    <Menu.Item className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted" onClick={startEditingName}>
                      <PencilIcon className="size-4" />
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      className={cn(
                        'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-muted',
                        !player.isHiddenFromTeams && 'text-destructive data-[highlighted]:bg-destructive/10'
                      )}
                      onClick={changeTeamVisibility}
                    >
                      {player.isHiddenFromTeams ? <EyeIcon className="size-4" /> : <EyeOff className="size-4" />}
                      {player.isHiddenFromTeams ? 'Tampilkan' : 'Sembunyikan'}
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          <ScoreMetric label="Game" value={player.games} />
          <ScoreMetric label="Menang" value={player.wins} tone="win" />
          <ScoreMetric label="Kalah" value={player.losses} tone="loss" />
          <ScoreMetric label="Poin" value={player.points} />
          <ScoreMetric label="Koef" value={player.coefficient} />
          <ScoreMetric label="Menang %" value={player.winRate} />
        </div>
        <div className="grid gap-2 text-left">
          <h3 className="text-sm font-semibold">Game Terakhir</h3>
          {player.recentGames.length === 0 && <p className="text-xs text-muted-foreground">Belum ada game.</p>}
          {player.recentGames.map((game) => (
            <div key={game.label} className="flex justify-between gap-3 rounded-2xl bg-muted px-3 py-2 text-xs">
              <span>{game.label}</span>
              <strong className={game.result.startsWith('+') ? 'text-primary' : 'text-destructive'}>{game.result}</strong>
            </div>
          ))}
        </div>
      </CardContent>
      <AlertDialog.Root open={isHideDialogOpen} onOpenChange={setIsHideDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm" />
          <AlertDialog.Viewport className="fixed inset-0 z-[80] grid place-items-center px-4">
            <AlertDialog.Popup className="grid w-full max-w-sm gap-4 rounded-3xl border bg-card p-5 shadow-xl outline-none">
              <div className="grid gap-1">
                <AlertDialog.Title className="font-heading text-lg font-semibold">
                  Sembunyikan {player.name}?
                </AlertDialog.Title>
                <AlertDialog.Description className="text-sm text-muted-foreground">
                  Pemain tidak akan muncul di pilihan tim. Riwayat game tetap tersimpan.
                </AlertDialog.Description>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <AlertDialog.Close render={<Button type="button" variant="outline" />}>Batal</AlertDialog.Close>
                <Button type="button" variant="destructive" onClick={hideFromTeamSelection}>Sembunyikan</Button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Card>
  )
}

function PlayerDetailSheet({ open, player, onClose, onRenamePlayer, onSetPlayerTeamVisibility, onProtectedAction }: {
  open: boolean
  player: PlayerCard
  onClose: () => void
  onRenamePlayer: (playerId: string, nextName: string) => Promise<boolean>
  onSetPlayerTeamVisibility: (playerId: string, isHiddenFromTeams: boolean) => void
  onProtectedAction: (title: string, onAllowed: () => void | Promise<void>) => void
}) {
  useEffect(() => {
    if (!open) return undefined

    const mobileQuery = window.matchMedia('(max-width: 767px)')
    if (!mobileQuery.matches) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('sheet-backdrop absolute inset-0 bg-background/70 backdrop-blur-sm', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'player-sheet absolute bottom-0 left-0 right-0 flex max-h-[85dvh] flex-col rounded-t-3xl border bg-card shadow-xl',
          open && 'is-open'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-sheet-title"
      >
        <button
          type="button"
          className="sticky top-0 z-10 flex w-full cursor-pointer items-center justify-center border-b bg-card px-4 py-3"
          aria-label="Tutup detail"
          onClick={onClose}
        >
          <div className="sheet-handle h-1.5 w-12 rounded-full bg-muted" />
        </button>
        <div className="overflow-y-auto p-4">
          <PlayerDetail key={player.id} player={player} onRenamePlayer={onRenamePlayer} onSetPlayerTeamVisibility={onSetPlayerTeamVisibility} onProtectedAction={onProtectedAction} />
        </div>
      </div>
    </div>
  )
}

function ScoreMetric({ label, value, tone }: { label: string; value: string | number; tone?: 'win' | 'loss' }) {
  const valueClassName = tone === 'win' ? 'text-primary' : tone === 'loss' ? 'text-destructive' : 'text-foreground'

  return (
    <div className="grid min-h-16 place-items-center gap-1 rounded-2xl bg-muted px-2 py-2 text-center">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <strong className={`text-lg font-semibold ${valueClassName}`}>{value}</strong>
    </div>
  )
}

function PlayerAvatar({ name, seed }: { name: string; seed?: number }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const tones = ['bg-primary text-primary-foreground', 'bg-chart-3 text-white', 'bg-chart-4 text-white', 'bg-chart-5 text-white', 'bg-foreground text-background']
  const toneSeed = seed ?? Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0)

  return (
    <ShadAvatar size="sm" className={tones[toneSeed % tones.length]}>
      <AvatarFallback className="bg-transparent text-[10px] font-semibold text-current">{initials}</AvatarFallback>
    </ShadAvatar>
  )
}

export default App
