import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AddProductDialog from "@/components/AddProductDialog";
import EditProductDialog from "@/components/EditProductDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, ShoppingCart, Bell, Loader2, CheckCircle, Shield, AlertTriangle, XCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";

type Product = Tables<"products">;

interface OrderWithDetails {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  buyer_id: string;
  buyer_name: string | null;
  items: { product_name: string; quantity: number; price: number }[];
}

const SellerDashboard = () => {
  const { user, role } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [fssaiStatus, setFssaiStatus] = useState<string>("pending");
  const [fssaiVerified, setFssaiVerified] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Tables<"products"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch FSSAI verification status (resilient: works with or without new columns)
    const { data: sellerProfile } = await supabase
      .from("seller_profiles")
      .select("fssai_verified, fssai_license")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sellerProfile) {
      const verified = sellerProfile.fssai_verified ?? false;
      setFssaiVerified(verified);
      // Try fetching new columns separately (won't error if they don't exist)
      const { data: extProfile } = await supabase
        .from("seller_profiles")
        .select("fssai_status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (extProfile && 'fssai_status' in extProfile) {
        setFssaiStatus((extProfile as any).fssai_status || (verified ? "approved" : "pending"));
        setRejectionReason((extProfile as any).rejection_reason || null);
      } else {
        // Fallback: derive status from fssai_verified
        setFssaiStatus(verified ? "approved" : "pending");
        setRejectionReason(null);
      }
    }

    // Fetch seller's products
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    setProducts(prods || []);

    // Fetch orders containing seller's products
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id, quantity, price, product_id, products(name)")
      .in("product_id", (prods || []).map((p) => p.id));

    if (orderItems && orderItems.length > 0) {
      const orderIds = [...new Set(orderItems.map((oi) => oi.order_id))];
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, status, payment_status, total, created_at, buyer_id")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      // Get buyer names
      const buyerIds = [...new Set((ordersData || []).map((o) => o.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", buyerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      const enriched: OrderWithDetails[] = (ordersData || []).map((order) => ({
        ...order,
        buyer_name: profileMap.get(order.buyer_id) || "Unknown Buyer",
        items: orderItems
          .filter((oi) => oi.order_id === order.id)
          .map((oi) => ({
            product_name: (oi.products as any)?.name || "Unknown",
            quantity: oi.quantity,
            price: oi.price,
          })),
      }));

      setOrders(enriched);
    } else {
      setOrders([]);
    }

    setLoading(false);

    // Fetch unread notification count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotifications(count || 0);
  };

  const handleEdit = (product: Tables<"products">) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) return;
    setDeletingId(productId);

    // First, delete associated order_items to avoid foreign key constraint violation
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("product_id", productId);

    if (orderItemsError) {
      toast({ title: "Error", description: orderItemsError.message, variant: "destructive" });
      setDeletingId(null);
      return;
    }

    // Now delete the product itself
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product deleted", description: `"${productName}" has been removed.` });
      fetchData();
    }
    setDeletingId(null);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const markDelivered = async (orderId: string) => {
    setUpdatingOrder(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order delivered!", description: "The buyer has been notified." });
      fetchData();
    }
    setUpdatingOrder(null);
  };

  const totalEarnings = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + o.total, 0);

  const activeOrders = orders.filter((o) => o.status === "pending" || o.status === "accepted" || o.status === "shipped").length;

  const stats = [
    { label: "Total Products", value: String(products.length), icon: Package, color: "text-primary" },
    { label: "Total Earnings", value: `₹${totalEarnings.toLocaleString()}`, icon: TrendingUp, color: "text-accent" },
    { label: "Active Orders", value: String(activeOrders), icon: ShoppingCart, color: "text-primary" },
  ];

  const userName = user?.user_metadata?.full_name || "Seller";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container max-w-5xl">
          {/* FSSAI Status Banner */}
          {fssaiStatus === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-body font-semibold text-amber-800 text-sm">
                  FSSAI Verification Under Review
                </p>
                <p className="text-xs text-amber-700 font-body mt-1">
                  Your FSSAI verification is being reviewed by our team. You cannot add products or receive orders until your verification is approved.
                </p>
              </div>
            </motion.div>
          )}

          {fssaiStatus === "rejected" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
            >
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-body font-semibold text-red-800 text-sm">
                  FSSAI Verification Rejected
                </p>
                {rejectionReason && (
                  <p className="text-xs text-red-700 font-body mt-1">
                    <strong>Reason:</strong> {rejectionReason}
                  </p>
                )}
                <p className="text-xs text-red-600 font-body mt-1">
                  Please re-register with valid FSSAI documents to continue selling.
                </p>
              </div>
            </motion.div>
          )}

          {fssaiStatus === "approved" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3"
            >
              <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="font-body font-semibold text-emerald-800 text-sm">
                ✓ FSSAI Verified Seller
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                Seller Dashboard
              </h1>
              <p className="text-muted-foreground font-body">Welcome back, {userName} 👋</p>
            </div>
            <div className="flex gap-3">
              {role === "admin" && (
                <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary">
                  <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin Panel</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild className="relative">
                <Link to="/notifications">
                  <Bell className="w-4 h-4" />
                  <span className="ml-1">Notifications</span>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
                </Link>
              </Button>
              <AddProductDialog onProductAdded={fetchData} disabled={!fssaiVerified} />
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="shadow-card">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                      <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* My Products */}
          <Card className="shadow-card mb-8">
            <CardHeader>
              <CardTitle className="font-display text-lg">My Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-body text-sm">
                    {fssaiVerified
                      ? "No products yet. Add your first product!"
                      : "Complete FSSAI verification to start adding products."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-body font-semibold text-sm text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-body">
                            {p.category} · Stock: {p.stock}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-body font-bold text-primary">₹{p.price}</p>
                        <Badge variant={p.is_active ? "default" : "secondary"} className="text-xs">
                          {p.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(p)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-red-500"
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incoming Orders */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Incoming Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-body text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-body font-semibold text-sm text-foreground">
                            {order.buyer_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-body">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              order.status === "delivered" ? "default" : "outline"
                            }
                            className="text-xs capitalize"
                          >
                            {order.status}
                          </Badge>
                          <Badge
                            variant={
                              order.payment_status === "paid" ? "secondary" : "outline"
                            }
                            className="text-xs capitalize"
                          >
                            {order.payment_status === "paid" ? "💰 Paid" : "Payment Pending"}
                          </Badge>
                          <p className="font-body font-bold text-foreground">₹{order.total}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-body mb-2">
                        {order.items.map((item, i) => (
                          <span key={i}>
                            {item.product_name} x{item.quantity}
                            {i < order.items.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                      {order.payment_status === "paid" && order.status !== "delivered" && (
                        <Button
                          size="sm"
                          onClick={() => markDelivered(order.id)}
                          disabled={updatingOrder === order.id}
                        >
                          {updatingOrder === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Mark as Delivered
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
      <EditProductDialog
        product={editingProduct}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProductUpdated={fetchData}
      />
    </div>
  );
};

export default SellerDashboard;
