import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import ImpactSection from "@/components/landing/ImpactSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import CategoriesSection from "@/components/landing/CategoriesSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ImpactSection />
      <FeaturesSection />
      <CategoriesSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
