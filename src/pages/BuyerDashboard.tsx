import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star, Loader2, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface OrderWithItems {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items: { product_name: string; quantity: number; price: number; seller_name: string }[];
}

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, status, total, created_at")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = ordersData.map((o) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, quantity, price, product_id, products(name, seller_id)")
      .in("order_id", orderIds);

    // Get seller names
    const sellerIds = [...new Set((items || []).map((i) => (i.products as any)?.seller_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", sellerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Seller"]));

    const enriched: OrderWithItems[] = ordersData.map((order) => ({
      ...order,
      items: (items || [])
        .filter((i) => i.order_id === order.id)
        .map((i) => ({
          product_name: (i.products as any)?.name || "Unknown",
          quantity: i.quantity,
          price: i.price,
          seller_name: profileMap.get((i.products as any)?.seller_id) || "Seller",
        })),
    }));

    setOrders(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const markAsPaid = async (orderId: string) => {
    setPayingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment simulated! 💰", description: "Your order has been marked as paid." });
      fetchOrders();
    }
    setPayingId(null);
  };

  const orderCount = orders.length;
  const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              My Orders
            </h1>
            <p className="text-muted-foreground font-body">
              Track your purchases and manage payments
            </p>
          </motion.div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: ShoppingCart, label: "Total Orders", value: String(orderCount) },
              { icon: CreditCard, label: "Paid", value: String(paidOrders) },
              { icon: Star, label: "Pending", value: String(orders.filter((o) => o.status === "pending").length) },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="shadow-card text-center">
                  <CardContent className="p-4">
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Orders list */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-body text-sm mb-4">
                    No orders yet. Start shopping!
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/marketplace">Browse Marketplace</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-body">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              order.status === "completed" ? "default" :
                              order.status === "paid" ? "secondary" : "outline"
                            }
                            className="text-xs capitalize"
                          >
                            {order.status}
                          </Badge>
                          <p className="font-body font-bold text-foreground">₹{order.total}</p>
                        </div>
                      </div>
                      {order.items.map((item, i) => (
                        <div key={i} className="text-sm font-body text-foreground">
                          {item.product_name} x{item.quantity} — <span className="text-muted-foreground">by {item.seller_name}</span>
                        </div>
                      ))}
                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => markAsPaid(order.id)}
                          disabled={payingId === order.id}
                        >
                          {payingId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <CreditCard className="w-4 h-4 mr-1" />
                          )}
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BuyerDashboard;
