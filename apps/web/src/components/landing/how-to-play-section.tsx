import {
  IconClock,
  IconCopy,
  IconCrown,
  IconDeviceGamepad2,
  IconLink,
  IconShare2,
  IconSwords,
} from "@tabler/icons-react";

import { cn } from "@inboxkit-assignment/ui/lib/utils";

import { StepCard } from "./step-card";

interface HowToPlaySectionProps {
  playersUrls: string[];
}

export function HowToPlaySection({ playersUrls }: HowToPlaySectionProps) {
  return (
    <section id="how-to-play" className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <h2 className="text-balance font-serif text-4xl font-semibold">How to Play</h2>
          <p className="text-muted-foreground mt-4 text-balance">
            Get from lobby to victory in four simple steps.
          </p>
        </div>

        <div className="@xl:grid-cols-2 mt-12 grid gap-3 *:p-6">
          <StepCard
            step="01"
            icon={IconDeviceGamepad2}
            title="Create a Room"
            description="Sign in and generate a private game session with one click."
          >
            <div className="relative">
              <div className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-4 py-2.5 shadow-md">
                <IconDeviceGamepad2 className="size-4" />
                <span className="text-sm font-medium">Create Game</span>
              </div>
              <div className="absolute -bottom-1 -right-1 size-3 rounded-full bg-background ring-2 ring-primary" />
            </div>
          </StepCard>

          <StepCard
            step="02"
            icon={IconShare2}
            title="Invite Friends"
            description="Send the lobby link to other players so they can join instantly."
          >
            <div className="w-full max-w-[220px] space-y-4">
              <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-2">
                <IconLink className="text-muted-foreground size-3.5" />
                <span className="text-muted-foreground truncate text-xs">
                  conquest.io/lobby/a7b2
                </span>
                <IconCopy className="text-muted-foreground ml-auto size-3.5" />
              </div>
              <div className="flex -space-x-2 justify-center">
                {playersUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="size-8 rounded-full object-cover ring-2 ring-background"
                  />
                ))}
              </div>
            </div>
          </StepCard>

          <StepCard
            step="03"
            icon={IconSwords}
            title="Take Turns"
            description="Claim cells on the shared grid during your 15-second turn window."
          >
            <div className="space-y-3">
              <div className="grid grid-cols-8 gap-0.5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-[1px]",
                      i === 17 ? "bg-primary shadow-sm shadow-primary/30" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <div className="bg-primary/10 text-primary mx-auto flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium">
                <IconClock className="size-3" />
                15s turn
              </div>
            </div>
          </StepCard>

          <StepCard
            step="04"
            icon={IconCrown}
            title="Win the Board"
            description="Control the most territory when the grid fills up to win."
          >
            <div className="relative flex items-center justify-center">
              <div className="grid grid-cols-6 gap-0.5 opacity-50">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square rounded-[1px]",
                      i < 9 ? "bg-chart-1" : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <div className="bg-primary text-primary-foreground absolute flex size-14 items-center justify-center rounded-2xl shadow-lg">
                <IconCrown className="size-7" />
              </div>
            </div>
          </StepCard>
        </div>
      </div>
    </section>
  );
}
