import { motion } from "framer-motion";
import { Users, Package, MapPin, TrendingUp } from "lucide-react";

const stats = [
  { icon: Users, value: "10,000+", label: "Women Empowered", color: "text-gold" },
  { icon: Package, value: "500+", label: "Products Listed", color: "text-forest" },
  { icon: MapPin, value: "50+", label: "Cities Served", color: "text-primary" },
  { icon: TrendingUp, value: "₹2Cr+", label: "Earnings Generated", color: "text-maroon" },
];

const ImpactSection = () => {
  return (
    <section className="py-20 bg-warm-gradient">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Our Impact
          </h2>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Every product sold creates ripples of change across communities
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 text-center shadow-card hover:shadow-elevated transition-shadow duration-300"
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-3 ${stat.color}`} />
              <p className="text-3xl font-display font-bold text-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactSection;
