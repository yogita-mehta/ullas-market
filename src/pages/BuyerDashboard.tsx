import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ShoppingCart,
  Star,
  Loader2,
  CreditCard,
  Shield,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Phone,
  Trash2,
  AlertTriangle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";



interface OrderWithItems {
  id: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  delivery_status: string | null;
  total: number;
  created_at: string;
  batch_id: string | null;
  address_name: string | null;
  address_village: string | null;
  delivery_partner_name: string | null;
  delivery_partner_phone: string | null;
  seller_id: string | null;
  items: { product_id: string; product_name: string; quantity: number; price: number; seller_name: string }[];
}

const deliverySteps = [
  { key: "pending", label: "Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "packed", label: "Packed", icon: Package },
  { key: "picked_up", label: "Picked Up", icon: Truck },
  { key: "out_for_delivery", label: "On the Way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const BuyerDashboard = () => {
  const { user, role, signOut } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  // Rating state
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, status, payment_status, payment_method, delivery_status, total, created_at, address_id, batch_id")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    // Fetch address info
    const addressIds = ordersData.map((o) => o.address_id).filter(Boolean) as string[];
    let addressMap = new Map<string, { name: string; village: string | null }>();
    if (addressIds.length > 0) {
      const { data: addrData } = await supabase
        .from("addresses")
        .select("id, name, village")
        .in("id", addressIds);
      (addrData || []).forEach((a) => addressMap.set(a.id, { name: a.name, village: a.village }));
    }

    // Fetch batch delivery partner info
    const batchIds = ordersData.map((o) => o.batch_id).filter(Boolean) as string[];
    let partnerMap = new Map<string, { name: string; phone: string | null }>();
    if (batchIds.length > 0) {
      const { data: batchData } = await supabase
        .from("delivery_batches")
        .select("id, delivery_partner")
        .in("id", batchIds);

      const partnerUserIds = (batchData || []).map((b) => b.delivery_partner).filter(Boolean) as string[];
      if (partnerUserIds.length > 0) {
        const { data: partners } = await supabase
          .from("delivery_partners")
          .select("user_id, name, phone")
          .in("user_id", partnerUserIds);

        const partnerByUserId = new Map((partners || []).map((p) => [p.user_id, p]));

        (batchData || []).forEach((b) => {
          if (b.delivery_partner) {
            const partner = partnerByUserId.get(b.delivery_partner);
            if (partner) {
              partnerMap.set(b.id, { name: partner.name, phone: partner.phone });
            }
          }
        });
      }
    }

    const orderIds = ordersData.map((o) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, quantity, price, product_id, products(name, seller_id)")
      .in("order_id", orderIds);

    const sellerIds = [...new Set((items || []).map((i) => (i.products as any)?.seller_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", sellerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Seller"]));

    const enriched: OrderWithItems[] = ordersData.map((order) => {
      const addr = order.address_id ? addressMap.get(order.address_id) : null;
      const partner = order.batch_id ? partnerMap.get(order.batch_id) : null;
      const orderItems = (items || []).filter((i) => i.order_id === order.id);
      const firstSellerId = orderItems.length > 0 ? (orderItems[0].products as any)?.seller_id : null;
      return {
        ...order,
        delivery_status: order.delivery_status || order.status || "pending",
        address_name: addr?.name || null,
        address_village: addr?.village || null,
        delivery_partner_name: partner?.name || null,
        delivery_partner_phone: partner?.phone || null,
        seller_id: firstSellerId,
        items: orderItems.map((i) => ({
          product_id: i.product_id,
          product_name: (i.products as any)?.name || "Unknown",
          quantity: i.quantity,
          price: i.price,
          seller_name: profileMap.get((i.products as any)?.seller_id) || "Seller",
        })),
      };
    });

    setOrders(enriched);

    // Check which orders have already been rated
    const deliveredIds = enriched.filter((o: OrderWithItems) => o.delivery_status === "delivered").map((o: OrderWithItems) => o.id);
    if (deliveredIds.length > 0 && user) {
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("product_id")
        .eq("buyer_id", user.id);

      // Get product IDs already reviewed
      const reviewedProductIds = new Set((existingReviews || []).map((r) => r.product_id));

      // An order is "rated" if ALL its products have reviews
      const rated = new Set<string>();
      for (const order of enriched) {
        if (order.delivery_status === "delivered" && order.items.length > 0) {
          const allRated = order.items.every((item) => reviewedProductIds.has(item.product_id));
          if (allRated) rated.add(order.id);
        }
      }
      setRatedOrderIds(rated);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Real-time subscription: refresh orders when delivery partner or seller updates status
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`buyer-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Cancel order handler
  const cancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      // Update order status
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", delivery_status: "cancelled" })
        .eq("id", orderId);

      if (error) throw error;

      // Restore product stock
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        for (const item of order.items) {
          // Get current stock and add back the quantity
          const { data: prod } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();
          if (prod) {
            await supabase
              .from("products")
              .update({ stock: prod.stock + item.quantity })
              .eq("id", item.product_id);
          }
        }

        // Notify seller
        if (order.seller_id) {
          await supabase.from("notifications").insert({
            user_id: order.seller_id,
            title: "Order Cancelled",
            message: `A buyer has cancelled order #${orderId.slice(0, 8)}. Stock has been restored.`,
            type: "order",
          });
        }
      }

      toast({ title: "Order cancelled", description: "Your order has been cancelled successfully." });
      fetchOrders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  // Submit rating
  const submitRating = async (order: OrderWithItems) => {
    if (!user || ratingValue === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmittingRating(true);
    try {
      // Insert a review for each product in the order
      for (const item of order.items) {
        const { error } = await supabase.from("reviews").insert({
          product_id: item.product_id,
          buyer_id: user.id,
          rating: ratingValue,
          comment: ratingComment.trim() || null,
        });
        if (error && !error.message.includes("duplicate")) throw error;
      }

      toast({ title: "Thanks for your rating! ⭐", description: "Your review has been submitted." });
      setRatedOrderIds((prev) => new Set([...prev, order.id]));
      setRatingOrderId(null);
      setRatingValue(0);
      setRatingComment("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingRating(false);
    }
  };

  // Simulated pay now for pending orders (Demo Mode)
  const payNow = async (orderId: string, amount: number) => {
    setPayingId(orderId);
    try {
      // Simulate 2-second payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const fakePaymentId = `pay_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_method: "online",
          payment_id: fakePaymentId,
        })
        .eq("id", orderId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Payment successful! 💰", description: "Your order payment has been confirmed." });
        fetchOrders();
      }
    } catch {
      toast({ title: "Payment failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setPayingId(null);
    }
  };

  const getStepIndex = (status: string) => {
    const idx = deliverySteps.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const orderCount = orders.length;
  const activeOrders = orders.filter((o) => o.delivery_status !== "delivered" && o.delivery_status !== "cancelled").length;

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
              Track your purchases and deliveries
            </p>
            <div className="flex gap-2 mt-3">
              {role === "admin" && (
                <Button variant="outline" size="sm" asChild className="border-primary/30 text-primary">
                  <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin Panel</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to="/addresses"><MapPin className="w-4 h-4 mr-1" /> My Addresses</Link>
              </Button>
            </div>
          </motion.div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: ShoppingCart, label: "Total Orders", value: String(orderCount) },
              { icon: Package, label: "Active", value: String(activeOrders) },
              { icon: Star, label: "Delivered", value: String(orders.filter((o) => o.delivery_status === "delivered").length) },
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
                  {orders.map((order) => {
                    const currentStep = getStepIndex(order.delivery_status || "pending");
                    const isCancelled = order.delivery_status === "cancelled";

                    return (
                      <div key={order.id} className="p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-muted-foreground font-body">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={order.payment_status === "paid" ? "secondary" : order.payment_status === "cod" ? "outline" : "destructive"}
                              className="text-xs capitalize"
                            >
                              {order.payment_status === "paid" ? "💰 Paid" : order.payment_status === "cod" ? "💵 COD" : order.payment_status === "failed" ? "❌ Failed" : "Payment Pending"}
                            </Badge>
                            <p className="font-body font-bold text-foreground">₹{order.total}</p>
                          </div>
                        </div>

                        {/* Delivery Status Stepper */}
                        {!isCancelled && (
                          <div className="flex items-center gap-0 mb-4 overflow-x-auto pb-1">
                            {deliverySteps.map((step, i) => {
                              const isCompleted = i <= currentStep;
                              const StepIcon = step.icon;
                              return (
                                <div key={step.key} className="flex items-center">
                                  <div className="flex flex-col items-center min-w-[48px]">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center ${isCompleted
                                        ? "bg-primary text-white"
                                        : "bg-muted-foreground/10 text-muted-foreground/40"
                                        }`}
                                    >
                                      <StepIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <span
                                      className={`text-[10px] mt-1 font-body ${isCompleted ? "text-primary font-semibold" : "text-muted-foreground/50"
                                        }`}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                  {i < deliverySteps.length - 1 && (
                                    <div
                                      className={`h-0.5 w-3 sm:w-5 ${i < currentStep ? "bg-primary" : "bg-muted-foreground/10"
                                        }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isCancelled && (
                          <Badge variant="destructive" className="text-xs mb-3">
                            ❌ Cancelled
                          </Badge>
                        )}

                        {/* Delivery Partner Info */}
                        {order.delivery_partner_name && (
                          <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-body text-blue-800 font-semibold">
                              {order.delivery_partner_name}
                            </span>
                            {order.delivery_partner_phone && (
                              <>
                                <Phone className="w-3 h-3 text-blue-500 ml-2" />
                                <span className="text-xs font-body text-blue-700">{order.delivery_partner_phone}</span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Address info */}
                        {order.address_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-body mb-2">
                            <MapPin className="w-3 h-3" />
                            Deliver to: {order.address_name}
                            {order.address_village && ` — ${order.address_village}`}
                          </div>
                        )}

                        {/* Order items */}
                        {order.items.map((item, i) => (
                          <div key={i} className="text-sm font-body text-foreground">
                            {item.product_name} x{item.quantity} — <span className="text-muted-foreground">by {item.seller_name}</span>
                          </div>
                        ))}

                        {/* Pay Now button for pending payments */}
                        {(order.payment_status === "pending" || order.payment_status === "failed") && (
                          <Button
                            size="sm"
                            className="mt-3"
                            onClick={() => payNow(order.id, order.total)}
                            disabled={payingId === order.id}
                          >
                            {payingId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <CreditCard className="w-4 h-4 mr-1" />
                            )}
                            Pay Now — ₹{order.total}
                          </Button>
                        )}

                        {/* Cancel Order button */}
                        {!isCancelled && (order.delivery_status === "pending" || order.delivery_status === "confirmed") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="mt-2">
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel Order
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will cancel your order and restore the product stock. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Order</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={cancellingId === order.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    cancelOrder(order.id);
                                  }}
                                >
                                  {cancellingId === order.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                                  Yes, Cancel
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Rating section for delivered orders */}
                        {order.delivery_status === "delivered" && (
                          <div className="mt-3 pt-3 border-t border-border">
                            {ratedOrderIds.has(order.id) ? (
                              <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-body font-medium">Rated ✓</span>
                              </div>
                            ) : ratingOrderId === order.id ? (
                              <div className="space-y-3">
                                <p className="text-sm font-body font-semibold text-foreground">Rate this order</p>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => setRatingValue(star)}
                                      className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                      <Star
                                        className={`w-7 h-7 ${star <= ratingValue ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                                      />
                                    </button>
                                  ))}
                                </div>
                                <Textarea
                                  placeholder="Write a comment (optional)..."
                                  value={ratingComment}
                                  onChange={(e) => setRatingComment(e.target.value)}
                                  className="h-20 text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => submitRating(order)}
                                    disabled={submittingRating || ratingValue === 0}
                                  >
                                    {submittingRating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Star className="w-4 h-4 mr-1" />}
                                    Submit Rating
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setRatingOrderId(null); setRatingValue(0); setRatingComment(""); }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRatingOrderId(order.id)}
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Rate Order
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="container max-w-4xl pb-10">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-600/80 font-body mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-700">Delete Account Permanently?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">This will permanently delete:</span>
                    <span className="block text-sm">• Your profile and preferences</span>
                    <span className="block text-sm">• All your orders and order history</span>
                    <span className="block text-sm">• Your addresses, reviews, and cart</span>
                    <span className="block text-sm">• Your seller profile (if any)</span>
                    <span className="block font-semibold text-red-600 mt-2">Type "DELETE" below to confirm:</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder="Type DELETE to confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="border-red-200"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (deleteConfirmText !== "DELETE") return;
                      setDeletingAccount(true);
                      try {
                        const { error } = await supabase.rpc("delete_user_account");
                        if (error) throw error;
                        toast({ title: "Account deleted", description: "Your account has been permanently removed." });
                        await signOut();
                        window.location.href = "/";
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message, variant: "destructive" });
                        setDeletingAccount(false);
                      }
                    }}
                  >
                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default BuyerDashboard;
