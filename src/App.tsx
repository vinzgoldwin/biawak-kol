import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
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
  type HistoryGame,
  type LeaderboardRow,
  type NavKey,
  type PlayerCard,
  type RosterPlayer,
} from './data'
import { NotebookPen } from 'lucide-react'
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
  UsersIcon,
  type IconComponent,
} from './icons'
import { fetchSharedState, saveSharedState, SharedStateError, type SharedState } from './remote-state'
import { buildDashboardSummary, buildLeaderboard, buildPlayerStats, type SummaryStat } from './stats'

type Winner = 'A' | 'B'

const TEAM_SIZE = 5
const HISTORY_STORAGE_KEY = 'biawak-kol.historyGames'
const ROSTER_STORAGE_KEY = 'biawak-kol.rosterPlayers'
const PROTECTED_PASSWORD_STORAGE_KEY = 'biawak-kol.protectedPassword'

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

  return typeof value.id === 'string' && typeof value.name === 'string'
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

function App() {
  const [activeScreen, setActiveScreen] = useState<NavKey>('dashboard')
  const [recordState, setRecordState] = useState<RecordState>(createEmptyRecordState)
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>(() => readStoredArray(HISTORY_STORAGE_KEY, historySeed, isHistoryGame))
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>(() => readStoredArray(ROSTER_STORAGE_KEY, playerDirectory, isRosterPlayer))
  const [selectedPlayerId, setSelectedPlayerId] = useState('kevin')
  const [playerQuery, setPlayerQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue)
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null)
  const [editingGameId, setEditingGameId] = useState<number | null>(null)
  const [pendingProtectedAction, setPendingProtectedAction] = useState<PendingProtectedAction | null>(null)
  const [imageCopyStatus, setImageCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [remoteVersion, setRemoteVersion] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const imageExportRef = useRef<HTMLDivElement>(null)

  const applySharedState = useCallback((sharedState: SharedState) => {
    setHistoryGames(sharedState.historyGames)
    setRosterPlayers(sharedState.rosterPlayers)
    setRemoteVersion(sharedState.version)
  }, [])

  const handleSharedStateError = useCallback((error: unknown) => {
    if (!(error instanceof SharedStateError)) return

    if (error.code === 'unauthorized') {
      clearProtectedAccess()
      return
    }

    if (error.code === 'conflict' && error.latestState) {
      applySharedState(error.latestState)
    }
  }, [applySharedState])

  const persistSharedState = useCallback(async (nextHistoryGames: HistoryGame[], nextRosterPlayers: RosterPlayer[]) => {
    const password = getStoredProtectedPassword()
    if (!password) return null

    setIsSyncing(true)
    try {
      const sharedState = await saveSharedState({
        password,
        expectedVersion: remoteVersion,
        historyGames: nextHistoryGames,
        rosterPlayers: nextRosterPlayers,
      })
      applySharedState(sharedState)
      return sharedState
    } catch (error) {
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
    if (undoToast === null) return undefined

    const timeoutId = window.setTimeout(() => {
      setUndoToast((current) => (current?.id === undoToast.id ? null : current))
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [undoToast])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeScreen])

  const computedPlayers = useMemo(() => buildPlayerStats(rosterPlayers, historyGames), [historyGames, rosterPlayers])
  const dashboardGames = useMemo(
    () => historyGames.filter((game) => toGameMonthValue(game.dateLabel) === selectedMonth),
    [historyGames, selectedMonth],
  )
  const dashboardPlayers = useMemo(() => buildPlayerStats(rosterPlayers, dashboardGames), [dashboardGames, rosterPlayers])
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
      .map((player) => player.name)
      .filter((player) => !assignedPlayers.has(player) && (query === '' || player.toLowerCase().includes(query)))
  }, [assignedPlayers, recordState.search, rosterPlayers])

  const filteredPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase()
    return computedPlayers.filter((player) => query === '' || player.name.toLowerCase().includes(query))
  }, [computedPlayers, playerQuery])

  const selectedPlayer = computedPlayers.find((player) => player.id === selectedPlayerId) ?? computedPlayers[0]
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
      runProtectedAction('Buka Catat Game', openBlankRecorder)
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

  const loadGameIntoRecorder = (game: HistoryGame) => {
    runProtectedAction(`Edit Game #${game.id}`, () => {
      setRecordState({
        dateValue: toDateValue(game.dateLabel),
        search: '',
        teamA: [...game.teamA],
        teamB: [...game.teamB],
        winner: game.winner,
      })
      setEditingGameId(game.id)
      setActiveScreen('record')
    })
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

  useEffect(() => {
    if (imageCopyStatus !== 'copied' && imageCopyStatus !== 'error') return undefined

    const timeoutId = window.setTimeout(() => setImageCopyStatus('idle'), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [imageCopyStatus])

  const copyLeaderboardImage = async () => {
    if (!imageExportRef.current || imageCopyStatus === 'copying') return

    setImageCopyStatus('copying')
    try {
      const blob = await toBlob(imageExportRef.current, { pixelRatio: 2, cacheBust: true })
      if (!blob) throw new Error('Failed to generate leaderboard image')

      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Image clipboard is not supported in this browser')
      }

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setImageCopyStatus('copied')
    } catch {
      setImageCopyStatus('error')
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

        {activeScreen === 'dashboard' && (
          <DashboardScreen
            summaryStats={dashboardSummaryStats}
            leaderboardRows={dashboardLeaderboard.all}
            monthOptions={monthOptions}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onRecordNewGame={() => runProtectedAction('Buka Catat Game', openBlankRecorder)}
            onCopyImage={copyLeaderboardImage}
            imageCopyStatus={imageCopyStatus}
          />
        )}
        {activeScreen === 'record' && (
          <RecordScreen
            recordState={recordState}
            availablePlayers={availablePlayers}
            editingGameId={editingGameId}
            teamsFull={teamsFull}
            canSave={canSave && !isSyncing}
            onSearchChange={(search) => setRecordState((current) => ({ ...current, search }))}
            onDateChange={(dateValue) => setRecordState((current) => ({ ...current, dateValue }))}
            onAddPlayer={addPlayerToTeam}
            onRemovePlayer={removePlayerFromTeam}
            onWinnerChange={(winner) => setRecordState((current) => ({ ...current, winner }))}
            onSave={saveGame}
          />
        )}
        {activeScreen === 'saved' && (
          <SavedScreen recordState={recordState} onRecordAgain={() => runProtectedAction('Buka Catat Game', openBlankRecorder)} onViewLeaderboard={() => setActiveScreen('dashboard')} />
        )}
        {activeScreen === 'history' && (
          <HistoryScreen
            games={filteredHistoryGames}
            monthOptions={monthOptions}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onEdit={loadGameIntoRecorder}
            onRecordMore={() => runProtectedAction('Buka Catat Game', openBlankRecorder)}
            onRemove={removeGame}
          />
        )}
        {activeScreen === 'players' && (
          <PlayersScreen
            players={filteredPlayers}
            playerQuery={playerQuery}
            selectedPlayer={selectedPlayer}
            selectedPlayerId={selectedPlayer.id}
            onSearchChange={setPlayerQuery}
            onSelectPlayer={setSelectedPlayerId}
            onAddPlayer={runAddPlayer}
          />
        )}
      </main>

      {undoToast && (
        <UndoToastView
          message={undoToast.message}
          actionLabel={undoToast.actionLabel}
          onAction={undoLastAction}
          onDismiss={() => setUndoToast(null)}
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

function UndoToastView({ message, actionLabel, onAction, onDismiss }: {
  message: string
  actionLabel: string
  onAction: () => void
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-x-3 bottom-[5.75rem] z-30 mx-auto flex max-w-[430px] items-center gap-3 rounded-3xl border bg-foreground px-4 py-3 text-background shadow-xl md:bottom-6 md:left-auto md:right-6 md:mx-0 md:w-96 md:max-w-none" role="status" aria-live="polite">
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

function DashboardScreen({ summaryStats, leaderboardRows, monthOptions, selectedMonth, onMonthChange, onRecordNewGame, onCopyImage, imageCopyStatus }: {
  summaryStats: SummaryStat[]
  leaderboardRows: LeaderboardRow[]
  monthOptions: MonthOption[]
  selectedMonth: string
  onMonthChange: (month: string) => void
  onRecordNewGame: () => void
  onCopyImage: () => void
  imageCopyStatus: 'idle' | 'copying' | 'copied' | 'error'
}) {
  return (
    <section className="grid gap-4 md:max-w-3xl">
      <div className="grid grid-cols-[1fr_1.1fr] gap-3 md:grid-cols-[1fr_12rem]">
        <Select value={selectedMonth} onValueChange={(value) => value && onMonthChange(value)} items={monthOptions}>
          <SelectTrigger className="h-11 w-full bg-card font-medium">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
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
            aria-label={imageCopyStatus === 'copying' ? 'Menyalin gambar klasemen' : 'Copy gambar klasemen'}
            disabled={imageCopyStatus === 'copying'}
            onClick={onCopyImage}
          >
            <ImageIcon size={20} />
          </Button>
        </div>
      </div>
      {imageCopyStatus !== 'idle' && (
        <p className={cn('px-1 text-xs font-medium', imageCopyStatus === 'error' ? 'text-destructive' : 'text-primary')} role="status" aria-live="polite">
          {imageCopyStatus === 'copying' && 'Menyalin gambar klasemen...'}
          {imageCopyStatus === 'copied' && 'Gambar klasemen tersalin.'}
          {imageCopyStatus === 'error' && 'Browser ini belum mengizinkan copy gambar. Coba dari Chrome atau Edge.'}
        </p>
      )}

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
            <LeaderboardTable rows={leaderboardRows} ranked />
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
  const active = players.filter((player) => player.games > 0).sort(compareExportPlayers)
  const inactive = players.filter((player) => player.games === 0).sort((left, right) => left.name.localeCompare(right.name))
  return [...active, ...inactive].slice(0, EXPORT_MAX_ROWS)
}

function LeaderboardImageExport({ players, selectedMonth, exportRef }: {
  players: PlayerCard[]
  selectedMonth: string
  exportRef: RefObject<HTMLDivElement | null>
}) {
  const exportRows = useMemo(() => buildExportRows(players), [players])
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
              const emptyValue = isInactive ? '-' : null

              return (
                <tr key={player.id} className="bg-transparent text-black">
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

function LeaderboardTable({ rows, ranked = false }: { rows: LeaderboardRow[]; ranked?: boolean }) {
  return (
    <Table className="min-w-[390px] text-xs">
      <TableHeader>
        <TableRow>
          {ranked && <TableHead className="w-10">No</TableHead>}
          <TableHead>Pemain</TableHead>
          <TableHead>G</TableHead>
          <TableHead>M</TableHead>
          <TableHead>K</TableHead>
          <TableHead>Poin</TableHead>
          <TableHead>Koef</TableHead>
          <TableHead>Persentase</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((player, index) => {
          const rank = index + 1
          const rankClassName = cn(
            'inline-grid h-7 min-w-7 place-items-center px-1.5 text-[11px] font-semibold tabular-nums',
            rank === 1 && 'text-yellow-700',
            rank === 2 && 'text-zinc-500',
            rank === 3 && 'text-orange-700',
            rank > 3 && 'text-foreground',
          )

          return (
            <TableRow key={player.name}>
              {ranked && (
                <TableCell className="font-medium">
                  <span className={rankClassName}>{rank}</span>
                </TableCell>
              )}
              <TableCell>
                <span className="flex items-center gap-2 font-medium"><PlayerAvatar name={player.name} />{player.name}</span>
              </TableCell>
              <TableCell>{player.games}</TableCell>
              <TableCell>{player.wins}</TableCell>
              <TableCell>{player.losses}</TableCell>
              <TableCell className="font-semibold">{player.points}</TableCell>
              <TableCell>{player.coefficient}</TableCell>
              <TableCell><Badge variant="secondary">{player.winRate}</Badge></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function RecordScreen({ recordState, availablePlayers, editingGameId, teamsFull, canSave, onSearchChange, onDateChange, onAddPlayer, onRemovePlayer, onWinnerChange, onSave }: {
  recordState: RecordState
  availablePlayers: string[]
  editingGameId: number | null
  teamsFull: boolean
  canSave: boolean
  onSearchChange: (value: string) => void
  onDateChange: (value: string) => void
  onAddPlayer: (playerName: string, team: Winner) => void
  onRemovePlayer: (playerName: string, team: Winner) => void
  onWinnerChange: (winner: Winner) => void
  onSave: () => void
}) {
  const [teamPickerPlayer, setTeamPickerPlayer] = useState<string | null>(null)
  const teamAFull = recordState.teamA.length >= TEAM_SIZE
  const teamBFull = recordState.teamB.length >= TEAM_SIZE

  const addPlayerAndClosePicker = (playerName: string, team: Winner) => {
    onAddPlayer(playerName, team)
    setTeamPickerPlayer(null)
  }

  return (
    <section className="grid gap-4 md:max-w-3xl">
      <h1 className="py-3 text-center font-heading text-lg font-semibold">
        {editingGameId === null ? 'Catat Game' : `Edit Game #${editingGameId}`}
      </h1>
      <Card size="sm" className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Tanggal</CardTitle>
        </CardHeader>
        <CardContent>
          <DatePicker value={recordState.dateValue} onChange={onDateChange} />
        </CardContent>
      </Card>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-12 pl-10" value={recordState.search} placeholder="Cari pemain..." onChange={(event) => onSearchChange(event.target.value)} />
      </div>

      <section className="grid gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Pemain Tersedia</h2>
          <span className="text-xs text-muted-foreground">tap pemain, lalu pilih tim</span>
        </div>
        <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
          {availablePlayers.map((player, index) => (
            <Card key={player} size="sm" className="relative min-h-20 rounded-3xl py-0 text-center shadow-sm">
              <CardContent className="grid h-full px-0">
                {teamPickerPlayer === player ? (
                  <div className="grid grid-cols-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-20 rounded-none border-r border-border text-xs font-semibold text-primary hover:bg-primary/10"
                      disabled={teamAFull}
                      onClick={() => addPlayerAndClosePicker(player, 'A')}
                    >
                      Tim A
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-20 rounded-none text-xs font-semibold text-chart-3 hover:bg-chart-3/10"
                      disabled={teamBFull}
                      onClick={() => addPlayerAndClosePicker(player, 'B')}
                    >
                      Tim B
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="grid h-20 w-full justify-items-center gap-1 rounded-3xl px-1 py-3 text-center"
                    onClick={() => setTeamPickerPlayer(player)}
                  >
                    <PlayerAvatar name={player} seed={index} />
                    <strong className="max-w-full truncate text-xs font-medium">{player}</strong>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <TeamBox title="Tim A" tone="blue" players={recordState.teamA} teamSize={TEAM_SIZE} onRemove={(name) => onRemovePlayer(name, 'A')} />
        <TeamBox title="Tim B" tone="yellow" players={recordState.teamB} teamSize={TEAM_SIZE} onRemove={(name) => onRemovePlayer(name, 'B')} />
      </div>

      <Card size="sm" className="rounded-3xl shadow-sm">
        <CardHeader>
          <CardTitle>Pemenang</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button type="button" variant={recordState.winner === 'A' ? 'default' : 'outline'} className="h-12" onClick={() => onWinnerChange('A')}>Tim A</Button>
          <Button
            type="button"
            variant="outline"
            className={recordState.winner === 'B' ? 'h-12 bg-chart-3 text-white border-chart-3 hover:bg-chart-3/90 hover:text-white' : 'h-12'}
            onClick={() => onWinnerChange('B')}
          >
            Tim B
          </Button>
        </CardContent>
      </Card>

      <p className={teamsFull ? 'text-sm font-medium text-primary' : 'text-sm font-medium text-destructive'}>{teamsFull ? 'Pemain lengkap. Siap disimpan!' : 'Pemain belum lengkap.'}</p>
      <Button type="button" className="h-11 w-full" disabled={!canSave} onClick={onSave}>
        <CheckIcon data-icon="inline-start" />
        {editingGameId === null ? 'Simpan Game' : 'Simpan Perubahan'}
      </Button>
    </section>
  )
}

function TeamBox({ title, tone, players, teamSize, onRemove }: { title: string; tone: 'blue' | 'yellow'; players: string[]; teamSize: number; onRemove: (name: string) => void }) {
  return (
    <Card size="sm" className="rounded-3xl shadow-sm">
      <CardHeader>
        <CardTitle className={tone === 'blue' ? 'text-primary' : 'text-chart-3'}>{title}</CardTitle>
        <CardAction><Badge variant="secondary">{players.length}</Badge></CardAction>
      </CardHeader>
      <CardContent className="grid gap-2">
        {players.map((player, index) => (
          <Button key={player} type="button" variant="outline" className="h-auto min-h-9 justify-start rounded-2xl px-2 py-1 text-left text-xs" onClick={() => onRemove(player)}>
            <PlayerAvatar name={player} seed={index} />
            <span className="truncate">{player}</span>
            <span className="ml-auto text-muted-foreground">x</span>
          </Button>
        ))}
        {Array.from({ length: Math.max(teamSize - players.length, 0) }).map((_, index) => (
          <div key={index} className="flex min-h-9 items-center rounded-2xl border border-dashed px-3 text-xs text-muted-foreground">Slot kosong</div>
        ))}
      </CardContent>
    </Card>
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
  return (
    <section className="grid gap-4 md:max-w-3xl">
      <div className="grid gap-2 md:grid-cols-[12rem_1fr] md:items-center">
        <Select value={selectedMonth} onValueChange={(value) => value && onMonthChange(value)} items={monthOptions}>
          <SelectTrigger className="h-11 w-full bg-card font-medium">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="px-1 text-xs font-medium text-muted-foreground">
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
          <Card key={game.id} size="sm" className="rounded-3xl shadow-sm">
            <CardHeader>
              <div>
                <CardTitle>Game #{game.id}</CardTitle>
                <p className="text-xs text-muted-foreground">{game.dateShort}</p>
              </div>
              <CardAction>
                <Badge variant={game.winner === 'A' ? 'default' : 'outline'} className={game.winner === 'A' ? '' : 'bg-chart-3/10 text-chart-3 border-chart-3/20'}>Tim {game.winner} menang</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-[1fr_1.75rem_1fr] items-center gap-2">
                <HistoryTeam title="Tim A" tone="blue" players={game.teamA} />
                <span className="text-center text-xs font-semibold">VS</span>
                <HistoryTeam title="Tim B" tone="yellow" players={game.teamB} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(game)}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => onRemove(game.id)}>
                  <TrashIcon data-icon="inline-start" />
                  Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button type="button" variant="outline" className="mx-auto w-1/2 min-w-44" onClick={onRecordMore}>Catat game lainnya</Button>
    </section>
  )
}

function HistoryTeam({ title, tone, players }: { title: string; tone: 'blue' | 'yellow'; players: string[] }) {
  return (
    <div>
      <h3 className={tone === 'blue' ? 'text-xs font-semibold text-primary' : 'text-xs font-semibold text-chart-3'}>{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{players.join(', ')}</p>
    </div>
  )
}

function PlayersScreen({ players, playerQuery, selectedPlayer, selectedPlayerId, onSearchChange, onSelectPlayer, onAddPlayer }: { players: PlayerCard[]; playerQuery: string; selectedPlayer: PlayerCard; selectedPlayerId: string; onSearchChange: (value: string) => void; onSelectPlayer: (playerId: string) => void; onAddPlayer: () => void }) {
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
        <Card size="sm" className="rounded-3xl shadow-sm">
          <CardContent className="grid gap-2">
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
        <div className="hidden md:block">
          <PlayerDetail player={selectedPlayer} />
        </div>
      </div>
      <PlayerDetailSheet open={isSheetOpen} player={selectedPlayer} onClose={() => setIsSheetOpen(false)} />
    </section>
  )
}

function PlayerDetail({ player }: { player: PlayerCard }) {
  return (
    <Card size="sm" className="rounded-3xl shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <PlayerAvatar name={player.name} />
          <CardTitle>{player.name}</CardTitle>
        </div>
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
    </Card>
  )
}

function PlayerDetailSheet({ open, player, onClose }: { open: boolean; player: PlayerCard; onClose: () => void }) {
  useEffect(() => {
    if (!open) return undefined

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className={cn('fixed inset-0 z-50 md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 flex max-h-[85dvh] flex-col rounded-t-3xl border bg-card shadow-xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
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
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </button>
        <div className="overflow-y-auto p-4">
          <PlayerDetail player={player} />
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

function PlayerAvatar({ name, seed = 0 }: { name: string; seed?: number }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const tones = ['bg-primary text-primary-foreground', 'bg-chart-3 text-white', 'bg-chart-4 text-white', 'bg-chart-5 text-white', 'bg-foreground text-background']

  return (
    <ShadAvatar size="sm" className={tones[seed % tones.length]}>
      <AvatarFallback className="bg-transparent text-[10px] font-semibold text-current">{initials}</AvatarFallback>
    </ShadAvatar>
  )
}

export default App
