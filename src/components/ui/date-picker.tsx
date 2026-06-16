import { useState } from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"

import { CalendarIcon } from "@/icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
}

function toDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const date = parseDateValue(value)

  const selectDate = (selectedDate: Date | undefined) => {
    if (!selectedDate) return

    onChange(toDateValue(selectedDate))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            data-empty={!date}
            className="h-12 w-full justify-start rounded-3xl bg-input/50 text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        <span className={cn(!date && "text-muted-foreground")}>
          {date ? format(date, "PPP", { locale: id }) : "Pilih tanggal"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={selectDate}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
