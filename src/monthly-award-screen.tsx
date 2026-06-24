import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/ui/file-upload'
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from '@/components/ui/number-field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageIcon, TrophyIcon } from './icons'
import { MvpCrestLogo } from '@/components/mvp/MvpCrestLogo'
import { MvpPhotoCropper } from '@/components/mvp/MvpPhotoCropper'
import { seedStatsMonth, type HistoryGame, type RosterPlayer } from './data'
import { buildPlayerStats } from './stats'
import { getAwardImageUrl, type MonthlyAward, type UploadMonthlyAwardInput } from './remote-awards'

type MonthOption = { value: string; label: string }
type AwardStats = { games: number; wins: number; losses: number; winRate: string }
type AwardSaveInput = Omit<UploadMonthlyAwardInput, 'accessCode'>

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatMonthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return `${monthNames[month - 1] ?? value} ${year}`
}

function getGameMonth(dateLabel: string) {
  const [, month, year] = dateLabel.trim().split(/\s+/)
  const monthIndex = monthNames.indexOf(month)
  return monthIndex === -1 || !year ? null : `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function getWinRate(games: number, wins: number) {
  if (games <= 0) return '0%'
  return `${Math.round((wins / games) * 100)}%`
}

function getRecordedStats(month: string, playerId: string, playerName: string, rosterPlayers: RosterPlayer[], historyGames: HistoryGame[]): AwardStats {
  const monthGames = historyGames.filter((game) => getGameMonth(game.dateLabel) === month)
  const players = buildPlayerStats(rosterPlayers, monthGames, { includeSeedStats: month === seedStatsMonth })
  const player = players.find((item) => item.id === playerId || item.name === playerName)

  return {
    games: player?.games ?? 0,
    wins: player?.wins ?? 0,
    losses: Math.max((player?.games ?? 0) - (player?.wins ?? 0), 0),
    winRate: player?.winRate ?? '0%',
  }
}

function getAwardStats(award: MonthlyAward, rosterPlayers: RosterPlayer[], historyGames: HistoryGame[]): AwardStats {
  if (award.manualStats) {
    return {
      games: award.manualStats.games,
      wins: award.manualStats.wins,
      losses: award.manualStats.losses,
      winRate: getWinRate(award.manualStats.games, award.manualStats.wins),
    }
  }

  return getRecordedStats(award.month, award.playerId, award.playerName, rosterPlayers, historyGames)
}

function getRecentMonthOptions(baseOptions: MonthOption[], awards: MonthlyAward[]) {
  const values = new Map<string, string>()
  const today = new Date()

  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    values.set(value, formatMonthLabel(value))
  }

  for (const option of baseOptions) values.set(option.value, option.label)
  for (const award of awards) values.set(award.month, formatMonthLabel(award.month))

  return [...values.entries()]
    .sort(([first], [second]) => second.localeCompare(first))
    .map(([value, label]) => ({ value, label }))
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!url) return undefined
    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}

export function MonthlyAwardScreen({ awards, monthOptions, rosterPlayers, historyGames, isSaving, onSave }: {
  awards: MonthlyAward[]
  monthOptions: MonthOption[]
  rosterPlayers: RosterPlayer[]
  historyGames: HistoryGame[]
  isSaving: boolean
  onSave: (input: AwardSaveInput, onSuccess: () => void) => void
}) {
  const players = useMemo(() => rosterPlayers.filter((player) => player.isExcludedFromLeaderboard !== true && player.isRepeatable !== true), [rosterPlayers])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [month, setMonth] = useState(monthOptions[0]?.value ?? seedStatsMonth)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [rawPhoto, setRawPhoto] = useState<File | null>(null)
  const [statsDraft, setStatsDraft] = useState<{ key: string; games: number; wins: number; losses: number } | null>(null)
  const [manualStatsDisclosure, setManualStatsDisclosure] = useState<{ key: string; open: boolean } | null>(null)
  const photoPreviewUrl = useObjectUrl(photo)
  const currentAward = awards[0] ?? null
  const effectivePlayerId = playerId || players[0]?.id || ''
  const selectedPlayer = players.find((player) => player.id === effectivePlayerId) ?? null
  const formMonthOptions = useMemo(() => getRecentMonthOptions(monthOptions, awards), [awards, monthOptions])
  const recordedStats = useMemo(
    () => selectedPlayer ? getRecordedStats(month, selectedPlayer.id, selectedPlayer.name, rosterPlayers, historyGames) : null,
    [historyGames, month, rosterPlayers, selectedPlayer],
  )
  const hasRecordedStats = (recordedStats?.games ?? 0) > 0
  const statsKey = `${month}:${effectivePlayerId}`
  const existingManualStats = awards.find((award) => award.month === month && award.playerId === effectivePlayerId)?.manualStats
  const defaultStats = existingManualStats ?? (hasRecordedStats && recordedStats ? recordedStats : { games: 0, wins: 0, losses: 0 })
  const effectiveStats = statsDraft?.key === statsKey ? statsDraft : { key: statsKey, ...defaultStats }
  const manualStatsOpen = manualStatsDisclosure?.key === statsKey ? manualStatsDisclosure.open : !hasRecordedStats
  const updateStatsDraft = (nextStats: Partial<Pick<typeof effectiveStats, 'games' | 'wins' | 'losses'>>) => {
    setStatsDraft({
      key: statsKey,
      games: effectiveStats.games,
      wins: effectiveStats.wins,
      losses: effectiveStats.losses,
      ...nextStats,
    })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedPlayer) {
      toast.error('Pilih player dulu.', { duration: 4000 })
      return
    }
    if (!photo) {
      toast.error('Upload dan crop foto MVP dulu.', { duration: 4000 })
      return
    }
    if (effectiveStats.wins + effectiveStats.losses > effectiveStats.games) {
      toast.error('Wins + losses tidak boleh lebih besar dari games.', { duration: 4000 })
      return
    }

    onSave({ month, playerId: selectedPlayer.id, playerName: selectedPlayer.name, photo, manualStats: { games: effectiveStats.games, wins: effectiveStats.wins, losses: effectiveStats.losses } }, () => {
      setSheetOpen(false)
      setSuccessOpen(true)
      setPhoto(null)
      setRawPhoto(null)
      setStatsDraft(null)
      setManualStatsDisclosure(null)
    })
  }

  return (
    <section className="relative mx-auto grid max-w-5xl justify-items-center gap-8 px-1 pb-8 md:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,166,62,0.11),transparent_36%),linear-gradient(180deg,rgba(236,253,245,0.75),transparent_42%)]" />


      {currentAward ? (
        <MvpPoster award={currentAward} stats={getAwardStats(currentAward, rosterPlayers, historyGames)} />
      ) : (
        <EmptyPoster onUpdate={() => setSheetOpen(true)} />
      )}

      {currentAward && (
        <div className="flex items-center justify-center gap-5 text-sm font-bold text-foreground">
          <button type="button" className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-primary/10">
            <span className="grid size-10 place-items-center rounded-full border border-primary/40 text-primary"><ShareGlyph /></span>
            Share
          </button>
          <span className="h-8 w-px bg-border" />
          <button type="button" className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition hover:bg-primary/10" onClick={() => setSheetOpen(true)}>
            <span className="grid size-10 place-items-center rounded-full border border-primary/40 text-primary"><ImageIcon className="size-4" /></span>
            Update MVP
          </button>
        </div>
      )}

      <section className="grid w-full gap-5 pt-1">
        <div className="grid justify-items-center gap-2 text-center">
          <span className="text-primary">☆</span>
          <h2 className="font-heading text-sm font-black uppercase tracking-[0.22em]">Previous MVPs</h2>
        </div>
        {awards.length > 1 ? (
          <div className="mx-auto flex max-w-4xl gap-7 overflow-x-auto px-3 pb-3 pt-1">
            {awards.slice(1, 8).map((award) => <ArchiveAward key={award.month} award={award} />)}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Archive muncul setelah ada lebih dari satu bulan MVP.</p>
        )}
      </section>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-[430px] rounded-[2rem] p-6 md:max-w-[460px]">
          <form className="grid gap-5" onSubmit={submit}>
            <DialogHeader>
              <DialogTitle className="sr-only">Update MVP</DialogTitle>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-primary">Update MVP</p>
              <DialogDescription>Upload foto, crop 4:5, lalu isi stats manual.</DialogDescription>
              <DialogCloseButton />
            </DialogHeader>

            <SelectField label="Bulan" value={month} options={formMonthOptions} onValueChange={setMonth} />
            <SelectField label="Player" value={effectivePlayerId} options={players.map((player) => ({ value: player.id, label: player.name }))} onValueChange={setPlayerId} />

            <ManualStatsCard
              games={effectiveStats.games}
              hasRecordedStats={hasRecordedStats}
              isOpen={manualStatsOpen}
              losses={effectiveStats.losses}
              onGamesChange={(value) => updateStatsDraft({ games: value })}
              onLossesChange={(value) => updateStatsDraft({ losses: value })}
              onOpenChange={(open) => setManualStatsDisclosure({ key: statsKey, open })}
              onWinsChange={(value) => updateStatsDraft({ wins: value })}
              wins={effectiveStats.wins}
            />

            <FileUpload
              accept="image/jpeg,image/png,image/webp"
              description="JPG, PNG, WebP. Crop only."
              previewAlt="Preview MVP crop"
              previewUrl={photoPreviewUrl}
              title="Tap to upload"
              onChange={(event) => setRawPhoto(event.target.files?.[0] ?? null)}
            />

            <DialogFooter>
              <Button type="submit" className="h-12 w-full" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Upload & Update'}
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {rawPhoto && (
        <MvpPhotoCropper
          file={rawPhoto}
          onCancel={() => setRawPhoto(null)}
          onCropped={(croppedFile) => {
            setPhoto(croppedFile)
            setRawPhoto(null)
          }}
        />
      )}

      {successOpen && <SuccessModal onClose={() => setSuccessOpen(false)} />}
    </section>
  )
}

function MvpPoster({ award, stats }: { award: MonthlyAward; stats: AwardStats }) {
  return (
    <article className="relative aspect-[4/5] w-full max-w-[33rem] overflow-hidden rounded-[2rem] bg-zinc-950 text-white shadow-2xl shadow-emerald-950/20 ring-1 ring-black/5 md:max-w-[42rem]">
      <img src={getAwardImageUrl(award)} alt={award.playerName} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(0,166,62,0.35),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.72),transparent_56%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.92))]" />
      <div className="absolute inset-0 opacity-30 mix-blend-screen [background-image:radial-gradient(circle_at_20%_20%,rgba(120,242,188,0.35),transparent_18%),radial-gradient(circle_at_82%_42%,rgba(0,166,62,0.26),transparent_22%)]" />

      <MvpCrestLogo className="absolute left-7 top-7 w-24 md:left-12 md:top-12 md:w-28" />
      <StatsRail stats={stats} />
      <PlayerName name={award.playerName} monthLabel={formatMonthLabel(award.month)} />
    </article>
  )
}

function StatsRail({ stats }: { stats: AwardStats }) {
  return (
    <div className="absolute left-9 top-40 grid gap-8 md:left-16 md:top-56 md:gap-10">
      <StatRailItem icon="rate" label="Win Rate" value={stats.winRate} />
      <StatRailItem icon="games" label="Games" value={stats.games} />
      <StatRailItem icon="wins" label="Wins" value={stats.wins} />
    </div>
  )
}

function PlayerName({ name, monthLabel }: { name: string; monthLabel: string }) {
  const [firstName, ...rest] = name.trim().split(/\s+/)
  const lastName = rest.join(' ')

  return (
    <div className="absolute inset-x-0 bottom-8 grid justify-items-center px-6 text-center md:bottom-10">
      {lastName ? (
        <div className="grid justify-items-center">
          <span className="-mb-3 text-7xl leading-none text-white drop-shadow-2xl md:text-8xl" style={{ fontFamily: 'Allura, cursive' }}>{firstName}</span>
          <strong className="font-heading text-5xl font-black uppercase leading-none tracking-tight text-white drop-shadow-2xl md:text-6xl">{lastName}</strong>
        </div>
      ) : (
        <span className="text-7xl leading-none text-white drop-shadow-2xl md:text-8xl" style={{ fontFamily: 'Allura, cursive' }}>{firstName || name}</span>
      )}
      <div className="mt-2 flex items-center gap-4 text-primary">
        <span className="h-px w-14 bg-current" />
        <span className="text-xs font-black uppercase tracking-[0.38em] md:text-sm">{monthLabel}</span>
        <span className="h-px w-14 bg-current" />
      </div>
    </div>
  )
}

function StatRailItem({ icon, label, value }: { icon: 'rate' | 'games' | 'wins'; label: string; value: string | number }) {
  return (
    <div className="grid w-20 justify-items-center gap-1 text-center text-white md:w-20">
      <span className="grid size-9 place-items-center md:size-10">
        {icon === 'rate' && <TrophyIcon className="size-7 md:size-8" />}
        {icon === 'games' && <BasketballIcon />}
        {icon === 'wins' && <HoopIcon />}
      </span>
      <span className="text-[7px] font-black uppercase leading-none tracking-[0.12em] text-white/80 md:text-[8px]">{label}</span>
      <strong className="font-heading text-[1.45rem] font-black leading-none text-white md:text-[1.75rem]">{value}</strong>
    </div>
  )
}

function ArchiveAward({ award }: { award: MonthlyAward }) {
  return (
    <div className="w-24 shrink-0 text-center md:w-28">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-white p-1 shadow-md ring-2 ring-primary/90 md:size-24">
        <img src={getAwardImageUrl(award)} alt={award.playerName} className="aspect-square size-full rounded-full object-cover" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{formatMonthLabel(award.month)}</p>
      <p className="mt-1 truncate text-sm font-bold text-foreground md:text-base">{award.playerName}</p>
    </div>
  )
}

function ManualStatsCard({ games, wins, losses, hasRecordedStats, isOpen, onOpenChange, onGamesChange, onWinsChange, onLossesChange }: {
  games: number
  wins: number
  losses: number
  hasRecordedStats: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onGamesChange: (value: number) => void
  onWinsChange: (value: number) => void
  onLossesChange: (value: number) => void
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange} className="overflow-hidden rounded-3xl border bg-input/20 p-4">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 text-left">
        <span className="grid gap-1">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
            Manual Stats <span className="font-semibold normal-case tracking-normal text-muted-foreground">(optional)</span>
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {hasRecordedStats ? 'Data bulan ini tersedia. Buka hanya kalau ingin override.' : 'Belum ada data bulan ini. Isi stats manual.'}
          </span>
        </span>
        <ChevronDownIcon className={`size-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted className="grid gap-3 pt-4 data-closed:hidden">
        <div className="grid gap-2.5">
          <StatNumberField label="Games" value={games} onValueChange={onGamesChange} />
          <StatNumberField label="Wins" value={wins} onValueChange={onWinsChange} />
          <StatNumberField label="Losses" value={losses} onValueChange={onLossesChange} />
        </div>
        <p className="text-xs text-muted-foreground">Win rate dihitung otomatis dari wins / games.</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: MonthOption[]; onValueChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em]">
      {label}
      <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)} items={options}>
        <SelectTrigger className="h-12 w-full rounded-3xl border bg-background px-4 text-base font-bold normal-case tracking-normal">
          <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function StatNumberField({ label, value, onValueChange }: { label: string; value: number; onValueChange: (value: number) => void }) {
  return (
    <label className="grid grid-cols-[minmax(0,1fr)_9.25rem] items-center gap-3 rounded-2xl bg-background/65 px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
      <span className="min-w-0 truncate">{label}</span>
      <NumberField min={0} step={1} value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? 0)}>
        <NumberFieldGroup className="h-10 w-[9.25rem] bg-background px-1">
          <NumberFieldDecrement className="size-7" />
          <NumberFieldInput className="px-1 text-base" inputMode="numeric" />
          <NumberFieldIncrement className="size-7" />
        </NumberFieldGroup>
      </NumberField>
    </label>
  )
}

function EmptyPoster({ onUpdate }: { onUpdate: () => void }) {
  return <div className="grid aspect-[4/5] w-full max-w-[33rem] place-items-center rounded-[2rem] border border-dashed bg-white/60 px-6 text-center shadow-inner md:max-w-[42rem]"><div className="grid gap-4"><ImageIcon className="mx-auto size-12 text-primary" /><h2 className="font-heading text-3xl font-black">Belum ada MVP</h2><p className="text-sm text-muted-foreground">Upload pemenang bulan ini untuk mulai bikin MVP poster.</p><Button type="button" className="h-11" onClick={onUpdate}>Update MVP</Button></div></div>
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-5 backdrop-blur-sm"><div className="grid w-full max-w-sm justify-items-center gap-5 rounded-[2rem] bg-zinc-950 p-7 text-center text-white shadow-2xl"><TrophyIcon className="size-16 text-primary" /><h2 className="font-heading text-3xl font-black uppercase italic">MVP Updated!</h2><Button type="button" className="h-12 w-full" onClick={onClose}>Lihat MVP</Button></div></div>
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.7 6.8-4.4" />
      <path d="m8.6 13.3 6.8 4.4" />
    </svg>
  )
}

function BasketballIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 md:size-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 3.2v17.6" />
      <path d="M3.2 12h17.6" />
      <path d="M5.8 5.8c2.1 2.5 4.2 3.8 6.2 3.8s4.1-1.3 6.2-3.8" />
      <path d="M5.8 18.2c2.1-2.5 4.2-3.8 6.2-3.8s4.1 1.3 6.2 3.8" />
    </svg>
  )
}

function HoopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-8 md:size-9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      <path d="M5 6h14" />
      <path d="M7 6 9 20" />
      <path d="M17 6 15 20" />
      <path d="M9 20h6" />
      <path d="M7.5 10h9" />
      <path d="M8.2 14h7.6" />
      <path d="M9 18h6" />
      <path d="M10 6v14" />
      <path d="M14 6v14" />
    </svg>
  )
}
