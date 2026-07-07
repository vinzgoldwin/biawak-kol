import { useMemo, useState, type FormEvent } from 'react'
import { Award, CalendarDays, Plus, Sparkles, Target, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MonthlyAwardScreen } from './monthly-award-screen'
import type { HistoryGame, RosterPlayer } from './data'
import type { MonthlyAward, UploadMonthlyAwardInput } from './remote-awards'
import type { MonthlyAchievement, SaveMonthlyAchievementInput } from './remote-achievements'

type MonthOption = { value: string; label: string }
type AwardSaveInput = Omit<UploadMonthlyAwardInput, 'accessCode'>
type AchievementSaveInput = Omit<SaveMonthlyAchievementInput, 'accessCode'>
type AwardsTab = 'mvp' | 'achievements'

const categorySuggestions = ['Most Three Point', 'Best Defender', 'Top Scorer', 'Hustle Player']

export function AwardsScreen({
  awards,
  achievements,
  monthOptions,
  rosterPlayers,
  historyGames,
  isSavingAward,
  isSavingAchievement,
  onSaveAward,
  onSaveAchievement,
}: {
  awards: MonthlyAward[]
  achievements: MonthlyAchievement[]
  monthOptions: MonthOption[]
  rosterPlayers: RosterPlayer[]
  historyGames: HistoryGame[]
  isSavingAward: boolean
  isSavingAchievement: boolean
  onSaveAward: (input: AwardSaveInput, onSuccess: () => void) => void
  onSaveAchievement: (input: AchievementSaveInput, onSuccess: () => void) => void
}) {
  const [activeTab, setActiveTab] = useState<AwardsTab>('mvp')

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 mx-auto flex max-w-7xl justify-center bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:justify-start lg:px-8">
        <div className="grid w-full max-w-sm grid-cols-2 rounded-2xl border border-emerald-900/10 bg-emerald-950/[0.045] p-1 shadow-sm" role="tablist" aria-label="Award type">
          <AwardTab active={activeTab === 'mvp'} icon={<Trophy className="size-4" />} label="MVP" onClick={() => setActiveTab('mvp')} />
          <AwardTab active={activeTab === 'achievements'} icon={<Award className="size-4" />} label="Achievements" onClick={() => setActiveTab('achievements')} />
        </div>
      </div>

      {activeTab === 'mvp' ? (
        <MonthlyAwardScreen
          awards={awards}
          monthOptions={monthOptions}
          rosterPlayers={rosterPlayers}
          historyGames={historyGames}
          isSaving={isSavingAward}
          onSave={onSaveAward}
        />
      ) : (
        <MonthlyAchievementScreen
          achievements={achievements}
          monthOptions={monthOptions}
          rosterPlayers={rosterPlayers}
          isSaving={isSavingAchievement}
          onSave={onSaveAchievement}
        />
      )}
    </div>
  )
}

function AwardTab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'bg-white text-emerald-950 shadow-sm ring-1 ring-black/[0.04]' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function MonthlyAchievementScreen({ achievements, monthOptions, rosterPlayers, isSaving, onSave }: {
  achievements: MonthlyAchievement[]
  monthOptions: MonthOption[]
  rosterPlayers: RosterPlayer[]
  isSaving: boolean
  onSave: (input: AchievementSaveInput, onSuccess: () => void) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? '')
  const visibleAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.month === selectedMonth),
    [achievements, selectedMonth],
  )
  const selectedMonthLabel = monthOptions.find((option) => option.value === selectedMonth)?.label ?? selectedMonth

  return (
    <section className="relative mx-auto min-h-[42rem] max-w-7xl overflow-hidden px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-9">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_6%,rgba(0,130,54,0.13),transparent_32%),linear-gradient(180deg,#fff_0%,#f6fbf7_100%)]" />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h1 className="font-heading text-4xl font-black leading-none tracking-tight text-emerald-950 lg:text-5xl">Achievement Wall</h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground lg:text-base">Celebrate every kind of impact — from three-pointers to defense, hustle, and the moments only your crew remembers.</p>
        </div>
        <Button type="button" className="h-11 rounded-2xl px-5 shadow-sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New category
        </Button>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="grid gap-4 lg:sticky lg:top-20">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-950">
            Award month
            <MonthSelect value={selectedMonth} options={monthOptions} onValueChange={setSelectedMonth} />
          </label>

          <div className="relative overflow-hidden rounded-[1.75rem] bg-emerald-950 p-5 text-white shadow-[0_20px_50px_rgba(3,54,31,0.18)]">
            <div aria-hidden className="absolute -right-8 -top-8 size-32 rounded-full border-[20px] border-white/[0.04]" />
            <Sparkles className="size-6 text-emerald-300" />
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/75">{selectedMonthLabel}</p>
            <strong className="mt-1 block font-heading text-4xl font-black">{visibleAchievements.length}</strong>
            <p className="mt-1 text-sm text-white/65">{visibleAchievements.length === 1 ? 'achievement category' : 'achievement categories'}</p>
          </div>
        </aside>

        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-4 border-b border-emerald-900/10 pb-3">
            <h2 className="font-heading text-lg font-black text-emerald-950">{selectedMonthLabel}</h2>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Monthly honors</span>
          </div>

          {visibleAchievements.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleAchievements.map((achievement, index) => (
                <AchievementCard key={achievement.id} achievement={achievement} index={index} />
              ))}
            </div>
          ) : (
            <AchievementEmptyState onCreate={() => setDialogOpen(true)} />
          )}
        </div>
      </div>

      <AchievementDialog
        open={dialogOpen}
        month={selectedMonth}
        monthOptions={monthOptions}
        players={rosterPlayers.filter((player) => player.isRepeatable !== true)}
        isSaving={isSaving}
        onOpenChange={setDialogOpen}
        onSave={onSave}
      />
    </section>
  )
}

function AchievementCard({ achievement, index }: { achievement: MonthlyAchievement; index: number }) {
  const initials = achievement.playerName?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <article className="group relative min-h-52 overflow-hidden rounded-[1.75rem] border border-emerald-900/10 bg-white p-5 shadow-[0_14px_40px_rgba(0,64,32,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(0,64,32,0.11)]">
      <span className="absolute right-4 top-3 font-heading text-6xl font-black text-emerald-950/[0.045]">{String(index + 1).padStart(2, '0')}</span>
      <div className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 transition group-hover:rotate-3 group-hover:scale-105">
        <Target className="size-5" />
      </div>
      <div className="relative mt-7 grid gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Achievement</p>
        <h3 className="font-heading text-2xl font-black leading-tight tracking-tight text-emerald-950">{achievement.category}</h3>
        {achievement.playerName ? (
          <div className="mt-3 flex items-center gap-3 border-t border-emerald-900/10 pt-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-950 text-xs font-black text-white">{initials}</span>
            <span className="min-w-0">
              <strong className="block truncate text-sm text-emerald-950">{achievement.playerName}</strong>
              {achievement.detail && <span className="block truncate text-xs text-muted-foreground">{achievement.detail}</span>}
            </span>
          </div>
        ) : (
          <div className="mt-3 grid gap-1 border-t border-emerald-900/10 pt-4 text-sm text-muted-foreground">
            <p>Winner can be assigned later.</p>
            {achievement.detail && <p className="font-semibold text-emerald-800">{achievement.detail}</p>}
          </div>
        )}
      </div>
    </article>
  )
}

function AchievementEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-emerald-900/20 bg-white/60 px-6 py-12 text-center shadow-inner">
      <div className="grid max-w-sm justify-items-center gap-4">
        <div className="grid size-16 place-items-center rounded-3xl bg-emerald-100 text-emerald-800"><Award className="size-8" /></div>
        <div className="grid gap-1.5">
          <h2 className="font-heading text-2xl font-black text-emerald-950">Make this month memorable</h2>
          <p className="text-sm leading-6 text-muted-foreground">Create the first category for this month. Start with “Most Three Point” or make one that belongs to your court.</p>
        </div>
        <Button type="button" variant="outline" className="mt-1 rounded-2xl bg-white" onClick={onCreate}>Create category</Button>
      </div>
    </div>
  )
}

function AchievementDialog({ open, month, monthOptions, players, isSaving, onOpenChange, onSave }: {
  open: boolean
  month: string
  monthOptions: MonthOption[]
  players: RosterPlayer[]
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: AchievementSaveInput, onSuccess: () => void) => void
}) {
  const [formMonth, setFormMonth] = useState(month)
  const [category, setCategory] = useState('')
  const [playerId, setPlayerId] = useState('unassigned')
  const [detail, setDetail] = useState('')
  const selectedPlayer = players.find((player) => player.id === playerId)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formMonth || !category.trim()) return

    onSave({
      month: formMonth,
      category: category.trim(),
      ...(selectedPlayer ? { playerId: selectedPlayer.id, playerName: selectedPlayer.name } : {}),
      ...(detail.trim() ? { detail: detail.trim() } : {}),
    }, () => {
      onOpenChange(false)
      setCategory('')
      setPlayerId('unassigned')
      setDetail('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) setFormMonth(month)
      onOpenChange(nextOpen)
    }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[430px] overflow-y-auto rounded-[2rem] p-6 md:max-w-[470px]">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Award className="size-5" /></div>
            <DialogTitle className="font-heading text-2xl font-black tracking-tight">New achievement category</DialogTitle>
            <DialogDescription>Choose the month first, then name the honor. Winner and result are optional.</DialogDescription>
            <DialogCloseButton />
          </DialogHeader>

          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em]">
            <span>Month <span className="text-destructive">*</span></span>
            <MonthSelect value={formMonth} options={monthOptions} onValueChange={setFormMonth} />
          </label>

          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em]">
            <span>Category name <span className="text-destructive">*</span></span>
            <Input autoFocus maxLength={60} value={category} placeholder="e.g. Most Three Point" className="h-12 rounded-2xl px-4 text-base font-semibold normal-case tracking-normal" onChange={(event) => setCategory(event.target.value)} />
          </label>

          <div className="flex flex-wrap gap-2" aria-label="Category suggestions">
            {categorySuggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 transition hover:border-primary/30 hover:bg-primary/10" onClick={() => setCategory(suggestion)}>{suggestion}</button>
            ))}
          </div>

          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em]">
            <span>Player <span className="font-semibold normal-case tracking-normal text-muted-foreground">(optional)</span></span>
            <Select value={playerId} onValueChange={(value) => value && setPlayerId(value)}>
              <SelectTrigger className="h-12 w-full rounded-2xl bg-background px-4 text-base font-semibold normal-case tracking-normal"><SelectValue /></SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectGroup>
                  <SelectItem value="unassigned">Assign later</SelectItem>
                  {players.map((player) => <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em]">
            <span>Result <span className="font-semibold normal-case tracking-normal text-muted-foreground">(optional)</span></span>
            <Input maxLength={100} value={detail} placeholder="e.g. 18 three-pointers" className="h-12 rounded-2xl px-4 text-base normal-case tracking-normal" onChange={(event) => setDetail(event.target.value)} />
          </label>

          <DialogFooter className="gap-2 sm:grid sm:grid-cols-[1fr_1.4fr]">
            <Button type="button" variant="ghost" className="h-11 rounded-2xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="h-11 rounded-2xl" disabled={!formMonth || !category.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Add achievement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MonthSelect({ value, options, onValueChange }: { value: string; options: MonthOption[]; onValueChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue)} items={options}>
      <SelectTrigger className="h-12 w-full rounded-2xl border-emerald-900/10 bg-white px-4 text-base font-bold normal-case tracking-normal shadow-sm">
        <CalendarDays className="size-4 text-primary" />
        <SelectValue placeholder="Choose month" />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup>
      </SelectContent>
    </Select>
  )
}
