import type { ComponentType } from "react";

import { Card } from "@inboxkit-assignment/ui/components/ui/card";
import { cn } from "@inboxkit-assignment/ui/lib/utils";

interface StepCardProps {
  step: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function StepCard({
  step,
  icon: Icon,
  title,
  description,
  children,
  className,
}: StepCardProps) {
  return (
    <Card variant="outline" className={cn("row-span-2 grid grid-rows-subgrid", className)}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-primary/60 text-xs font-semibold">{step}</span>
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-foreground font-medium">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div aria-hidden className="flex h-44 items-center justify-center pt-4">
        {children}
      </div>
    </Card>
  );
}
