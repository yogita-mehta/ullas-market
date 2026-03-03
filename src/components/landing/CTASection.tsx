import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-hero-gradient rounded-3xl p-10 sm:p-16 text-center overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-cream mb-4">
              Ready to Join the Movement?
            </h2>
            <p className="text-cream/70 font-body max-w-md mx-auto mb-8">
              Whether you're a seller or buyer, be part of a community that's transforming lives
              across Kerala and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Start Selling Today <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/marketplace">Browse Products</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
