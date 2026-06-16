import { Card } from "@inboxkit-assignment/ui/components/ui/card";
import { IconLock } from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { Button } from "./button";

export function Features({ playersUrls }: { playersUrls: string[] }) {
  return (
    <section className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <h2 className="text-balance font-serif text-4xl font-semibold">
            Built for Competitive Grid Battles
          </h2>
          <p className="text-muted-foreground mt-4 text-balance">
            Everything you need to jump into a fast-paced match with friends.
          </p>
        </div>
        <div className="@xl:grid-cols-2 mt-12 grid gap-3 *:p-6">
          <Card variant="outline" className="row-span-2 grid grid-rows-subgrid">
            <div className="space-y-2">
              <h3 className="text-foreground font-medium">Real-Time Multiplayer</h3>
              <p className="text-muted-foreground text-sm">
                Battle live opponents in shared sessions with instant sync across all players.
              </p>
            </div>
            <div aria-hidden className="flex h-44 items-center justify-center gap-6 pt-6">
              <div className="flex gap-1">
                {playersUrls.map((url, i) => {
                  return (
                    <div
                      className={cn(
                        "size-14 bg-foreground rounded-2xl",
                        `${i === 1 || i === 2 ? "" : "mt-4"}`,
                      )}
                    >
                      <img src={url} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card variant="outline" className="row-span-2 grid grid-rows-subgrid overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-foreground font-medium">Battle Grid</h3>
              <p className="text-muted-foreground text-sm">
                Claim territory on a shared tactical grid where every cell counts.
              </p>
            </div>
            <div aria-hidden className="relative h-44 translate-y-6 pt-6">
              <div className="bg-foreground/10 absolute inset-0 mx-auto w-px"></div>
              <div className="absolute -inset-x-16 top-6 aspect-square rounded-full border"></div>
              <div className="border-primary mask-l-from-50% mask-l-to-90% mask-r-from-50% mask-r-to-50% absolute -inset-x-16 top-6 aspect-square rounded-full border"></div>
              <div className="absolute -inset-x-8 top-24 aspect-square rounded-full border"></div>
              <div className="mask-r-from-50% mask-r-to-90% mask-l-from-50% mask-l-to-50% absolute -inset-x-8 top-24 aspect-square rounded-full border border-lime-500"></div>
            </div>
          </Card>

          <Card variant="outline" className="row-span-2 grid grid-rows-subgrid overflow-hidden">
            <div className="space-y-2">
              <h3 className="text-foreground font-medium">15-Second Turns</h3>
              <p className="text-muted-foreground text-sm">
                Keep the pressure on with quick turns that reward fast decisions.
              </p>
            </div>
            <div
              aria-hidden
              className="*:bg-foreground/15 flex h-44 justify-between pb-6 pt-12 *:h-full *:w-px"
            >
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div className="bg-primary!"></div>
            </div>
          </Card>

          <Card variant="outline" className="row-span-2 grid grid-rows-subgrid">
            <div className="space-y-2">
              <h3 className="font-medium">Private Rooms</h3>
              <p className="text-muted-foreground text-sm">
                Create invite-only sessions and play exclusively with your friends.
              </p>
            </div>

            <div className=" pointer-events-none overflow-hidden relative flex h-44 items-center justify-center ">
              <div className="z-10 absolute inset-0 translate-x-[44%] translate-y-[40%] ">
                <Button
                  size={"icon"}
                  variant={"destructive"}
                  className=" bg-destructive text-white ring-1 ring-ring shadow-2xs"
                >
                  <IconLock />
                </Button>
              </div>

              <div className="absolute size-full bg-black/20 rounded-lg  "></div>

              <div className="opacity-45 grid grid-cols-2 gap-1 rounded-2xl ring-1 ring-border p-18">
                {playersUrls.map((url) => {
                  return (
                    <div className="bg-foreground rounded-2xl ">
                      <img src={url} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
