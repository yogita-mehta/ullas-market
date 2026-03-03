import { motion } from "framer-motion";
import { Mic, Shield, Truck, Heart } from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice‑Based Listing",
    description: "Say 'Achappam' or 'Murukku' — our AI translates dialect names into marketplace‑ready listings instantly.",
  },
  {
    icon: Shield,
    title: "FSSAI Verified",
    description: "Every seller is verified for food safety compliance, so buyers can trust every product.",
  },
  {
    icon: Truck,
    title: "Smart Group Shipping",
    description: "Orders from the same region are combined into a single shipment, cutting costs for everyone.",
  },
  {
    icon: Heart,
    title: "Direct to You",
    description: "No middlemen. Sellers keep maximum earnings while buyers get authentic products at fair prices.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            How Ullas Works
          </h2>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Simple for sellers, delightful for buyers
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
