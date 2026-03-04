import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    MapPin,
    CheckCircle,
    Loader2,
    ShoppingBag,
    ArrowLeft,
    Plus,
    CreditCard,
    Banknote,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import productShowcase from "@/assets/product-showcase.webp";

type Address = Tables<"addresses">;


const CheckoutPage = () => {
    const { user } = useAuth();
    const { cartItems, cartTotal, cartCount, clearCart } = useCart();
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [placing, setPlacing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");

    useEffect(() => {
        if (!user) return;
        const fetchAddresses = async () => {
            setLoadingAddresses(true);
            const { data } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id)
                .order("is_default", { ascending: false });
            setAddresses(data || []);
            const defaultAddr = (data || []).find((a) => a.is_default);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
            else if (data && data.length > 0) setSelectedAddressId(data[0].id);
            setLoadingAddresses(false);
        };
        fetchAddresses();
    }, [user]);

    // ----- Village Batching Logic -----
    const assignBatch = async (orderId: string, village: string, district: string | null) => {
        try {
            // Check if a batch exists for this village today
            const today = new Date().toISOString().split("T")[0];
            const { data: existingBatches, error: fetchErr } = await supabase
                .from("delivery_batches")
                .select("id")
                .eq("village", village)
                .gte("created_at", `${today}T00:00:00`)
                .lte("created_at", `${today}T23:59:59`)
                .limit(1);

            if (fetchErr) {
                console.error("Batch fetch error:", fetchErr);
                toast({ title: "Batch lookup failed", description: fetchErr.message, variant: "destructive" });
                return;
            }

            let batchId: string;

            if (existingBatches && existingBatches.length > 0) {
                batchId = existingBatches[0].id;
            } else {
                // Create a new batch
                const { data: newBatch, error: batchError } = await supabase
                    .from("delivery_batches")
                    .insert({
                        village,
                        district: district || null,
                        status: "created",
                    })
                    .select()
                    .single();

                if (batchError || !newBatch) {
                    console.error("Failed to create delivery batch:", batchError);
                    toast({ title: "Batch creation failed", description: batchError?.message || "Unknown error", variant: "destructive" });
                    return;
                }
                batchId = newBatch.id;
            }

            // Assign batch to order
            const { error: updateErr } = await supabase
                .from("orders")
                .update({ batch_id: batchId })
                .eq("id", orderId);

            if (updateErr) {
                console.error("Batch assignment error:", updateErr);
                toast({ title: "Batch assignment failed", description: updateErr.message, variant: "destructive" });
            }
        } catch (err: any) {
            console.error("Batch assignment error:", err);
            toast({ title: "Batch error", description: err.message, variant: "destructive" });
        }
    };

    // ----- Notification Helper -----
    const notifySellers = async (orderId: string) => {
        try {
            // Collect unique seller IDs from cart items
            const sellerIds = [...new Set(cartItems.map((item) => item.seller_id).filter(Boolean))];
            const notifications = sellerIds.map((sellerId) => ({
                user_id: sellerId,
                title: "New Order Received! 🛒",
                message: `You have a new order (#${orderId.slice(0, 8)}). Check your seller dashboard.`,
                type: "order",
            }));
            if (notifications.length > 0) {
                await supabase.from("notifications").insert(notifications);
            }
        } catch (err) {
            console.error("Notification error:", err);
        }
    };

    // ----- Simulated Payment (Demo Mode) -----
    const simulatePayment = (orderId: string): Promise<{ paymentId: string; method: string }> => {
        return new Promise((resolve) => {
            // Simulate a 2-second payment processing delay
            setTimeout(() => {
                const fakePaymentId = `pay_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                resolve({
                    paymentId: fakePaymentId,
                    method: "upi",
                });
            }, 2000);
        });
    };

    // ----- Place Order -----
    const handlePlaceOrder = async () => {
        if (!user) return;
        if (!selectedAddressId) {
            toast({ title: "Select address", description: "Please select a delivery address.", variant: "destructive" });
            return;
        }
        if (cartItems.length === 0) {
            toast({ title: "Cart empty", description: "Add items to your cart first.", variant: "destructive" });
            return;
        }

        setPlacing(true);

        try {
            // 1. Create order with pending payment
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    buyer_id: user.id,
                    total: cartTotal,
                    status: "pending",
                    payment_status: paymentMethod === "cod" ? "cod" : "pending",
                    payment_method: paymentMethod === "cod" ? "cod" : "online",
                    delivery_status: "pending",
                    address_id: selectedAddressId,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Insert order items
            const orderItems = cartItems.map((item) => ({
                order_id: order.id,
                product_id: item.product_id,
                seller_id: item.seller_id,
                quantity: item.quantity,
                price: item.product_price,
            }));

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 2b. Decrement product stock for each ordered item
            for (const item of cartItems) {
                await supabase.rpc("decrement_stock", {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity,
                });
            }

            // 3. Handle payment
            if (paymentMethod === "online") {
                try {
                    const { paymentId } = await simulatePayment(order.id);

                    // Update order with payment info
                    await supabase
                        .from("orders")
                        .update({
                            payment_status: "paid",
                            payment_method: "online",
                            payment_id: paymentId,
                        })
                        .eq("id", order.id);
                } catch (paymentErr: any) {
                    // Payment failed or cancelled
                    await supabase
                        .from("orders")
                        .update({
                            payment_status: "failed",
                            payment_method: "online",
                        })
                        .eq("id", order.id);

                    toast({
                        title: "Payment failed",
                        description: paymentErr.message || "Payment was not completed. You can retry from your orders page.",
                        variant: "destructive",
                    });

                    await clearCart();
                    navigate("/buyer");
                    return;
                }
            }

            // 4. Notify sellers
            await notifySellers(order.id);

            // 6. Clear cart and redirect
            await clearCart();

            toast({
                title: paymentMethod === "cod" ? "Order placed! 🎉" : "Payment successful! 🎉",
                description: `Your order of ₹${cartTotal.toLocaleString()} has been ${paymentMethod === "cod" ? "placed" : "paid and confirmed"}.`,
            });

            navigate("/buyer");
        } catch (err: any) {
            toast({
                title: "Order failed",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setPlacing(false);
        }
    };

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="pt-24 pb-20 container max-w-3xl text-center py-20">
                    <p className="text-muted-foreground font-body mb-4">Please log in to checkout</p>
                    <Button asChild><Link to="/login">Log In</Link></Button>
                </div>
                <Footer />
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="pt-24 pb-20 container max-w-3xl text-center py-20">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-body mb-4">Your cart is empty</p>
                    <Button asChild><Link to="/marketplace">Browse Marketplace</Link></Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-3xl">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-4 text-muted-foreground"
                        onClick={() => navigate("/cart")}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cart
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                            Checkout
                        </h1>
                    </motion.div>

                    <div className="space-y-6">
                        {/* Step 1: Select Address */}
                        <Card className="shadow-card">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="font-display text-base flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                                        1
                                    </span>
                                    Delivery Address
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild className="text-xs">
                                    <Link to="/addresses">
                                        <Plus className="w-3 h-3 mr-1" /> Manage
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingAddresses ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : addresses.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-muted-foreground font-body mb-3">
                                            No addresses saved. Add one to continue.
                                        </p>
                                        <Button size="sm" asChild>
                                            <Link to="/addresses">
                                                <Plus className="w-4 h-4 mr-1" /> Add Address
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {addresses.map((addr) => (
                                            <button
                                                key={addr.id}
                                                onClick={() => setSelectedAddressId(addr.id)}
                                                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedAddressId === addr.id
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/30"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedAddressId === addr.id
                                                            ? "border-primary bg-primary"
                                                            : "border-muted-foreground/30"
                                                            }`}
                                                    >
                                                        {selectedAddressId === addr.id && (
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-body font-semibold text-sm text-foreground">
                                                            {addr.name}
                                                            {addr.is_default && (
                                                                <Badge variant="secondary" className="text-xs ml-2">
                                                                    Default
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-body">
                                                            {[addr.village, addr.district, addr.state, addr.pincode]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Step 2: Payment Method */}
                        <Card className="shadow-card">
                            <CardHeader>
                                <CardTitle className="font-display text-base flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                                        2
                                    </span>
                                    Payment Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup
                                    value={paymentMethod}
                                    onValueChange={(val) => setPaymentMethod(val as "online" | "cod")}
                                    className="space-y-3"
                                >
                                    <label
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "online"
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/30"
                                            }`}
                                    >
                                        <RadioGroupItem value="online" id="online" />
                                        <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                                        <div>
                                            <Label htmlFor="online" className="font-body font-semibold text-sm text-foreground cursor-pointer">
                                                Pay Online
                                            </Label>
                                            <p className="text-xs text-muted-foreground font-body">
                                                UPI, Credit/Debit Card, Net Banking via Razorpay
                                            </p>
                                        </div>
                                    </label>
                                    <label
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cod"
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/30"
                                            }`}
                                    >
                                        <RadioGroupItem value="cod" id="cod" />
                                        <Banknote className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        <div>
                                            <Label htmlFor="cod" className="font-body font-semibold text-sm text-foreground cursor-pointer">
                                                Cash on Delivery
                                            </Label>
                                            <p className="text-xs text-muted-foreground font-body">
                                                Pay when your order is delivered
                                            </p>
                                        </div>
                                    </label>
                                </RadioGroup>
                            </CardContent>
                        </Card>

                        {/* Step 3: Order Summary */}
                        <Card className="shadow-card">
                            <CardHeader>
                                <CardTitle className="font-display text-base flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                                        3
                                    </span>
                                    Order Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="divide-y divide-border">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex gap-3 py-3">
                                            <img
                                                src={item.product_image || productShowcase}
                                                alt={item.product_name}
                                                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-body font-semibold text-sm text-foreground truncate">
                                                    {item.product_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-body">
                                                    by {item.seller_name} · Qty: {item.quantity}
                                                </p>
                                            </div>
                                            <p className="font-body font-bold text-foreground text-sm">
                                                ₹{(item.product_price * item.quantity).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {selectedAddress && (
                                    <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-body font-semibold text-foreground">
                                                Delivering to: {selectedAddress.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground font-body">
                                                {[
                                                    selectedAddress.village,
                                                    selectedAddress.district,
                                                    selectedAddress.state,
                                                    selectedAddress.pincode,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 space-y-2 border-t border-border pt-4">
                                    <div className="flex justify-between text-sm font-body">
                                        <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                                        <span className="font-semibold">₹{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-body">
                                        <span className="text-muted-foreground">Delivery</span>
                                        <span className="font-semibold text-emerald-600">Free</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-body">
                                        <span className="text-muted-foreground">Payment</span>
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {paymentMethod === "online" ? "Online Payment" : "Cash on Delivery"}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-border">
                                        <span className="font-body font-semibold text-foreground">Total</span>
                                        <span className="font-display font-bold text-xl text-primary">
                                            ₹{cartTotal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Place Order */}
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handlePlaceOrder}
                            disabled={placing || !selectedAddressId}
                        >
                            {placing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    {paymentMethod === "online" ? "Processing Payment..." : "Placing Order..."}
                                </>
                            ) : (
                                <>
                                    {paymentMethod === "online" ? (
                                        <CreditCard className="w-4 h-4 mr-2" />
                                    ) : (
                                        <ShoppingBag className="w-4 h-4 mr-2" />
                                    )}
                                    {paymentMethod === "online"
                                        ? `Pay ₹${cartTotal.toLocaleString()}`
                                        : `Place Order — ₹${cartTotal.toLocaleString()}`}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default CheckoutPage;
