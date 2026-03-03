import { motion } from "framer-motion";
import productShowcase from "@/assets/product-showcase.webp";

const categories = [
  { name: "Snacks", emoji: "🍿", count: 120 },
  { name: "Pickles", emoji: "🫙", count: 85 },
  { name: "Sweets", emoji: "🍬", count: 64 },
  { name: "Spices", emoji: "🌶️", count: 95 },
  { name: "Ready‑to‑Eat", emoji: "🍛", count: 42 },
];

const CategoriesSection = () => {
  return (
    <section className="py-20 bg-warm-gradient overflow-hidden">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Taste the Tradition
            </h2>
            <p className="text-muted-foreground font-body mb-8 max-w-md">
              Browse authentic homemade delicacies from Kerala's finest home kitchens, crafted with generations of expertise.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat, i) => (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card hover:shadow-elevated transition-all text-left"
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className="font-body font-semibold text-sm text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} items</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-elevated">
              <img
                src={productShowcase}
                alt="Traditional Kerala snacks — banana chips, achappam, and murukku"
                className="w-full h-80 lg:h-96 object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl p-4 shadow-elevated">
              <p className="font-display font-bold text-foreground text-lg">Fresh Today</p>
              <p className="text-sm text-muted-foreground font-body">42 new products listed</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
