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

    return recordPool.filter((player) => {
      if (assignedPlayers.has(player)) return false
      return query.length === 0 || player.toLowerCase().includes(query)
    })
  }, [assignedPlayers, recordState.search])

  const filteredPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase()

    return players.filter((player) => {
      return query.length === 0 || player.name.toLowerCase().includes(query)
    })
  }, [playerQuery, players])

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? players[0]

  const teamsEven = recordState.teamA.length === recordState.teamB.length
  const teamsFull =
    recordState.teamA.length === recordState.teamSize &&
    recordState.teamB.length === recordState.teamSize
  const canSave = teamsEven && teamsFull && recordState.winner !== null

  const addPlayerToTeam = (playerName: string, team: Winner) => {
    setRecordState((current) => {
      const targetKey = team === 'A' ? 'teamA' : 'teamB'
      const nextTeam = current[targetKey]

      if (nextTeam.length >= current.teamSize) return current
      if (current.teamA.includes(playerName) || current.teamB.includes(playerName)) {
        return current
      }

      return {
        ...current,
        [targetKey]: [...nextTeam, playerName],
      }
    })
  }

  const removePlayerFromTeam = (playerName: string, team: Winner) => {
    setRecordState((current) => {
      const targetKey = team === 'A' ? 'teamA' : 'teamB'

      return {
        ...current,
        [targetKey]: current[targetKey].filter((name) => name !== playerName),
      }
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
    setActiveScreen('saved')
  }

  const addPlayer = () => {
    const trimmed = playerQuery.trim()

    if (trimmed.length === 0) return

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
      <aside className="desktop-nav">
        <div className="brand-lockup">
          <span className="brand-mark">BK</span>
          <div>
            <p className="eyebrow">Casual Club Tracker</p>
            <h1>Biawak Kol Games</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-button ${activeScreen === item.id ? 'is-active' : ''}`}
              onClick={() => setActiveScreen(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        {activeScreen === 'dashboard' && (
          <DashboardScreen onRecordNewGame={() => setActiveScreen('record')} />
        )}

        {activeScreen === 'record' && (
          <RecordScreen
            recordState={recordState}
            availablePlayers={availablePlayers}
            onSearchChange={(value) =>
              setRecordState((current) => ({ ...current, search: value }))
            }
            onDateChange={(value) =>
              setRecordState((current) => ({ ...current, dateLabel: value }))
            }
            onTeamSizeChange={(size) =>
              setRecordState((current) => ({
                ...current,
                teamSize: size,
                teamA: current.teamA.slice(0, size),
                teamB: current.teamB.slice(0, size),
                winner: current.winner,
              }))
            }
            onAddPlayer={addPlayerToTeam}
            onRemovePlayer={removePlayerFromTeam}
            onWinnerChange={(winner) =>
              setRecordState((current) => ({ ...current, winner }))
            }
            onSave={saveGame}
            teamsEven={teamsEven}
            canSave={canSave}
          />
        )}

        {activeScreen === 'saved' && (
          <SavedScreen
            winner={recordState.winner ?? 'A'}
            onRecordAgain={() => setActiveScreen('record')}
            onViewLeaderboard={() => setActiveScreen('dashboard')}
          />
        )}

        {activeScreen === 'history' && (
          <HistoryScreen
            games={historyGames}
            onEdit={loadGameIntoRecorder}
            onDelete={(gameId) =>
              setHistoryGames((current) => current.filter((game) => game.id !== gameId))
            }
          />
        )}

        {activeScreen === 'players' && (
          <PlayersScreen
            players={filteredPlayers}
            playerQuery={playerQuery}
            selectedPlayerId={selectedPlayer.id}
            onSearchChange={setPlayerQuery}
            onSelectPlayer={setSelectedPlayerId}
            onAddPlayer={addPlayer}
            selectedPlayer={selectedPlayer}
          />
        )}
      </main>

      <nav className="mobile-nav" aria-label="Bottom navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-button ${activeScreen === item.id ? 'is-active' : ''}`}
            onClick={() => setActiveScreen(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function DashboardScreen({
  onRecordNewGame,
}: {
  onRecordNewGame: () => void
}) {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Season Leaderboard</p>
          <h2>Biawak Kol Games</h2>
        </div>

        <div className="header-actions">
          <button type="button" className="season-pill">
            Juni 2026
          </button>
          <button type="button" className="primary-button" onClick={onRecordNewGame}>
            + Record New Game
          </button>
        </div>
      </div>

      <div className="summary-grid">
        {summaryStats.map((item) => (
          <article key={item.label} className="summary-card">
            <span className="summary-label">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="chip-row">
        <button type="button" className="filter-chip is-active">
          All Players
        </button>
        <button type="button" className="filter-chip">
          Qualified Only
        </button>
        <button type="button" className="filter-chip">
          Minimum 5 Games
        </button>
        <button type="button" className="filter-chip">
          Sort: Points
        </button>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Leaderboard</h3>
            <p>Sorted by points, coefficient, win rate, then total games.</p>
          </div>
        </div>

        <div className="leaderboard-list">
          {leaderboardQualified.map((player, index) => (
            <article
              key={player.name}
              className={`leaderboard-row ${index === 0 ? 'is-top-rank' : ''}`}
            >
              <div className="player-heading">
                <span className="rank-pill">#{index + 1}</span>
                <div>
                  <strong>{player.name}</strong>
                  <span>
                    {player.games} games · {player.wins}W {player.losses}L
                  </span>
                </div>
              </div>

              <div className="row-stats">
                <span>{player.points} pts</span>
                <span>Coef {player.coefficient}</span>
                <span className="stat-positive">{player.winRate} win rate</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel secondary-panel">
        <div className="panel-heading">
          <div>
            <h3>Not Yet Qualified</h3>
            <p>Minimum 5 games to qualify.</p>
          </div>
        </div>

        <div className="leaderboard-list compact">
          {leaderboardUnqualified.map((player) => (
            <article key={player.name} className="leaderboard-row">
              <div className="player-heading">
                <div>
                  <strong>{player.name}</strong>
                  <span>
                    {player.games} games · {player.wins}W {player.losses}L
                  </span>
                </div>
              </div>

              <div className="row-stats">
                <span>{player.points} pts</span>
                <span>Coef {player.coefficient}</span>
                <span className="stat-positive">{player.winRate} win rate</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

type RecordScreenProps = {
  recordState: RecordState
  availablePlayers: string[]
  onSearchChange: (value: string) => void
  onDateChange: (value: string) => void
  onTeamSizeChange: (size: number) => void
  onAddPlayer: (playerName: string, team: Winner) => void
  onRemovePlayer: (playerName: string, team: Winner) => void
  onWinnerChange: (winner: Winner) => void
  onSave: () => void
  teamsEven: boolean
  canSave: boolean
}

function RecordScreen({
  recordState,
  availablePlayers,
  onSearchChange,
  onDateChange,
  onTeamSizeChange,
  onAddPlayer,
  onRemovePlayer,
  onWinnerChange,
  onSave,
  teamsEven,
  canSave,
}: RecordScreenProps) {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Fast Match Entry</p>
          <h2>Record Game</h2>
        </div>
      </div>

      <div className="record-layout">
        <section className="panel record-primary">
          <div className="record-toolbar">
            <label className="input-card">
              <span>Date</span>
              <input
                value={recordState.dateLabel}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>

            <div className="input-card">
              <span>Team Size</span>
              <div className="segmented-control">
                {[3, 4, 5].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={recordState.teamSize === size ? 'is-active' : ''}
                    onClick={() => onTeamSizeChange(size)}
                  >
                    {size}v{size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="input-card full-width">
            <span>Search player</span>
            <input
              value={recordState.search}
              placeholder="Tap to filter available players"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className="player-picker">
            {availablePlayers.map((player) => (
              <article key={player} className="available-player-card">
                <div className="available-player-copy">
                  <strong>{player}</strong>
                  <span>Ready to assign</span>
                </div>

                <div className="assign-actions">
                  <button type="button" onClick={() => onAddPlayer(player, 'A')}>
                    Team A
                  </button>
                  <button type="button" onClick={() => onAddPlayer(player, 'B')}>
                    Team B
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="record-secondary">
          <TeamCard
            title="Team A"
            tone="team-a"
            players={recordState.teamA}
            teamSize={recordState.teamSize}
            onRemove={(playerName) => onRemovePlayer(playerName, 'A')}
          />

          <TeamCard
            title="Team B"
            tone="team-b"
            players={recordState.teamB}
            teamSize={recordState.teamSize}
            onRemove={(playerName) => onRemovePlayer(playerName, 'B')}
          />

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Winner</h3>
                <p>Select the winning side before saving.</p>
              </div>
            </div>

            <div className="winner-toggle">
              <button
                type="button"
                className={recordState.winner === 'A' ? 'is-active' : ''}
                onClick={() => onWinnerChange('A')}
              >
                Team A
              </button>
              <button
                type="button"
                className={recordState.winner === 'B' ? 'is-active' : ''}
                onClick={() => onWinnerChange('B')}
              >
                Team B
              </button>
            </div>

            <p className={`status-note ${teamsEven ? 'is-good' : 'is-warning'}`}>
              {teamsEven
                ? 'Teams are even. Ready to save!'
                : 'Teams are uneven. Add or remove players before saving.'}
            </p>

            <button
              type="button"
              className="primary-button wide-button"
              onClick={onSave}
              disabled={!canSave}
            >
              Save Game
            </button>
          </section>
        </section>
      </div>
    </section>
  )
}

function TeamCard({
  title,
  tone,
  players,
  teamSize,
  onRemove,
}: {
  title: string
  tone: string
  players: string[]
  teamSize: number
  onRemove: (playerName: string) => void
}) {
  return (
    <section className={`panel team-card ${tone}`}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>Tap a player chip to remove.</p>
        </div>
        <span className="count-badge">
          {players.length}/{teamSize}
        </span>
      </div>

      <div className="team-chip-list">
        {players.map((player) => (
          <button key={player} type="button" className="team-chip" onClick={() => onRemove(player)}>
            {player}
            <span>×</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SavedScreen({
  winner,
  onRecordAgain,
  onViewLeaderboard,
}: {
  winner: Winner
  onRecordAgain: () => void
  onViewLeaderboard: () => void
}) {
  const losingTeam = winner === 'A' ? 'Team B' : 'Team A'

  return (
    <section className="screen centered-screen">
      <article className="save-card">
        <span className="save-badge">Game saved</span>
        <h2>Great game! Stats updated.</h2>
        <div className="save-grid">
          <div>
            <span>Winning Team</span>
            <strong>{winner === 'A' ? 'Team A' : 'Team B'}</strong>
          </div>
          <div>
            <span>Losing Team</span>
            <strong>{losingTeam}</strong>
          </div>
          <div>
            <span>Points applied</span>
            <strong>Winners +3, Losers -1</strong>
          </div>
        </div>

        <div className="save-actions">
          <button type="button" className="primary-button" onClick={onRecordAgain}>
            Record Another Game
          </button>
          <button type="button" className="secondary-button" onClick={onViewLeaderboard}>
            View Leaderboard
          </button>
        </div>
      </article>
    </section>
  )
}

function HistoryScreen({
  games,
  onEdit,
  onDelete,
}: {
  games: HistoryGame[]
  onEdit: (game: HistoryGame) => void
  onDelete: (gameId: number) => void
}) {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Audit Trail</p>
          <h2>History</h2>
        </div>
      </div>

      <div className="history-list">
        {games.map((game) => (
          <article key={game.id} className="history-card">
            <div className="history-head">
              <div>
                <strong>
                  Game #{game.id} - {game.dateShort}
                </strong>
                <span>{game.winner === 'A' ? 'Team A won' : 'Team B won'}</span>
              </div>
              <span className="winner-chip">{game.winner === 'A' ? 'Team A' : 'Team B'}</span>
            </div>

            <div className="history-body">
              <p>
                <strong>Team A:</strong> {game.teamA.join(', ')}
              </p>
              <p>
                <strong>Team B:</strong> {game.teamB.join(', ')}
              </p>
            </div>

            <div className="history-actions">
              <button type="button" className="secondary-button" onClick={() => onEdit(game)}>
                Edit
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => onDelete(game.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function PlayersScreen({
  players,
  playerQuery,
  selectedPlayerId,
  onSearchChange,
  onSelectPlayer,
  onAddPlayer,
  selectedPlayer,
}: {
  players: PlayerCard[]
  playerQuery: string
  selectedPlayerId: string
  onSearchChange: (value: string) => void
  onSelectPlayer: (playerId: string) => void
  onAddPlayer: () => void
  selectedPlayer: PlayerCard
}) {
  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Club Roster</p>
          <h2>Players</h2>
        </div>
      </div>

      <div className="players-layout">
        <section className="panel">
          <div className="player-toolbar">
            <label className="input-card full-width">
              <span>Search players</span>
              <input
                value={playerQuery}
                placeholder="Find a name or type a new one"
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>

            <button type="button" className="primary-button" onClick={onAddPlayer}>
              Add Player
            </button>
          </div>

          <div className="player-list">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                className={`player-row ${selectedPlayerId === player.id ? 'is-active' : ''}`}
                onClick={() => onSelectPlayer(player.id)}
              >
                <div>
                  <strong>{player.name}</strong>
                  <span>{player.active ? 'Active this season' : 'Inactive'}</span>
                </div>
                <span className={`status-badge ${player.active ? 'active' : 'inactive'}`}>
                  {player.active ? 'Active' : 'Inactive'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel player-detail-card">
          <div className="panel-heading">
            <div>
              <h3>{selectedPlayer.name}</h3>
              <p>Stats are calculated from recorded games.</p>
            </div>
          </div>

          <div className="detail-stats">
            <div>
              <span>Games</span>
              <strong>{selectedPlayer.games}</strong>
            </div>
            <div>
              <span>Wins</span>
              <strong className="stat-positive">{selectedPlayer.wins}</strong>
            </div>
            <div>
              <span>Losses</span>
              <strong className="stat-negative">{selectedPlayer.losses}</strong>
            </div>
            <div>
              <span>Points</span>
              <strong>{selectedPlayer.points}</strong>
            </div>
            <div>
              <span>Coef</span>
              <strong>{selectedPlayer.coefficient}</strong>
            </div>
            <div>
              <span>Win Rate</span>
              <strong>{selectedPlayer.winRate}</strong>
            </div>
          </div>

          <div className="recent-list">
            <h4>Recent games</h4>
            {selectedPlayer.recentGames.map((game) => (
              <article key={game.label} className="recent-row">
                <span>{game.label}</span>
                <strong className={game.result.startsWith('W') ? 'stat-positive' : 'stat-negative'}>
                  {game.result}
                </strong>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

export default App
