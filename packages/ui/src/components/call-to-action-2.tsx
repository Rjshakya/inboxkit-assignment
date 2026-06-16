import { Button } from "@inboxkit-assignment/ui/components/button";
import { Card } from "@inboxkit-assignment/ui/components/ui/card";
import { IconArrowRight } from "@tabler/icons-react";

export function CallToAction() {
  return (
    <section className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-6">
        <Card variant="outline" className="p-8 md:p-12">
          <div className="text-muted-foreground mb-6 text-sm font-medium">Limited Time Offer</div>
          <h2 className="text-balance font-serif text-3xl font-semibold md:text-4xl">
            Ready to Conquer the Grid?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md text-balance">
            Create your first game room and challenge your friends in under a minute.
          </p>
          <Button className="mt-8 gap-2" render={<a href="#link" />} nativeButton={false}>
            Start game
            <IconArrowRight className="size-4" />
          </Button>
        </Card>
      </div>
    </section>
  );
}
