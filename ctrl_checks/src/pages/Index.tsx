import { Header } from "@/components/landing/Header";
import { LandingLightPillarBackground } from "@/components/landing/LandingLightPillarBackground";
import { Hero } from "@/components/landing/Hero";
import { IntegrationsMarqueeSection } from "@/components/landing/IntegrationsMarqueeSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WorkflowDemoSection } from "@/components/landing/WorkflowDemoSection";
import { OpenCoreSection } from "@/components/landing/OpenCoreSection";
import { PluginsApiSection } from "@/components/landing/PluginsApiSection";
import { IndustryVerticalsSection } from "@/components/landing/IndustryVerticalsSection";
import { WhyCtrlChecksSection } from "@/components/landing/WhyCtrlChecksSection";
import { Pricing } from "@/components/landing/Pricing";
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
          <WorkflowDemoSection />
          <IntegrationsMarqueeSection />
          <HowItWorks />
          <OpenCoreSection />
          <PluginsApiSection />
          <IndustryVerticalsSection />
          <WhyCtrlChecksSection />
          <Pricing />
          <FaqSection />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
