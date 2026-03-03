import { Link } from "react-router-dom";
import { ShoppingBag, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-maroon-deep text-secondary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-6 h-6 text-gold" />
              <span className="font-display text-xl font-bold text-gold">Ullas</span>
            </Link>
            <p className="text-sm text-secondary-foreground/70 leading-relaxed">
              Empowering rural women entrepreneurs through direct market access. Every purchase supports a family.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-gold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><Link to="/marketplace" className="hover:text-gold transition-colors">Marketplace</Link></li>
              <li><Link to="/about" className="hover:text-gold transition-colors">About Us</Link></li>
              <li><Link to="/" className="hover:text-gold transition-colors">Success Stories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-gold mb-4">For Sellers</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><Link to="/signup" className="hover:text-gold transition-colors">Start Selling</Link></li>
              <li><Link to="/" className="hover:text-gold transition-colors">Seller Guide</Link></li>
              <li><Link to="/" className="hover:text-gold transition-colors">FSSAI Info</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-gold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><Link to="/" className="hover:text-gold transition-colors">Help Center</Link></li>
              <li><Link to="/" className="hover:text-gold transition-colors">Contact Us</Link></li>
              <li><Link to="/" className="hover:text-gold transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-secondary-foreground/50">
            © 2026 Ullas – The Joy of Growth. All rights reserved.
          </p>
          <p className="text-xs text-secondary-foreground/50 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-gold fill-gold" /> for Kudumbashree women
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
