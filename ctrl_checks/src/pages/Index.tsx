import { Header } from "@/components/landing/Header";
import { LandingLightPillarBackground } from "@/components/landing/LandingLightPillarBackground";
import { Hero } from "@/components/landing/Hero";
import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TemplateShowcaseSection } from "@/components/landing/TemplateShowcaseSection";
import { OpenCoreSection } from "@/components/landing/OpenCoreSection";
import { PluginsApiSection } from "@/components/landing/PluginsApiSection";
import { IndustryVerticalsSection } from "@/components/landing/IndustryVerticalsSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { WhyCtrlChecksSection } from "@/components/landing/WhyCtrlChecksSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen">
      <LandingLightPillarBackground />
      <div className="relative z-10 bg-transparent">
        <Header />
        <main className="bg-transparent">
          <Hero />
          <IntegrationsMarqueeSection />
          <HowItWorks />
          <TemplateShowcaseSection />
          <OpenCoreSection />
          <PluginsApiSection />
          <IndustryVerticalsSection />
          <TrustSection />
          <WhyCtrlChecksSection />
          <FaqSection />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
