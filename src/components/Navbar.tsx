import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ShoppingBag, LogOut, User, Store, Shield } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Marketplace", to: "/marketplace" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, role } = useAuth();

  const isSeller = role === "seller" || role === "admin";
  const isAdmin = role === "admin";
  const dashboardLink = isSeller ? "/seller" : "/buyer";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">Ullas</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-body text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to={dashboardLink}><User className="w-4 h-4 mr-1" /> Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary">
                  <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin</Link>
                </Button>
              )}
              {!isSeller && !isAdmin && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/become-seller"><Store className="w-4 h-4 mr-1" /> Become Seller</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log In</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Start Selling</Link>
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`font-body text-base py-2 ${location.pathname === link.to ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                {user ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={dashboardLink} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary">
                        <Link to="/admin" onClick={() => setMobileOpen(false)}>
                          <Shield className="w-4 h-4 mr-1" /> Admin Panel
                        </Link>
                      </Button>
                    )}
                    {!isSeller && !isAdmin && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/become-seller" onClick={() => setMobileOpen(false)}>Become Seller</Link>
                      </Button>
                    )}
                    <Button variant="warm" size="sm" onClick={() => { signOut(); setMobileOpen(false); }}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
                    </Button>
                    <Button variant="hero" size="sm" asChild>
                      <Link to="/signup" onClick={() => setMobileOpen(false)}>Start Selling</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
