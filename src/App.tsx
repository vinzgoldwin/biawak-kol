import { useEffect, useMemo, useState } from 'react'
import './index.css'
import {
  historySeed,
  navItems,
  playerDirectory,
  summaryStats as summaryStatsSeed,
  type HistoryGame,
  type LeaderboardRow,
  type NavKey,
  type PlayerCard,
} from './data'

type Winner = HistoryGame['winner']

type RecordState = {
  dateLabel: string
  teamSize: number
  search: string
  teamA: string[]
  teamB: string[]
  winner: Winner | null
}

type RosterPlayer = Pick<PlayerCard, 'id' | 'name'>

type PersistedAppState = {
  recordState: RecordState
  historyGames: HistoryGame[]
  rosterPlayers: RosterPlayer[]
  selectedPlayerId: string
}

type DashboardStat = {
  label: string
  value: string
}

const STORAGE_KEY = 'biawak-kol:app-state:v1'
const SEEDED_HISTORY_MAX_ID = Math.max(...historySeed.map((game) => game.id))
const SEEDED_TOTAL_GAMES = Number(summaryStatsSeed.find((item) => item.label === 'Total Game')?.value ?? historySeed.length)

const initialRecordState: RecordState = {
  dateLabel: '16 Juni 2026',
  teamSize: 5,
  search: '',
  teamA: ['Kevin', 'AAL', 'Agus', 'Johan', 'BG Frans'],
  teamB: ['Alun', 'Koyok', 'BG Hendra', 'Syaili', 'Hengki'],
  winner: 'A',
}

const navIcon: Record<NavKey, string> = {
  dashboard: 'H',
  record: '+',
  saved: 'V',
  history: '#',
  players: 'P',
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
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  October: 'Oct',
  December: 'Dec',
}

function App() {
  const [initialState] = useState(loadPersistedState)
  const [activeScreen, setActiveScreen] = useState<NavKey>('dashboard')
  const [recordState, setRecordState] = useState<RecordState>(initialState.recordState)
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>(initialState.historyGames)
  const [rosterPlayers, setRosterPlayers] = useState<RosterPlayer[]>(initialState.rosterPlayers)
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialState.selectedPlayerId)
  const [playerQuery, setPlayerQuery] = useState('')

  const players = useMemo(() => buildPlayerCards(rosterPlayers, historyGames), [historyGames, rosterPlayers])

  const assignedPlayers = useMemo(
    () => new Set([...recordState.teamA, ...recordState.teamB]),
    [recordState.teamA, recordState.teamB],
  )

  const availablePlayers = useMemo(() => {
    const query = recordState.search.trim().toLowerCase()
    return players.map((player) => player.name).filter((player) => !assignedPlayers.has(player) && (query === '' || player.toLowerCase().includes(query)))
  }, [assignedPlayers, players, recordState.search])

  const filteredPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase()
    return players.filter((player) => query === '' || player.name.toLowerCase().includes(query))
  }, [playerQuery, players])

  const leaderboardRows = useMemo(() => buildLeaderboardRows(players), [players])
  const leaderboardQualified = useMemo(() => leaderboardRows.filter((player) => player.games >= 5), [leaderboardRows])
  const leaderboardUnqualified = useMemo(() => leaderboardRows.filter((player) => player.games < 5), [leaderboardRows])
  const dashboardStats = useMemo(
    () => buildDashboardStats(historyGames, players, leaderboardRows),
    [historyGames, leaderboardRows, players],
  )

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? createEmptyPlayer({ id: 'kevin', name: 'Kevin' })
  const teamsEven = recordState.teamA.length === recordState.teamB.length
  const teamsFull = recordState.teamA.length === recordState.teamSize && recordState.teamB.length === recordState.teamSize
  const canSave = teamsEven && teamsFull && recordState.winner !== null

  useEffect(() => {
    persistState({
      recordState,
      historyGames,
      rosterPlayers,
      selectedPlayerId: selectedPlayer.id,
    })
  }, [historyGames, recordState, rosterPlayers, selectedPlayer.id])

  const addPlayerToTeam = (playerName: string, team: Winner) => {
    setRecordState((current) => {
      const targetKey = team === 'A' ? 'teamA' : 'teamB'
      const targetTeam = current[targetKey]
      if (targetTeam.length >= current.teamSize) return current
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
    setRecordState({
      dateLabel: game.dateLabel,
      teamSize: Math.max(game.teamA.length, game.teamB.length),
      search: '',
      teamA: [...game.teamA],
      teamB: [...game.teamB],
      winner: game.winner,
    })
    setActiveScreen('record')
  }

  const saveGame = () => {
    if (!canSave) return

    setHistoryGames((current) => [createHistoryGame(recordState, current), ...current])
    setActiveScreen('saved')
  }

  const addPlayer = () => {
    const trimmed = playerQuery.trim()
    if (!trimmed) return
    if (rosterPlayers.some((player) => hasSameName(player.name, trimmed))) return

    const id = createUniquePlayerId(trimmed, new Set(rosterPlayers.map((player) => player.id)))
    setRosterPlayers((current) => [{ id, name: trimmed }, ...current])
    setSelectedPlayerId(id)
    setPlayerQuery('')
  }

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Brand compact />
        <Nav activeScreen={activeScreen} onNavigate={setActiveScreen} variant="side" />
      </aside>

      <main className="app-main">
        <header className="mobile-topbar">
          <button type="button" className="icon-button" aria-label="Buka menu">Menu</button>
          <Brand />
          <button type="button" className="icon-button" aria-label="Notifikasi">Notif</button>
        </header>

        {activeScreen === 'dashboard' && (
          <DashboardScreen
            summaryStats={dashboardStats}
            leaderboardQualified={leaderboardQualified}
            leaderboardUnqualified={leaderboardUnqualified}
            onRecordNewGame={() => setActiveScreen('record')}
          />
        )}
        {activeScreen === 'record' && (
          <RecordScreen
            recordState={recordState}
            availablePlayers={availablePlayers}
            teamsEven={teamsEven}
            canSave={canSave}
            onSearchChange={(search) => setRecordState((current) => ({ ...current, search }))}
            onDateChange={(dateLabel) => setRecordState((current) => ({ ...current, dateLabel }))}
            onTeamSizeChange={(teamSize) =>
              setRecordState((current) => ({ ...current, teamSize, teamA: current.teamA.slice(0, teamSize), teamB: current.teamB.slice(0, teamSize) }))
            }
            onAddPlayer={addPlayerToTeam}
            onRemovePlayer={removePlayerFromTeam}
            onWinnerChange={(winner) => setRecordState((current) => ({ ...current, winner }))}
            onSave={saveGame}
          />
        )}
        {activeScreen === 'saved' && (
          <SavedScreen recordState={recordState} onRecordAgain={() => setActiveScreen('record')} onViewLeaderboard={() => setActiveScreen('dashboard')} />
        )}
        {activeScreen === 'history' && <HistoryScreen games={historyGames} onEdit={loadGameIntoRecorder} onRemove={(gameId) => setHistoryGames((current) => current.filter((game) => game.id !== gameId))} />}
        {activeScreen === 'players' && (
          <PlayersScreen
            players={filteredPlayers}
            playerQuery={playerQuery}
            selectedPlayer={selectedPlayer}
            selectedPlayerId={selectedPlayer.id}
            onSearchChange={setPlayerQuery}
            onSelectPlayer={setSelectedPlayerId}
            onAddPlayer={addPlayer}
          />
        )}
      </main>

      <Nav activeScreen={activeScreen} onNavigate={setActiveScreen} variant="bottom" />
    </div>
  )
}

function Nav({ activeScreen, onNavigate, variant }: { activeScreen: NavKey; onNavigate: (screen: NavKey) => void; variant: 'side' | 'bottom' }) {
  return (
    <nav className={variant === 'side' ? 'side-nav' : 'bottom-nav'} aria-label="Navigasi utama">
      {navItems.map((item) => (
        <button key={item.id} type="button" className={`${variant === 'side' ? 'nav-item' : 'bottom-nav-item'} ${activeScreen === item.id ? 'is-active' : ''}`} onClick={() => onNavigate(item.id)}>
          <span>{navIcon[item.id]}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'is-compact' : ''}`}>
      <div className="brand-logo"><span>BK</span></div>
      <div>
        <strong>Biawak<br />Kol Games</strong>
        {compact && <em>Klub Basket Santai</em>}
      </div>
    </div>
  )
}

function DashboardScreen({ summaryStats, leaderboardQualified, leaderboardUnqualified, onRecordNewGame }: { summaryStats: DashboardStat[]; leaderboardQualified: LeaderboardRow[]; leaderboardUnqualified: LeaderboardRow[]; onRecordNewGame: () => void }) {
  return (
    <section className="screen dashboard-screen">
      <div className="toolbar-card">
        <button type="button" className="select-pill">Juni 2026</button>
        <button type="button" className="primary-button" onClick={onRecordNewGame}>+ Catat Game Baru</button>
      </div>
      <section className="stat-grid">
        {summaryStats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong className={item.label === 'Persen Menang Terbaik' ? 'green-text' : ''}>{item.value}</strong>
          </article>
        ))}
      </section>
      <div className="chip-row">
        <button type="button" className="chip is-active">Semua Pemain</button>
        <button type="button" className="chip">Sudah Lolos</button>
        <button type="button" className="chip">Minimal 5 Game</button>
        <button type="button" className="chip">Urut: Poin</button>
      </div>
      <section className="card table-card"><LeaderboardTable rows={leaderboardQualified} ranked /></section>
      <section className="card table-card compact-card">
        <div className="section-title-row"><h2>Belum Lolos</h2><span>Minimal 5 game untuk masuk ranking</span></div>
        <LeaderboardTable rows={leaderboardUnqualified} />
      </section>
      <p className="footnote">Statistik otomatis dihitung dari game yang dicatat.</p>
    </section>
  )
}

function LeaderboardTable({ rows, ranked = false }: { rows: LeaderboardRow[]; ranked?: boolean }) {
  return (
    <div className="leaderboard-table" role="table">
      <div className="table-head" role="row">
        {ranked && <span>No</span>}
        <span>Pemain</span><span>G</span><span>M</span><span>K</span><span>Poin</span><span>Koef</span><span>M%</span>
      </div>
      {rows.map((player, index) => (
        <div key={player.name} className="table-row" role="row">
          {ranked && <strong>{index + 1}</strong>}
          <span className="table-player"><Avatar name={player.name} />{player.name}</span>
          <span>{player.games}</span><span>{player.wins}</span><span>{player.losses}</span><strong>{player.points}</strong><span>{player.coefficient}</span><span className="win-pill">{player.winRate}</span>
        </div>
      ))}
    </div>
  )
}

function RecordScreen({ recordState, availablePlayers, teamsEven, canSave, onSearchChange, onDateChange, onTeamSizeChange, onAddPlayer, onRemovePlayer, onWinnerChange, onSave }: {
  recordState: RecordState
  availablePlayers: string[]
  teamsEven: boolean
  canSave: boolean
  onSearchChange: (value: string) => void
  onDateChange: (value: string) => void
  onTeamSizeChange: (size: number) => void
  onAddPlayer: (playerName: string, team: Winner) => void
  onRemovePlayer: (playerName: string, team: Winner) => void
  onWinnerChange: (winner: Winner) => void
  onSave: () => void
}) {
  return (
    <section className="screen record-screen">
      <div className="page-title"><h1>Catat Game</h1></div>
      <div className="form-grid two-columns">
        <label className="field-card"><span>Tanggal</span><input value={recordState.dateLabel} onChange={(event) => onDateChange(event.target.value)} /></label>
        <label className="field-card"><span>Ukuran Tim</span><select value={recordState.teamSize} onChange={(event) => onTeamSizeChange(Number(event.target.value))}><option value={3}>3 v 3</option><option value={4}>4 v 4</option><option value={5}>5 v 5</option></select></label>
      </div>
      <label className="search-box"><span>Cari</span><input value={recordState.search} placeholder="Cari pemain..." onChange={(event) => onSearchChange(event.target.value)} /></label>
      <section className="available-section">
        <div className="section-title-row"><h2>Pemain Tersedia</h2><span>tap A atau B</span></div>
        <div className="player-pill-grid">
          {availablePlayers.map((player, index) => (
            <div key={player} className="assign-player-card">
              <Avatar name={player} seed={index} /><strong>{player}</strong>
              <div className="assign-mini-actions"><button type="button" onClick={() => onAddPlayer(player, 'A')}>A</button><button type="button" onClick={() => onAddPlayer(player, 'B')}>B</button></div>
            </div>
          ))}
        </div>
      </section>
      <div className="teams-grid">
        <TeamBox title="Tim A" tone="blue" players={recordState.teamA} teamSize={recordState.teamSize} onRemove={(name) => onRemovePlayer(name, 'A')} />
        <TeamBox title="Tim B" tone="red" players={recordState.teamB} teamSize={recordState.teamSize} onRemove={(name) => onRemovePlayer(name, 'B')} />
      </div>
      <section className="winner-card"><h2>Pemenang</h2><div className="winner-toggle"><button type="button" className={recordState.winner === 'A' ? 'is-active' : ''} onClick={() => onWinnerChange('A')}>Tim A</button><button type="button" className={recordState.winner === 'B' ? 'is-active' : ''} onClick={() => onWinnerChange('B')}>Tim B</button></div></section>
      <p className={`save-status ${teamsEven ? 'is-ready' : 'is-error'}`}>{teamsEven ? 'Jumlah pemain seimbang. Siap disimpan!' : 'Jumlah pemain belum seimbang. Benarkan tim dulu.'}</p>
      <button type="button" className="primary-button save-button" disabled={!canSave} onClick={onSave}>Simpan Game</button>
    </section>
  )
}

function TeamBox({ title, tone, players, teamSize, onRemove }: { title: string; tone: 'blue' | 'red'; players: string[]; teamSize: number; onRemove: (name: string) => void }) {
  return (
    <section className={`team-box ${tone}`}>
      <header><h2>{title}</h2><span>{players.length}</span></header>
      <div className="team-list">
        {players.map((player, index) => <button key={player} type="button" onClick={() => onRemove(player)}><Avatar name={player} seed={index} />{player}<span>x</span></button>)}
        {Array.from({ length: Math.max(teamSize - players.length, 0) }).map((_, index) => <div key={index} className="empty-slot">Slot kosong</div>)}
      </div>
    </section>
  )
}

function SavedScreen({ recordState, onRecordAgain, onViewLeaderboard }: { recordState: RecordState; onRecordAgain: () => void; onViewLeaderboard: () => void }) {
  const winningPlayers = recordState.winner === 'A' ? recordState.teamA : recordState.teamB
  const losingPlayers = recordState.winner === 'A' ? recordState.teamB : recordState.teamA
  return (
    <section className="screen saved-screen">
      <div className="success-icon">OK</div><h1>Game tersimpan</h1><p>Mantap! Statistik sudah diperbarui.</p>
      <div className="saved-match-card"><SavedTeam label="Tim Menang" title={recordState.winner === 'A' ? 'Tim A' : 'Tim B'} players={winningPlayers} winner /><div className="versus">VS</div><SavedTeam label="Tim Kalah" title={recordState.winner === 'A' ? 'Tim B' : 'Tim A'} players={losingPlayers} /></div>
      <div className="points-grid"><div><span>Pemenang</span><strong className="green-text">+3</strong></div><div><span>Kalah</span><strong className="red-text">-1</strong></div></div>
      <button type="button" className="primary-button save-button" onClick={onRecordAgain}>+ Catat Game Lagi</button>
      <button type="button" className="secondary-button save-button" onClick={onViewLeaderboard}>Lihat Ranking</button>
    </section>
  )
}

function SavedTeam({ label, title, players, winner = false }: { label: string; title: string; players: string[]; winner?: boolean }) {
  return <div className={`saved-team ${winner ? 'winner' : 'loser'}`}><span>{label}</span><h2>{title}</h2>{players.map((player) => <strong key={player}>{player}</strong>)}</div>
}

function HistoryScreen({ games, onEdit, onRemove }: { games: HistoryGame[]; onEdit: (game: HistoryGame) => void; onRemove: (gameId: number) => void }) {
  return (
    <section className="screen history-screen">
      <div className="tabs"><button className="is-active" type="button">Riwayat</button><button type="button">Pemain</button></div>
      <div className="history-list">
        {games.map((game) => <article key={game.id} className="history-card"><header><div><h2>Game #{game.id}</h2><span>{game.dateShort}</span></div><strong className={game.winner === 'A' ? 'winner-badge' : 'winner-badge red'}>Tim {game.winner} menang</strong></header><div className="history-teams"><div><h3>Tim A</h3><p>{game.teamA.join(', ')}</p></div><span>VS</span><div><h3>Tim B</h3><p>{game.teamB.join(', ')}</p></div></div><div className="history-actions"><button type="button" onClick={() => onEdit(game)}>Edit</button><button type="button" className="danger" onClick={() => onRemove(game.id)}>Hapus</button></div></article>)}
      </div>
      <button type="button" className="load-more">Muat game lainnya</button>
    </section>
  )
}

function PlayersScreen({ players, playerQuery, selectedPlayer, selectedPlayerId, onSearchChange, onSelectPlayer, onAddPlayer }: { players: PlayerCard[]; playerQuery: string; selectedPlayer: PlayerCard; selectedPlayerId: string; onSearchChange: (value: string) => void; onSelectPlayer: (playerId: string) => void; onAddPlayer: () => void }) {
  return (
    <section className="screen players-screen">
      <div className="tabs"><button type="button">Riwayat</button><button className="is-active" type="button">Pemain</button></div>
      <label className="search-box"><span>Cari</span><input value={playerQuery} placeholder="Cari atau tambah pemain..." onChange={(event) => onSearchChange(event.target.value)} /></label>
      <button type="button" className="primary-button save-button" onClick={onAddPlayer}>+ Tambah Pemain</button>
      <div className="players-layout"><section className="card player-list-card">{players.map((player, index) => <button key={player.id} type="button" className={`player-row ${selectedPlayerId === player.id ? 'is-active' : ''}`} onClick={() => onSelectPlayer(player.id)}><Avatar name={player.name} seed={index} /><div><strong>{player.name}</strong><span>{player.games} game - {player.winRate} menang</span></div><em>{player.active ? 'Aktif' : 'Baru'}</em></button>)}</section><PlayerDetail player={selectedPlayer} /></div>
    </section>
  )
}

function PlayerDetail({ player }: { player: PlayerCard }) {
  return <section className="card player-detail-card"><header><Avatar name={player.name} /><div><h2>{player.name}</h2><p>Statistik otomatis dihitung dari game yang dicatat.</p></div></header><div className="points-grid six"><div><span>Game</span><strong>{player.games}</strong></div><div><span>Menang</span><strong className="green-text">{player.wins}</strong></div><div><span>Kalah</span><strong className="red-text">{player.losses}</strong></div><div><span>Poin</span><strong>{player.points}</strong></div><div><span>Koef</span><strong>{player.coefficient}</strong></div><div><span>Menang %</span><strong>{player.winRate}</strong></div></div><div className="recent-games"><h3>Game Terakhir</h3>{player.recentGames.length === 0 && <p>Belum ada game.</p>}{player.recentGames.map((game) => <div key={game.label}><span>{game.label}</span><strong className={game.result.startsWith('M') ? 'green-text' : 'red-text'}>{game.result}</strong></div>)}</div></section>
}

function Avatar({ name, seed = 0 }: { name: string; seed?: number }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return <span className={`avatar avatar-${seed % 5}`}>{initials}</span>
}

function loadPersistedState(): PersistedAppState {
  const fallback = createFallbackState()
  if (typeof window === 'undefined') return fallback

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY)
    if (!rawState) return fallback

    const parsed = JSON.parse(rawState) as Partial<PersistedAppState> & { players?: unknown }
    const recordState = isRecordState(parsed.recordState) ? parsed.recordState : fallback.recordState
    const historyGames = Array.isArray(parsed.historyGames) && parsed.historyGames.every(isHistoryGame) ? parsed.historyGames : fallback.historyGames
    const rosterSource = Array.isArray(parsed.rosterPlayers) ? parsed.rosterPlayers : parsed.players
    const rosterPlayers = normalizeRosterPlayers(rosterSource, recordState, historyGames)
    const selectedPlayerId = typeof parsed.selectedPlayerId === 'string' && rosterPlayers.some((player) => player.id === parsed.selectedPlayerId)
      ? parsed.selectedPlayerId
      : rosterPlayers[0]?.id ?? fallback.selectedPlayerId

    return { recordState, historyGames, rosterPlayers, selectedPlayerId }
  } catch {
    return fallback
  }
}

function persistState(state: PersistedAppState) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota/private-mode failures; persistence is best-effort and the app should still work.
  }
}

function createFallbackState(): PersistedAppState {
  return {
    recordState: cloneRecordState(initialRecordState),
    historyGames: historySeed.map(cloneHistoryGame),
    rosterPlayers: playerDirectory.map(({ id, name }) => ({ id, name })),
    selectedPlayerId: playerDirectory[0]?.id ?? 'kevin',
  }
}

function cloneRecordState(recordState: RecordState): RecordState {
  return {
    ...recordState,
    teamA: [...recordState.teamA],
    teamB: [...recordState.teamB],
  }
}

function cloneHistoryGame(game: HistoryGame): HistoryGame {
  return {
    ...game,
    teamA: [...game.teamA],
    teamB: [...game.teamB],
  }
}

function normalizeRosterPlayers(source: unknown, recordState: RecordState, historyGames: HistoryGame[]): RosterPlayer[] {
  const sourcePlayers = Array.isArray(source) && source.some(isRosterPlayer) ? source.filter(isRosterPlayer) : playerDirectory
  const usedIds = new Set<string>()
  const usedNames = new Set<string>()
  const rosterPlayers: RosterPlayer[] = []

  sourcePlayers.forEach((player) => {
    const name = player.name.trim()
    if (!name || usedNames.has(name.toLowerCase())) return

    const id = createUniquePlayerId(name, usedIds, player.id)
    usedNames.add(name.toLowerCase())
    rosterPlayers.push({ id, name })
  })

  collectReferencedPlayerNames(recordState, historyGames).forEach((name) => {
    if (usedNames.has(name.toLowerCase())) return

    const id = createUniquePlayerId(name, usedIds)
    usedNames.add(name.toLowerCase())
    rosterPlayers.push({ id, name })
  })

  return rosterPlayers.length > 0 ? rosterPlayers : playerDirectory.map(({ id, name }) => ({ id, name }))
}

function collectReferencedPlayerNames(recordState: RecordState, historyGames: HistoryGame[]) {
  return [
    ...recordState.teamA,
    ...recordState.teamB,
    ...historyGames.flatMap((game) => [...game.teamA, ...game.teamB]),
  ].map((name) => name.trim()).filter(Boolean)
}

function isRecordState(value: unknown): value is RecordState {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<RecordState>
  return typeof candidate.dateLabel === 'string'
    && typeof candidate.teamSize === 'number'
    && [3, 4, 5].includes(candidate.teamSize)
    && typeof candidate.search === 'string'
    && Array.isArray(candidate.teamA)
    && candidate.teamA.every(isString)
    && Array.isArray(candidate.teamB)
    && candidate.teamB.every(isString)
    && (candidate.winner === null || isWinner(candidate.winner))
}

function isHistoryGame(value: unknown): value is HistoryGame {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<HistoryGame>
  return typeof candidate.id === 'number'
    && Number.isInteger(candidate.id)
    && typeof candidate.dateLabel === 'string'
    && typeof candidate.dateShort === 'string'
    && isWinner(candidate.winner)
    && Array.isArray(candidate.teamA)
    && candidate.teamA.every(isString)
    && Array.isArray(candidate.teamB)
    && candidate.teamB.every(isString)
}

function isRosterPlayer(value: unknown): value is RosterPlayer {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<RosterPlayer>
  return typeof candidate.id === 'string' && typeof candidate.name === 'string'
}

function isWinner(value: unknown): value is Winner {
  return value === 'A' || value === 'B'
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function buildPlayerCards(rosterPlayers: RosterPlayer[], historyGames: HistoryGame[]) {
  const usedIds = new Set(rosterPlayers.map((player) => player.id))
  const playersByName = new Map<string, PlayerCard>()

  rosterPlayers.forEach((rosterPlayer) => {
    playersByName.set(rosterPlayer.name.toLowerCase(), createSeededPlayerCard(rosterPlayer))
  })

  historyGames.forEach((game) => {
    [...game.teamA, ...game.teamB].forEach((name) => {
      const key = name.toLowerCase()
      if (playersByName.has(key)) return

      const id = createUniquePlayerId(name, usedIds)
      playersByName.set(key, createEmptyPlayer({ id, name }))
    })
  })

  historyGames
    .filter((game) => game.id > SEEDED_HISTORY_MAX_ID)
    .toSorted((first, second) => first.id - second.id)
    .forEach((game) => {
      const winningTeam = game.winner === 'A' ? game.teamA : game.teamB
      const losingTeam = game.winner === 'A' ? game.teamB : game.teamA

      winningTeam.forEach((name) => applyGameResult(playersByName, name, game, true, game.winner === 'A' ? 'Tim B' : 'Tim A'))
      losingTeam.forEach((name) => applyGameResult(playersByName, name, game, false, game.winner === 'A' ? 'Tim A' : 'Tim B'))
    })

  return Array.from(playersByName.values())
}

function createSeededPlayerCard(rosterPlayer: RosterPlayer): PlayerCard {
  const seedPlayer = playerDirectory.find((player) => player.id === rosterPlayer.id || hasSameName(player.name, rosterPlayer.name))
  if (!seedPlayer) return createEmptyPlayer(rosterPlayer)

  return {
    ...seedPlayer,
    id: rosterPlayer.id,
    name: rosterPlayer.name,
    recentGames: seedPlayer.recentGames.map((game) => ({ ...game })),
  }
}

function createEmptyPlayer(player: RosterPlayer): PlayerCard {
  return {
    ...player,
    active: false,
    games: 0,
    wins: 0,
    losses: 0,
    points: 0,
    coefficient: '0.00',
    winRate: '0%',
    recentGames: [],
  }
}

function applyGameResult(playersByName: Map<string, PlayerCard>, playerName: string, game: HistoryGame, didWin: boolean, opponentLabel: string) {
  const key = playerName.toLowerCase()
  const currentPlayer = playersByName.get(key)
  if (!currentPlayer) return

  const games = currentPlayer.games + 1
  const wins = currentPlayer.wins + (didWin ? 1 : 0)
  const losses = currentPlayer.losses + (didWin ? 0 : 1)
  const points = currentPlayer.points + (didWin ? 3 : -1)

  playersByName.set(key, {
    ...currentPlayer,
    active: true,
    games,
    wins,
    losses,
    points,
    coefficient: formatCoefficient(points, games),
    winRate: formatWinRate(wins, games),
    recentGames: [
      {
        label: `${game.dateShort} vs ${opponentLabel}`,
        result: didWin ? 'M +3' : 'K -1',
      },
      ...currentPlayer.recentGames,
    ].slice(0, 3),
  })
}

function buildLeaderboardRows(players: PlayerCard[]): LeaderboardRow[] {
  return players
    .map(({ name, games, wins, losses, points, coefficient, winRate }) => ({ name, games, wins, losses, points, coefficient, winRate }))
    .toSorted((first, second) => second.points - first.points || second.wins - first.wins || second.games - first.games || first.name.localeCompare(second.name))
}

function buildDashboardStats(historyGames: HistoryGame[], players: PlayerCard[], leaderboardRows: LeaderboardRow[]): DashboardStat[] {
  const totalGames = SEEDED_TOTAL_GAMES + historyGames.filter((game) => game.id > SEEDED_HISTORY_MAX_ID).length
  const topPlayer = leaderboardRows[0]?.name ?? '-'
  const bestWinRate = players.reduce((bestRate, player) => {
    if (player.games === 0) return bestRate
    return Math.max(bestRate, Math.round((player.wins / player.games) * 100))
  }, 0)

  return [
    { label: 'Total Game', value: String(totalGames) },
    { label: 'Pemain Aktif', value: String(players.filter((player) => player.active).length) },
    { label: 'Pemain Teratas', value: topPlayer },
    { label: 'Persen Menang Terbaik', value: `${bestWinRate}%` },
  ]
}

function createHistoryGame(recordState: RecordState, existingGames: HistoryGame[]): HistoryGame {
  return {
    id: Math.max(0, ...existingGames.map((game) => game.id)) + 1,
    dateLabel: recordState.dateLabel,
    dateShort: createDateShort(recordState.dateLabel),
    winner: recordState.winner ?? 'A',
    teamA: [...recordState.teamA],
    teamB: [...recordState.teamB],
  }
}

function createDateShort(dateLabel: string) {
  return dateLabel.split(' ').map((part) => monthShortNames[part] ?? part).join(' ')
}

function createUniquePlayerId(name: string, usedIds: Set<string>, preferredId?: string) {
  const baseId = slugify(preferredId || name) || 'player'
  let playerId = baseId
  let suffix = 2

  while (usedIds.has(playerId)) {
    playerId = `${baseId}-${suffix}`
    suffix += 1
  }

  usedIds.add(playerId)
  return playerId
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function hasSameName(firstName: string, secondName: string) {
  return firstName.trim().toLowerCase() === secondName.trim().toLowerCase()
}

function formatCoefficient(points: number, games: number) {
  return games === 0 ? '0.00' : (points / games).toFixed(2)
}

function formatWinRate(wins: number, games: number) {
  return games === 0 ? '0%' : `${Math.round((wins / games) * 100)}%`
}

export default App
