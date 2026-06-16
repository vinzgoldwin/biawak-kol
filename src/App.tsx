import { useMemo, useState } from 'react'
import './index.css'
import {
  historySeed,
  leaderboardQualified,
  leaderboardUnqualified,
  navItems,
  playerDirectory,
  recordPool,
  summaryStats,
  type HistoryGame,
  type NavKey,
  type PlayerCard,
} from './data'

type Winner = 'A' | 'B'

type RecordState = {
  dateLabel: string
  teamSize: number
  search: string
  teamA: string[]
  teamB: string[]
  winner: Winner | null
}

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

function App() {
  const [activeScreen, setActiveScreen] = useState<NavKey>('dashboard')
  const [recordState, setRecordState] = useState<RecordState>(initialRecordState)
  const [historyGames, setHistoryGames] = useState(historySeed)
  const [players, setPlayers] = useState(playerDirectory)
  const [selectedPlayerId, setSelectedPlayerId] = useState('kevin')
  const [playerQuery, setPlayerQuery] = useState('')

  const assignedPlayers = useMemo(
    () => new Set([...recordState.teamA, ...recordState.teamB]),
    [recordState.teamA, recordState.teamB],
  )

  const availablePlayers = useMemo(() => {
    const query = recordState.search.trim().toLowerCase()
    return recordPool.filter((player) => !assignedPlayers.has(player) && (query === '' || player.toLowerCase().includes(query)))
  }, [assignedPlayers, recordState.search])

  const filteredPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase()
    return players.filter((player) => query === '' || player.name.toLowerCase().includes(query))
  }, [playerQuery, players])

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0]
  const teamsEven = recordState.teamA.length === recordState.teamB.length
  const teamsFull = recordState.teamA.length === recordState.teamSize && recordState.teamB.length === recordState.teamSize
  const canSave = teamsEven && teamsFull && recordState.winner !== null

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
    if (canSave) setActiveScreen('saved')
  }

  const addPlayer = () => {
    const trimmed = playerQuery.trim()
    if (!trimmed) return
    const id = trimmed.toLowerCase().replace(/\s+/g, '-')
    if (players.some((player) => player.id === id)) return

    const nextPlayer: PlayerCard = {
      id,
      name: trimmed,
      active: false,
      games: 0,
      wins: 0,
      losses: 0,
      points: 0,
      coefficient: '0.00',
      winRate: '0%',
      recentGames: [],
    }

    setPlayers((current) => [nextPlayer, ...current])
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

        {activeScreen === 'dashboard' && <DashboardScreen onRecordNewGame={() => setActiveScreen('record')} />}
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

function DashboardScreen({ onRecordNewGame }: { onRecordNewGame: () => void }) {
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

function LeaderboardTable({ rows, ranked = false }: { rows: typeof leaderboardQualified; ranked?: boolean }) {
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
      <div className="players-layout"><section className="card player-list-card">{players.map((player, index) => <button key={player.id} type="button" className={`player-row ${selectedPlayerId === player.id ? 'is-active' : ''}`} onClick={() => onSelectPlayer(player.id)}><Avatar name={player.name} seed={index} /><div><strong>{player.name}</strong><span>{player.games} game - {player.winRate} menang</span></div></button>)}</section><PlayerDetail player={selectedPlayer} /></div>
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

export default App
