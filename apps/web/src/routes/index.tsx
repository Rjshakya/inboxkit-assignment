import { createFileRoute } from "@tanstack/react-router";

import { Footer } from "@/components/landing/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { HowToPlaySection } from "@/components/landing/how-to-play-section";
import { Features } from "@inboxkit-assignment/ui/components/features-1";
import { CallToAction } from "@inboxkit-assignment/ui/components/call-to-action-2";
import { Header } from "@/components/header";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1">
        <Header />
        <HeroSection />
        <HowToPlaySection playersUrls={["/65.png", "/66.png", "/67.png", "/68.png"]} />
        <Features playersUrls={["/65.png", "/66.png", "/67.png", "/68.png"]} />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
