// app/self-calendar/page.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

type DayId =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type BlockType = "health" | "work" | "chores" | "social" | "routine";

type Block = {
  id: string;
  title: string;
  start: string; // "06:00"
  end: string; // "07:00"
  type: BlockType;
  note?: string;
};

const DAYS: { id: DayId; label: string }[] = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

/**
 * TODAY-ONLY MODE
 * - When true, today's column uses TODAY_OVERRIDE instead of SCHEDULE[todayId].
 * - Tomorrow, just set this to false to go back to normal weekly schedule.
 */
const USE_TODAY_OVERRIDE = true;

// 🔥 Custom rescue plan for *today* only
const TODAY_OVERRIDE: Block[] = [
  {
    id: "today-reset",
    title: "Quick reset – water, breathe, check plan",
    start: "15:30",
    end: "15:45",
    type: "routine",
  },
  {
    id: "today-clean-house",
    title: "Deep clean – house (get dirty once)",
    start: "15:45",
    end: "16:45",
    type: "chores",
    note: "Focus: floor, dust, bathroom surfaces, kitchen counters.",
  },
  {
    id: "today-start-cooking",
    title: "Start cooking – simple meal on low heat",
    start: "16:45",
    end: "17:15",
    type: "health",
    note: "Something you can leave on: rice, sauce, lentils, etc.",
  },
  {
    id: "today-change-gas",
    title: "Change gas for bathroom (hot water ready)",
    start: "17:15",
    end: "17:30",
    type: "chores",
  },
  {
    id: "today-laundry",
    title: "Laundry – clothes (machine or handwash)",
    start: "17:30",
    end: "18:00",
    type: "chores",
    note: "Get fresh clothes ready for after shower.",
  },
  {
    id: "today-shower",
    title: "Public shower + adjust everything",
    start: "18:00",
    end: "19:00",
    type: "health",
    note: "Fresh clothes, quick walk back, small reset.",
  },
  {
    id: "today-eat",
    title: "Eat at home + quick kitchen tidy",
    start: "19:00",
    end: "19:30",
    type: "health",
  },
  {
    id: "today-course-or-play",
    title: "Marketing course or play",
    start: "19:30",
    end: "21:00",
    type: "work",
    note: "If brain is cooked, make it pure play with zero guilt.",
  },
  {
    id: "today-chill",
    title: "Light chill / messages",
    start: "21:00",
    end: "21:30",
    type: "social",
  },
  {
    id: "today-sleep-prep",
    title: "Wind down – prepare to sleep",
    start: "21:30",
    end: "22:00",
    type: "routine",
  },
];

// ------- WEEKLY SCHEDULE (DEFAULT RHYTHM) -------
const SCHEDULE: Record<DayId, Block[]> = {
  monday: [
    {
      id: "mon-wakeup",
      title: "Wake up, water, light stretch",
      start: "05:30",
      end: "06:00",
      type: "routine",
    },
    {
      id: "mon-workout",
      title: "Workout",
      start: "06:00",
      end: "07:30",
      type: "health",
    },
    {
      id: "mon-shower",
      title: "Shower + breakfast",
      start: "07:30",
      end: "08:00",
      type: "health",
    },
    {
      id: "mon-app-deep",
      title: "Deep work – App",
      start: "08:00",
      end: "11:00",
      type: "work",
    },
    {
      id: "mon-app-light",
      title: "Light work – App polish",
      start: "11:00",
      end: "12:00",
      type: "work",
    },
    {
      id: "mon-lunch",
      title: "Lunch at home",
      start: "12:00",
      end: "13:00",
      type: "health",
    },
    {
      id: "mon-marketing",
      title: "Marketing – Course intro & notes",
      start: "13:00",
      end: "15:00",
      type: "work",
    },
    {
      id: "mon-flex",
      title: "Flex – App or marketing",
      start: "15:00",
      end: "16:30",
      type: "work",
    },
    {
      id: "mon-chores",
      title: "Chores – Quick tidy",
      start: "16:30",
      end: "17:00",
      type: "chores",
    },
    {
      id: "mon-dinner",
      title: "Walk + cook + eat at home",
      start: "17:00",
      end: "19:00",
      type: "health",
    },
    {
      id: "mon-evening",
      title: "Free time / calls / chill",
      start: "19:00",
      end: "22:00",
      type: "social",
    },
    {
      id: "mon-sleep-prep",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
  tuesday: [
    {
      id: "tue-wakeup",
      title: "Wake up, water, light stretch",
      start: "05:30",
      end: "06:00",
      type: "routine",
    },
    {
      id: "tue-workout",
      title: "Workout",
      start: "06:00",
      end: "07:30",
      type: "health",
    },
    {
      id: "tue-shower",
      title: "Shower + breakfast",
      start: "07:30",
      end: "08:00",
      type: "health",
    },
    {
      id: "tue-marketing-deep",
      title: "Deep work – Marketing course",
      start: "08:00",
      end: "11:00",
      type: "work",
    },
    {
      id: "tue-marketing-plan",
      title: "Marketing – Turn lessons into plan",
      start: "11:00",
      end: "12:00",
      type: "work",
    },
    {
      id: "tue-lunch",
      title: "Lunch at home",
      start: "12:00",
      end: "13:00",
      type: "health",
    },
    {
      id: "tue-launch",
      title: "Launch – First users plan",
      start: "13:00",
      end: "15:00",
      type: "work",
    },
    {
      id: "tue-flex",
      title: "Flex – course / app / messaging",
      start: "15:00",
      end: "16:00",
      type: "work",
    },
    {
      id: "tue-chores",
      title: "Chores – Bathroom + trash",
      start: "16:00",
      end: "16:30",
      type: "chores",
    },
    {
      id: "tue-dinner",
      title: "Walk + cook + eat at home",
      start: "16:30",
      end: "19:00",
      type: "health",
    },
    {
      id: "tue-evening",
      title: "Free time / chill",
      start: "19:00",
      end: "22:00",
      type: "social",
    },
    {
      id: "tue-sleep-prep",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
  wednesday: [
    {
      id: "wed-wakeup",
      title: "Wake up, water, light stretch",
      start: "05:30",
      end: "06:00",
      type: "routine",
    },
    {
      id: "wed-workout",
      title: "Workout",
      start: "06:00",
      end: "07:30",
      type: "health",
    },
    {
      id: "wed-shower",
      title: "Shower + breakfast",
      start: "07:30",
      end: "08:00",
      type: "health",
    },
    {
      id: "wed-landing-deep",
      title: "Deep work – Landing structure & copy",
      start: "08:00",
      end: "11:00",
      type: "work",
    },
    {
      id: "wed-landing-details",
      title: "Landing – Details & flows",
      start: "11:00",
      end: "12:00",
      type: "work",
    },
    {
      id: "wed-lunch",
      title: "Lunch at home",
      start: "12:00",
      end: "13:00",
      type: "health",
    },
    {
      id: "wed-landing-visuals",
      title: "Landing – Visuals & images",
      start: "13:00",
      end: "15:00",
      type: "work",
    },
    {
      id: "wed-flex",
      title: "Flex – adjust copy / visuals",
      start: "15:00",
      end: "16:00",
      type: "work",
    },
    {
      id: "wed-chores",
      title: "Chores – Desk / workspace reset",
      start: "16:00",
      end: "16:30",
      type: "chores",
    },
    {
      id: "wed-dinner",
      title: "Walk + cook + eat at home",
      start: "16:30",
      end: "19:00",
      type: "health",
    },
    {
      id: "wed-evening",
      title: "Free time / chill",
      start: "19:00",
      end: "22:00",
      type: "social",
    },
    {
      id: "wed-sleep-prep",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
  thursday: [
    {
      id: "thu-wakeup",
      title: "Wake up, water, light stretch",
      start: "05:30",
      end: "06:00",
      type: "routine",
    },
    {
      id: "thu-workout",
      title: "Workout",
      start: "06:00",
      end: "07:30",
      type: "health",
    },
    {
      id: "thu-shower",
      title: "Shower + breakfast",
      start: "07:30",
      end: "08:00",
      type: "health",
    },
    {
      id: "thu-landing-polish",
      title: "Deep work – Landing visuals & polish",
      start: "08:00",
      end: "11:00",
      type: "work",
    },
    {
      id: "thu-light",
      title: "Light work – Small UI & text fixes",
      start: "11:00",
      end: "12:00",
      type: "work",
    },
    {
      id: "thu-lunch",
      title: "Lunch at home",
      start: "12:00",
      end: "13:00",
      type: "health",
    },
    {
      id: "thu-flex",
      title: "Flex – leftover work / experiments",
      start: "13:00",
      end: "15:00",
      type: "work",
      note: "Use this if earlier blocks slip or you want to test ideas.",
    },
    {
      id: "thu-open",
      title: "Open – errands / walk / extra rest",
      start: "15:00",
      end: "16:00",
      type: "social",
    },
    {
      id: "thu-chores",
      title: "Chores – Grocery list + small tidy",
      start: "16:00",
      end: "16:30",
      type: "chores",
    },
    {
      id: "thu-dinner",
      title: "Walk + cook + eat at home",
      start: "16:30",
      end: "19:00",
      type: "health",
    },
    {
      id: "thu-evening",
      title: "Free time / chill",
      start: "19:00",
      end: "22:00",
      type: "social",
    },
    {
      id: "thu-sleep-prep",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
  friday: [
    {
      id: "fri-wakeup",
      title: "Wake up, water, light stretch",
      start: "05:30",
      end: "06:00",
      type: "routine",
    },
    {
      id: "fri-workout",
      title: "Short workout",
      start: "06:00",
      end: "07:30",
      type: "health",
    },
    {
      id: "fri-shower",
      title: "Shower + breakfast",
      start: "07:30",
      end: "08:30",
      type: "health",
    },
    {
      id: "fri-review",
      title: "Review – App & landing (no new features)",
      start: "08:30",
      end: "10:00",
      type: "work",
    },
    {
      id: "fri-clean",
      title: "Chores – Full apartment clean",
      start: "10:00",
      end: "11:30",
      type: "chores",
    },
    {
      id: "fri-groceries",
      title: "Groceries – Weekend with her",
      start: "11:30",
      end: "12:30",
      type: "chores",
    },
    {
      id: "fri-lunch",
      title: "Lunch + get ready",
      start: "12:30",
      end: "13:30",
      type: "health",
    },
    {
      id: "fri-buffer",
      title: "Buffer / wait for her",
      start: "13:30",
      end: "14:00",
      type: "social",
    },
    {
      id: "fri-gf",
      title: "Time with my girlfriend 💛",
      start: "14:00",
      end: "23:00",
      type: "social",
    },
    {
      id: "fri-sleep-prep",
      title: "Wind down – slow, no screens, sleep",
      start: "23:00",
      end: "23:30",
      type: "routine",
    },
  ],
  saturday: [
    {
      id: "sat-wakeup",
      title: "Wake up slowly, coffee, phone-free 15 min",
      start: "08:30",
      end: "09:00",
      type: "routine",
    },
    {
      id: "sat-morning",
      title: "Slow morning / breakfast",
      start: "09:00",
      end: "10:00",
      type: "health",
    },
    {
      id: "sat-time",
      title: "Time with girlfriend / relax",
      start: "10:00",
      end: "13:00",
      type: "social",
    },
    {
      id: "sat-optional",
      title: "Optional – light review / ideas",
      start: "16:00",
      end: "18:00",
      type: "work",
      note: "Max 1–2h, only if you feel like it.",
    },
    {
      id: "sat-sleep-prep",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
  // Normal Sunday rhythm (used when USE_TODAY_OVERRIDE = false)
  sunday: [
    {
      id: "sun-wakeup",
      title: "Wake up, slow start, coffee",
      start: "09:30",
      end: "10:00",
      type: "routine",
    },
    {
      id: "sun-groceries",
      title: "Groceries – weekly basics",
      start: "10:00",
      end: "11:00",
      type: "chores",
    },
    {
      id: "sun-clean",
      title: "House reset + laundry",
      start: "11:00",
      end: "12:00",
      type: "chores",
    },
    {
      id: "sun-shower-default",
      title: "Shower + reset",
      start: "12:00",
      end: "12:30",
      type: "health",
    },
    {
      id: "sun-rest-default",
      title: "Rest / free time",
      start: "16:00",
      end: "22:00",
      type: "social",
    },
    {
      id: "sun-sleep-prep-default",
      title: "Wind down – prepare to sleep",
      start: "22:00",
      end: "22:30",
      type: "routine",
    },
  ],
};

function blockColor(type: BlockType): string {
  switch (type) {
    case "routine":
      return "bg-neutral-100 text-neutral-700 border-neutral-300";
    case "health":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    case "work":
      return "bg-indigo-100 text-indigo-900 border-indigo-200";
    case "chores":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "social":
      return "bg-rose-100 text-rose-900 border-rose-200";
    default:
      return "bg-slate-100 text-slate-900 border-slate-300";
  }
}

function dotColor(type: BlockType): string {
  switch (type) {
    case "routine":
      return "bg-neutral-500";
    case "health":
      return "bg-emerald-500";
    case "work":
      return "bg-indigo-500";
    case "chores":
      return "bg-amber-500";
    case "social":
      return "bg-rose-500";
    default:
      return "bg-slate-500";
  }
}

// Helper to get today's DayId
function getTodayId(): DayId {
  const map: DayId[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const idx = new Date().getDay(); // 0-6
  return map[idx] ?? "monday";
}

// "HH:MM" -> minutes from midnight
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

// Check if now is inside block
function isBlockActive(block: Block, nowMinutes: number | null): boolean {
  if (nowMinutes == null) return false;
  const start = timeToMinutes(block.start);
  const end = timeToMinutes(block.end);
  return nowMinutes >= start && nowMinutes < end;
}

export default function SelfCalendarPage() {
  const todayId = getTodayId();

  // Compute current time once per load
  const [nowMinutes] = React.useState<number | null>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // 🔁 Hard refresh the page every minute
  React.useEffect(() => {
    const id = setInterval(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Yazid’s Focus Week
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              A visual weekly rhythm for workouts, deep work, chores, and time
              with your girlfriend.
            </p>
            {nowMinutes != null && (
              <p className="mt-1 text-xs text-neutral-500">
                Current time:{" "}
                <span className="font-mono">
                  {String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:
                  {String(nowMinutes % 60).padStart(2, "0")}
                </span>
              </p>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <LegendPill label="Routine (wake / sleep)" type="routine" />
            <LegendPill label="Health" type="health" />
            <LegendPill label="Work" type="work" />
            <LegendPill label="Chores" type="chores" />
            <LegendPill label="Social / Free" type="social" />
          </div>
        </header>

        {/* Calendar grid */}
        <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid h-full gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {DAYS.map((day) => {
              const isToday = day.id === todayId;

              // Use today override if enabled, otherwise normal schedule
              let blocks: Block[] = SCHEDULE[day.id] || [];
              if (isToday && USE_TODAY_OVERRIDE) {
                blocks = TODAY_OVERRIDE;
              }

              return (
                <div
                  key={day.id}
                  className={cn(
                    "flex flex-col rounded-xl border border-neutral-100 bg-neutral-50/80 transition-shadow",
                    isToday &&
                      "border-neutral-400 bg-neutral-50 shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {day.label}
                    </div>
                    {isToday && (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-2 py-2">
                    {blocks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-3 py-4 text-xs text-neutral-400">
                        No planned blocks – free day.
                      </div>
                    )}
                    {blocks.map((block) => {
                      const active =
                        isToday && isBlockActive(block, nowMinutes);

                      return (
                        <div
                          key={block.id}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                            "flex flex-col gap-1",
                            blockColor(block.type),
                            isToday &&
                              !active &&
                              "opacity-35 transition-opacity",
                            isToday && active && "opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                dotColor(block.type)
                              )}
                            />
                            <span className="font-medium leading-tight">
                              {block.title}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-600">
                            {block.start} – {block.end}
                          </div>
                          {block.note && (
                            <div className="text-[11px] text-neutral-700">
                              {block.note}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          You can tweak the themed blocks in <code>SCHEDULE</code> above as your
          routine evolves. For one-off rescue days, use{" "}
          <code>USE_TODAY_OVERRIDE</code> and <code>TODAY_OVERRIDE</code>.
        </p>
      </div>
    </div>
  );
}

function LegendPill({ label, type }: { label: string; type: BlockType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        "bg-white text-neutral-700 border-neutral-200"
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full", dotColor(type))}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
