import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";
import heroImage from "@/assets/hero-image.webp";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Kudumbashree women entrepreneurs with their homemade products"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-maroon-deep/90 via-transparent to-maroon-deep/60" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-gold/20 text-gold text-sm font-body font-medium mb-6 border border-gold/30">
              🌾 Powered by Kudumbashree
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6"
          >
            <span className="text-cream">Empowering Rural Women</span>
            <br />
            <span className="text-gradient-gold">to Reach Urban Markets</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg text-cream/70 font-body leading-relaxed mb-8 max-w-lg"
          >
            Discover authentic homemade Kerala delicacies — achappam, banana chips,
            pickles & more — crafted by women entrepreneurs. Every purchase changes a life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/marketplace">
                Explore Products <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/signup">
                <Mic className="w-5 h-5" /> Start Selling
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
