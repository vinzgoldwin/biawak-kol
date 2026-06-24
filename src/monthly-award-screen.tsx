import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toBlob } from 'html-to-image'
import { toast } from 'sonner'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUpload } from '@/components/ui/file-upload'
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from '@/components/ui/number-field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CopyIcon, DownloadIcon, ImageIcon, TrophyIcon } from './icons'
import { MvpCrestLogo } from '@/components/mvp/MvpCrestLogo'
import { MvpPhotoCropper } from '@/components/mvp/MvpPhotoCropper'
import { seedStatsMonth, type HistoryGame, type RosterPlayer } from './data'
import { buildPlayerStats } from './stats'
import { getAwardImageUrl, type MonthlyAward, type UploadMonthlyAwardInput } from './remote-awards'

type MonthOption = { value: string; label: string }
type AwardStats = { games: number; wins: number; losses: number; winRate: string }
type AwardSaveInput = Omit<UploadMonthlyAwardInput, 'accessCode'>
type MvpPosterView = { month: string; playerName: string; imageUrl: string; stats: AwardStats }
type ArchiveAwardItem = MvpPosterView & { isPreview: boolean }
type ShareAction = 'copy' | 'download' | 'native-share'

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

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function createMvpImageFileName(view: MvpPosterView) {
  const playerSlug = view.playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player'
  return `biawak-kol-mvp-${view.month}-${playerSlug}.png`
}

async function waitForCardAssets(node: HTMLElement) {
  await document.fonts?.ready
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.onload = () => resolve()
        image.onerror = () => resolve()
      })
    }

    try {
      await image.decode()
    } catch {
      // html-to-image will still attempt to render; don't fail early for one decode issue.
    }
  }))
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildPreviewArchiveAwards(awards: MonthlyAward[], rosterPlayers: RosterPlayer[], historyGames: HistoryGame[]): ArchiveAwardItem[] {
  const currentAward = awards[0]
  if (!currentAward) return []

  const fallbackImageUrl = getAwardImageUrl(currentAward)
  const realArchiveByMonth = new Map(
    awards.slice(1).map((award) => [
      award.month,
      { month: award.month, playerName: award.playerName, imageUrl: getAwardImageUrl(award), stats: getAwardStats(award, rosterPlayers, historyGames), isPreview: false },
    ]),
  )
  const dummyNames = ['Ko Giri', 'Ko Anton', 'Fandi', 'AAL', 'Andes', 'Yanuar', 'Tommy', 'Syauli', 'Frans', 'BMT', 'Hengki']

  return Array.from({ length: 11 }, (_, index) => {
    const month = shiftMonth(currentAward.month, -(index + 1))
    const games = 8 + (index % 5)
    const wins = Math.max(4, games - 2 - (index % 3))
    return realArchiveByMonth.get(month) ?? {
      month,
      playerName: dummyNames[index % dummyNames.length],
      imageUrl: fallbackImageUrl,
      stats: {
        games,
        wins,
        losses: games - wins,
        winRate: getWinRate(games, wins),
      },
      isPreview: true,
    }
  })
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
  const [shareOpen, setShareOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [selectedMvpMonth, setSelectedMvpMonth] = useState<string | null>(null)
  const [shareAction, setShareAction] = useState<ShareAction | null>(null)
  const [month, setMonth] = useState(monthOptions[0]?.value ?? seedStatsMonth)
  const [playerId, setPlayerId] = useState(players[0]?.id ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [rawPhoto, setRawPhoto] = useState<File | null>(null)
  const [statsDraft, setStatsDraft] = useState<{ key: string; games: number; wins: number; losses: number } | null>(null)
  const [manualStatsDisclosure, setManualStatsDisclosure] = useState<{ key: string; open: boolean } | null>(null)
  const exportCardRef = useRef<HTMLDivElement>(null)
  const photoPreviewUrl = useObjectUrl(photo)
  const currentAward = awards[0] ?? null
  const currentStats = currentAward ? getAwardStats(currentAward, rosterPlayers, historyGames) : null
  const currentMvpView = currentAward && currentStats ? { month: currentAward.month, playerName: currentAward.playerName, imageUrl: getAwardImageUrl(currentAward), stats: currentStats } : null
  const archiveAwards = useMemo(() => buildPreviewArchiveAwards(awards, rosterPlayers, historyGames), [awards, historyGames, rosterPlayers])
  const selectedArchiveAward = selectedMvpMonth ? archiveAwards.find((award) => award.month === selectedMvpMonth) ?? null : null
  const viewedMvp = selectedArchiveAward ?? currentMvpView
  const isViewingArchive = Boolean(selectedArchiveAward)
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

  const createMvpCardBlob = async () => {
    if (!exportCardRef.current || !viewedMvp) throw new Error('MVP card is not ready.')

    await waitForCardAssets(exportCardRef.current)
    const blob = await toBlob(exportCardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
    })
    if (!blob) throw new Error('Could not generate MVP card image.')

    return blob
  }

  const handleShareAction = async (action: ShareAction) => {
    if (!viewedMvp || shareAction) return

    setShareAction(action)
    try {
      const blob = await createMvpCardBlob()
      const fileName = createMvpImageFileName(viewedMvp)

      if (action === 'copy') {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
          throw new Error('Image clipboard is not supported in this browser.')
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        toast.success('MVP image copied.', { duration: 3000 })
      }

      if (action === 'download') {
        downloadBlob(blob, fileName)
        toast.success('MVP image downloaded.', { duration: 3000 })
      }

      if (action === 'native-share') {
        const file = new File([blob], fileName, { type: 'image/png' })
        const shareData: ShareData = {
          title: 'Biawak KOL MVP',
          text: `${viewedMvp.playerName} — ${formatMonthLabel(viewedMvp.month)} MVP`,
          files: [file],
        }

        if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
          downloadBlob(blob, fileName)
          toast.message('Image sharing is not supported here. Downloaded instead.', { duration: 5000 })
        } else {
          await navigator.share(shareData)
        }
      }

      setShareOpen(false)
    } catch (error) {
      const fallbackMessage = action === 'copy'
        ? 'Copy image is not supported by this browser. Try Download Image.'
        : action === 'native-share'
          ? 'Share image failed. Try Download Image.'
          : 'Could not download MVP image.'
      toast.error(error instanceof Error ? fallbackMessage : fallbackMessage, { duration: 5000 })
    } finally {
      setShareAction(null)
    }
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
    <section className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 md:pb-14 lg:px-8 lg:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_22%,rgba(0,130,54,0.08),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f6fbf7_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-12 -z-10 hidden justify-center lg:flex"
      >
        <span className="-translate-x-1/2 select-none whitespace-nowrap font-heading text-[22vw] font-black uppercase leading-none tracking-tight text-emerald-900/[0.035]">
          BIAWAK KOL
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(24rem,26rem)_minmax(20rem,1fr)] lg:items-start lg:gap-12">
        <div className="grid gap-8">
          <MvpWallHeader />

          <div className="relative grid justify-items-center gap-6 lg:justify-self-center lg:gap-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-6 left-1/2 -z-10 hidden h-[440px] w-[540px] -translate-x-1/2 rounded-full bg-primary/[0.10] blur-[110px] lg:block"
            />
            {viewedMvp ? (
              <MvpPoster view={viewedMvp} />
            ) : (
              <EmptyPoster />
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-foreground lg:gap-4">
              {viewedMvp && (
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-5 py-2.5 shadow-sm transition hover:border-primary/40 hover:bg-primary/10" onClick={() => setShareOpen(true)}>
                  <ShareGlyph />
                  Share
                </button>
              )}
              {isViewingArchive && (
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-5 py-2.5 text-primary shadow-sm transition hover:bg-primary/10" onClick={() => setSelectedMvpMonth(null)}>
                  Back to Current MVP
                </button>
              )}
              <button type="button" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground shadow-sm transition hover:bg-primary/90" onClick={() => setSheetOpen(true)}>
                <ImageIcon className="size-4" />
                Update MVP
              </button>
            </div>
          </div>
        </div>

        <PreviousMvpWall awards={archiveAwards} selectedMonth={selectedMvpMonth} onSelect={setSelectedMvpMonth} />
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[390px] rounded-[2rem] p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-black tracking-tight">Share MVP Card</DialogTitle>
            <DialogDescription>Copy, download, or send the current card through your phone share sheet.</DialogDescription>
            <DialogCloseButton />
          </DialogHeader>
          <div className="grid gap-3">
            <ShareActionButton
              description="Paste the MVP image into chat, notes, or design tools."
              disabled={shareAction !== null}
              icon={<CopyIcon className="size-5" />}
              isLoading={shareAction === 'copy'}
              label="Copy Image"
              onClick={() => handleShareAction('copy')}
            />
            <ShareActionButton
              description="Save a PNG of the card to your device."
              disabled={shareAction !== null}
              icon={<DownloadIcon className="size-5" />}
              isLoading={shareAction === 'download'}
              label="Download Image"
              onClick={() => handleShareAction('download')}
            />
            <ShareActionButton
              description="Use the native share sheet. Choose WhatsApp there."
              disabled={shareAction !== null}
              icon={<ShareGlyph className="size-5" />}
              isLoading={shareAction === 'native-share'}
              label="Share Image"
              onClick={() => handleShareAction('native-share')}
            />
          </div>
        </DialogContent>
      </Dialog>

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

      {viewedMvp && (
        <div aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0 opacity-100">
          <MvpPosterExport ref={exportCardRef} view={viewedMvp} />
        </div>
      )}

      {successOpen && <SuccessModal onClose={() => setSuccessOpen(false)} />}
    </section>
  )
}

function PosterFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full max-w-[22rem] md:max-w-[24rem] lg:w-96 lg:max-w-96">
      <div className="relative aspect-[4/5] w-full">
        <div className={cn('absolute inset-0 origin-top-left scale-[0.667] [width:calc(100%/0.667)] [height:calc(100%/0.667)]', className)}>
          {children}
        </div>
      </div>
    </div>
  )
}

function MvpPoster({ view }: { view: MvpPosterView }) {
  return (
    <PosterFrame className="overflow-hidden rounded-[2rem] bg-zinc-950 text-white shadow-2xl shadow-emerald-950/20 ring-1 ring-black/5">
      <MvpPosterArtwork view={view} />
    </PosterFrame>
  )
}

function MvpPosterExport({ ref, view }: { ref?: React.Ref<HTMLDivElement>; view: MvpPosterView }) {
  return (
    <div ref={ref} className="relative h-[720px] w-[576px] overflow-hidden bg-zinc-950 text-white">
      <MvpPosterArtwork isExport view={view} />
    </div>
  )
}

function MvpPosterArtwork({ isExport = false, view }: { isExport?: boolean; view: MvpPosterView }) {
  return (
    <>
      <img src={view.imageUrl} alt={view.playerName} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(0,166,62,0.35),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.72),transparent_56%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.92))]" />
      <div className="absolute inset-0 opacity-30 mix-blend-screen [background-image:radial-gradient(circle_at_20%_20%,rgba(120,242,188,0.35),transparent_18%),radial-gradient(circle_at_82%_42%,rgba(0,166,62,0.26),transparent_22%)]" />

      <MvpCrestLogo className={cn('absolute', isExport ? 'left-12 top-9 w-28' : 'left-7 top-7 w-24 md:left-12 md:top-9 md:w-28')} />
      <StatsRail isExport={isExport} stats={view.stats} />
      <PlayerName isExport={isExport} name={view.playerName} monthLabel={formatMonthLabel(view.month)} />
    </>
  )
}

function StatsRail({ isExport = false, stats }: { isExport?: boolean; stats: AwardStats }) {
  return (
    <div className={cn('absolute grid', isExport ? 'left-16 top-48 gap-7' : 'left-9 top-40 gap-8 md:left-16 md:top-48 md:gap-7')}>
      <StatRailItem icon="rate" isExport={isExport} label="Win Rate" value={stats.winRate} />
      <StatRailItem icon="games" isExport={isExport} label="Games" value={stats.games} />
      <StatRailItem icon="wins" isExport={isExport} label="Wins" value={stats.wins} />
    </div>
  )
}

function getPosterDisplayName(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).join(' ')
}

function PlayerName({ isExport = false, name, monthLabel }: { isExport?: boolean; name: string; monthLabel: string }) {
  const displayName = getPosterDisplayName(name)

  if (isExport) {
    return (
      <div className="absolute inset-x-0 bottom-10 grid justify-items-center px-8 text-center">
        <span className="block max-w-full whitespace-nowrap text-[5.8rem] leading-none text-white drop-shadow-2xl" style={{ fontFamily: 'Allura, cursive' }}>{displayName}</span>
        <div className="mt-2 flex items-center gap-4 text-primary">
          <span className="h-px w-14 bg-current" />
          <span className="text-sm font-black uppercase tracking-[0.38em]">{monthLabel}</span>
          <span className="h-px w-14 bg-current" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="absolute inset-x-0 bottom-6 grid justify-items-center px-8 text-center md:hidden">
        <span className="block max-w-full whitespace-nowrap text-[4.25rem] leading-none text-white drop-shadow-2xl" style={{ fontFamily: 'Allura, cursive' }}>{displayName}</span>
        <div className="mt-2 flex items-center gap-4 text-primary">
          <span className="h-px w-14 bg-current" />
          <span className="text-xs font-black uppercase tracking-[0.38em]">{monthLabel}</span>
          <span className="h-px w-14 bg-current" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8 hidden justify-items-center px-8 text-center md:grid">
        <span className="block max-w-full whitespace-nowrap text-[5.8rem] leading-none text-white drop-shadow-2xl" style={{ fontFamily: 'Allura, cursive' }}>{displayName}</span>
        <div className="mt-2 flex items-center gap-4 text-primary">
          <span className="h-px w-14 bg-current" />
          <span className="text-sm font-black uppercase tracking-[0.38em]">{monthLabel}</span>
          <span className="h-px w-14 bg-current" />
        </div>
      </div>
    </>
  )
}

function StatRailItem({ icon, isExport = false, label, value }: { icon: 'rate' | 'games' | 'wins'; isExport?: boolean; label: string; value: string | number }) {
  return (
    <div className={cn('grid w-20 justify-items-center text-center text-white', isExport ? 'gap-0.5' : 'gap-1 md:gap-0.5')}>
      <span className={cn('grid place-items-center', isExport ? 'size-9' : 'size-9')}>
        {icon === 'rate' && <TrophyIcon className={cn(isExport ? 'size-7' : 'size-7')} />}
        {icon === 'games' && <BasketballIcon className={cn(isExport ? 'size-8' : 'size-8 md:size-8')} />}
        {icon === 'wins' && <HoopIcon className={cn(isExport ? 'size-8' : 'size-8 md:size-8')} />}
      </span>
      <span className={cn('font-black uppercase leading-none tracking-[0.12em] text-white/80', isExport ? 'text-[8px]' : 'text-[7px] md:text-[8px]')}>{label}</span>
      <strong className={cn('font-heading font-black leading-none text-white', isExport ? 'text-[1.6rem]' : 'text-[1.45rem] md:text-[1.6rem]')}>{value}</strong>
    </div>
  )
}

function MvpWallHeader() {
  return (
    <header className="grid gap-2">
      <h1 className="font-heading text-4xl font-black leading-none tracking-tight text-primary lg:text-5xl">MVP Wall</h1>
      <p className="max-w-md text-sm text-muted-foreground lg:text-base">Monthly kings of the court, archived like club history.</p>
    </header>
  )
}

function PreviousMvpWall({ awards, selectedMonth, onSelect }: { awards: ArchiveAwardItem[]; selectedMonth: string | null; onSelect: (month: string) => void }) {
  const hasArchive = awards.length > 0

  return (
    <section className="grid w-full gap-4 pt-2 lg:h-[42rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:rounded-[1.75rem] lg:border lg:border-emerald-900/10 lg:bg-white/75 lg:p-5 lg:shadow-[0_24px_70px_rgba(0,64,32,0.07)] lg:backdrop-blur">
      <div className="flex items-center justify-center gap-3 text-center lg:justify-start lg:text-left">
        <span className="text-primary">☆</span>
        <h2 className="font-heading text-sm font-black uppercase tracking-[0.22em] text-foreground">Previous MVPs</h2>
      </div>

      {hasArchive ? (
        <div className="-mx-4 flex w-[calc(100%+2rem)] snap-x scroll-pl-7 gap-6 overflow-x-auto px-7 pb-3 [scrollbar-width:none] sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-8 lg:mx-0 lg:grid lg:h-full lg:w-full lg:max-w-none lg:grid-cols-1 lg:content-start lg:gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:px-0 lg:pb-1 lg:pr-1 lg:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden lg:[&::-webkit-scrollbar]:block lg:[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-emerald-900/20 lg:[&::-webkit-scrollbar-track]:bg-transparent">
          {awards.map((award) => <ArchiveAward key={award.month} award={award} isSelected={selectedMonth === award.month} onSelect={() => onSelect(award.month)} />)}
        </div>
      ) : (
        <div className="-mx-4 flex w-[calc(100%+2rem)] snap-x scroll-pl-7 gap-4 overflow-x-auto px-7 pb-3 [scrollbar-width:none] sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-8 lg:mx-0 lg:grid lg:h-full lg:w-full lg:max-w-none lg:grid-cols-1 lg:content-start lg:gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:px-0 lg:pb-1 lg:pr-1 lg:[scrollbar-width:thin] [&::-webkit-scrollbar]:hidden lg:[&::-webkit-scrollbar]:block lg:[&::-webkit-scrollbar]:w-1.5 lg:[&::-webkit-scrollbar-thumb]:rounded-full lg:[&::-webkit-scrollbar-thumb]:bg-emerald-900/20 lg:[&::-webkit-scrollbar-track]:bg-transparent">
          <ComingSoonSlot />
          <ComingSoonSlot />
          <ComingSoonSlot />
        </div>
      )}
    </section>
  )
}

function ComingSoonSlot() {
  return (
    <div className="grid w-28 shrink-0 snap-start justify-items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-white/40 px-3 py-5 text-center lg:w-full lg:grid-cols-[3.25rem_1fr] lg:items-center lg:justify-items-start lg:px-3 lg:py-3 lg:text-left">
      <div className="grid size-20 place-items-center rounded-full bg-primary/5 text-primary/50 lg:size-13">
        <span className="font-heading text-base font-black">★</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Coming soon</p>
    </div>
  )
}

function ArchiveAward({ award, isSelected, onSelect }: { award: ArchiveAwardItem; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cn(
        'group w-32 shrink-0 snap-start overflow-visible text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:flex lg:w-full lg:items-center lg:gap-4 lg:rounded-2xl lg:px-2 lg:py-2 lg:text-left lg:hover:translate-x-1',
        isSelected && 'lg:bg-primary/8',
      )}
      onClick={onSelect}
    >
      <div className="mx-auto grid size-24 place-items-center overflow-visible rounded-full p-2 md:size-28 lg:mx-0 lg:size-16 lg:shrink-0 lg:p-1">
        <div className={cn('grid size-full place-items-center rounded-full bg-white p-1 shadow-md ring-2 ring-primary/90 lg:shadow-sm', isSelected && 'ring-[3px] ring-primary')}>
          <img src={award.imageUrl} alt={award.playerName} className="aspect-square size-full rounded-full object-cover" />
        </div>
      </div>
      <div className="min-w-0 lg:grid lg:gap-0.5">
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:mt-0">{formatMonthLabel(award.month)}</p>
        <p className="mt-1 truncate text-sm font-bold text-foreground md:text-base lg:mt-0">{award.playerName}</p>
        {isSelected && <p className="mt-1 hidden text-[10px] font-black uppercase tracking-[0.14em] text-primary lg:block">Viewing</p>}
      </div>
    </button>
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

function EmptyPoster() {
  return (
    <PosterFrame className="grid place-items-center rounded-[2rem] border border-dashed border-border bg-white/60 px-6 text-center shadow-inner">
      <div className="grid gap-4">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary/5 text-primary">
          <TrophyIcon className="size-8" />
        </div>
        <div className="grid gap-1">
          <h2 className="font-heading text-2xl font-black">Belum ada MVP</h2>
          <p className="mx-auto max-w-[14rem] text-sm text-muted-foreground">Upload pemenang bulan ini untuk mulai bikin MVP poster.</p>
        </div>
      </div>
    </PosterFrame>
  )
}

function ShareActionButton({ description, disabled, icon, isLoading, label, onClick }: {
  description: string
  disabled: boolean
  icon: React.ReactNode
  isLoading: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-3xl border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="font-heading text-base font-black">{isLoading ? 'Generating...' : label}</span>
        <span className="text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 px-5 backdrop-blur-sm"><div className="grid w-full max-w-sm justify-items-center gap-5 rounded-[2rem] bg-zinc-950 p-7 text-center text-white shadow-2xl"><TrophyIcon className="size-16 text-primary" /><h2 className="font-heading text-3xl font-black uppercase italic">MVP Updated!</h2><Button type="button" className="h-12 w-full" onClick={onClose}>Lihat MVP</Button></div></div>
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-4', className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.7 6.8-4.4" />
      <path d="m8.6 13.3 6.8 4.4" />
    </svg>
  )
}

function BasketballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-8 md:size-9', className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9">
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 3.2v17.6" />
      <path d="M3.2 12h17.6" />
      <path d="M5.8 5.8c2.1 2.5 4.2 3.8 6.2 3.8s4.1-1.3 6.2-3.8" />
      <path d="M5.8 18.2c2.1-2.5 4.2-3.8 6.2-3.8s4.1 1.3 6.2 3.8" />
    </svg>
  )
}

function HoopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-8 md:size-9', className)} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
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
