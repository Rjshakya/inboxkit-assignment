import { Button } from "@inboxkit-assignment/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
function HomeComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <h1 className="font-heading text-7xl my-4 mx-2 font-semibold tracking-tighter">Grid lock</h1>
      <div className="grid gap-6">
        <section className=" p-4">
          <Link to={"/game"}>
            <Button className={"px-14 "} size={"lg"}>
              Let's gooooo
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
