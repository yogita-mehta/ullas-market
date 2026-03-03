import { Star, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  name: string;
  localName?: string;
  seller: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  category: string;
  verified?: boolean;
}

const ProductCard = ({
  name,
  localName,
  seller,
  location,
  price,
  rating,
  image,
  category,
  verified = true,
}: ProductCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-foreground font-body text-xs">
            {category}
          </Badge>
        </div>
        {verified && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-accent text-accent-foreground font-body text-xs">
              ✓ FSSAI
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground text-base mb-0.5">
          {name}
        </h3>
        {localName && (
          <p className="text-xs text-muted-foreground font-body italic mb-2">
            {localName}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body mb-3">
          <span className="font-medium text-foreground">{seller}</span>
          <span>·</span>
          <MapPin className="w-3 h-3" />
          <span>{location}</span>
        </div>

        <div className="flex items-center justify-between">
          <p className="font-body font-bold text-lg text-primary">₹{price}</p>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-gold fill-gold" />
            <span className="text-sm font-body font-medium text-foreground">
              {rating}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
