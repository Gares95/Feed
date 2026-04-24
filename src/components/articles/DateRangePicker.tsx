"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  DATE_RANGE_LABELS,
  type DateRange,
} from "@/lib/date-range";
import type { DateRangeSelection } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const PRESETS: DateRange[] = ["all", "today", "week", "month"];

interface DateRangePickerProps {
  range: DateRange;
  from?: Date;
  to?: Date;
  onChange: (next: DateRangeSelection) => void;
}

export function DateRangePicker({
  range,
  from,
  to,
  onChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(to);

  const label =
    range === "custom" && (from || to)
      ? formatRangeLabel(from, to)
      : DATE_RANGE_LABELS[range];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraftFrom(from);
      setDraftTo(to);
    }
  }

  function selectPreset(preset: DateRange) {
    onChange({ range: preset });
    setOpen(false);
  }

  function handleRangeSelect(
    value: { from?: Date; to?: Date } | undefined,
  ) {
    const next = value ?? {};
    setDraftFrom(next.from);
    setDraftTo(next.to);
    if (next.from && next.to) {
      onChange({ range: "custom", from: next.from, to: next.to });
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="ml-auto flex h-6 items-center gap-1 rounded border-none bg-transparent px-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Filter by date"
          >
            <span>{label}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          <div className="flex w-32 flex-col gap-0.5 border-r p-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectPreset(preset)}
                className={cn(
                  "rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                  range === preset && "bg-accent text-accent-foreground",
                )}
              >
                {DATE_RANGE_LABELS[preset]}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <div
              className={cn(
                "rounded px-2 py-1.5 text-left text-xs text-muted-foreground",
                range === "custom" && "bg-accent text-accent-foreground",
              )}
            >
              {DATE_RANGE_LABELS.custom}
            </div>
          </div>
          <div className="p-2">
            <DayPicker
              mode="range"
              selected={{ from: draftFrom, to: draftTo }}
              onSelect={handleRangeSelect}
              defaultMonth={from ?? to ?? new Date()}
              disabled={{ after: new Date() }}
              showOutsideDays
              classNames={{
                root: "text-sm",
                months: "flex flex-col gap-2",
                month: "space-y-2",
                month_caption: "flex items-center justify-center px-8 py-1 text-sm font-medium",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1",
                button_previous:
                  "absolute left-2 top-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground",
                button_next:
                  "absolute right-2 top-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground",
                chevron: "h-3.5 w-3.5 fill-current",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                  "w-8 text-[0.7rem] font-normal text-muted-foreground",
                week: "flex w-full",
                day: "h-8 w-8 p-0 text-center text-xs",
                day_button:
                  "inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-40",
                today: "font-semibold text-accent-foreground",
                selected:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                range_start:
                  "bg-primary text-primary-foreground rounded-l",
                range_end:
                  "bg-primary text-primary-foreground rounded-r",
                range_middle:
                  "bg-accent text-accent-foreground rounded-none",
                outside: "text-muted-foreground/40",
                disabled: "text-muted-foreground/30",
                hidden: "invisible",
              }}
            />
            <div className="mt-1 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">
                {draftFrom
                  ? format(draftFrom, "MMM d, yyyy")
                  : "Start date…"}
                {" – "}
                {draftTo ? format(draftTo, "MMM d, yyyy") : "End date…"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setDraftFrom(undefined);
                  setDraftTo(undefined);
                }}
                disabled={!draftFrom && !draftTo}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatRangeLabel(from?: Date, to?: Date): string {
  if (from && to) {
    const sameYear = from.getFullYear() === to.getFullYear();
    return sameYear
      ? `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`
      : `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
  }
  if (from) return `From ${format(from, "MMM d, yyyy")}`;
  if (to) return `Until ${format(to, "MMM d, yyyy")}`;
  return DATE_RANGE_LABELS.custom;
}
