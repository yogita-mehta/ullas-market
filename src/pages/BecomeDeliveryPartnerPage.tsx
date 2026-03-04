import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Truck, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const BecomeDeliveryPartnerPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [vehicleType, setVehicleType] = useState("");
    const [assignedVillage, setAssignedVillage] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!name.trim()) {
            toast({ title: "Name required", variant: "destructive" });
            return;
        }
        if (!phone.trim()) {
            toast({ title: "Phone number required", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Add delivery_partner role
            const { error: roleError } = await supabase
                .from("user_roles")
                .insert({ user_id: user.id, role: "delivery_partner" });

            if (roleError && !roleError.message.includes("duplicate")) throw roleError;

            // Create delivery partner profile
            const { error: profileError } = await supabase
                .from("delivery_partners")
                .insert({
                    user_id: user.id,
                    name: name.trim(),
                    phone: phone.trim(),
                    vehicle_type: vehicleType || null,
                    assigned_village: assignedVillage || null,
                    status: "available",
                });

            if (profileError && !profileError.message.includes("duplicate")) throw profileError;

            // Also update the profiles table role
            await supabase
                .from("profiles")
                .update({ role: "delivery_partner" })
                .eq("user_id", user.id);

            setSubmitted(true);
            toast({ title: "Registration successful! 🎉", description: "You're now a delivery partner." });

            setTimeout(() => {
                window.location.href = "/delivery/dashboard";
            }, 2000);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="pt-24 pb-20 flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-card">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="font-display text-xl font-bold text-foreground mb-2">
                                Welcome, Delivery Partner!
                            </h2>
                            <p className="text-muted-foreground font-body text-sm mb-4">
                                Your account is set up. You'll receive batches through the delivery dashboard.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-body">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirecting to your dashboard...
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20 flex items-center justify-center">
                <Card className="w-full max-w-md shadow-card">
                    <CardHeader className="text-center">
                        <Truck className="w-10 h-10 text-primary mx-auto mb-2" />
                        <CardTitle className="font-display text-2xl">Become a Delivery Partner</CardTitle>
                        <p className="text-muted-foreground font-body text-sm">
                            Join the Ullas delivery network and earn by delivering orders in your village
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="partnerName">Full Name *</Label>
                                <Input
                                    id="partnerName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Rajan Kumar"
                                />
                            </div>
                            <div>
                                <Label htmlFor="partnerPhone">Phone Number *</Label>
                                <Input
                                    id="partnerPhone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g. 9876543210"
                                    type="tel"
                                />
                            </div>
                            <div>
                                <Label htmlFor="vehicleType">Vehicle Type</Label>
                                <Select value={vehicleType} onValueChange={setVehicleType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bicycle">Bicycle</SelectItem>
                                        <SelectItem value="motorcycle">Motorcycle</SelectItem>
                                        <SelectItem value="scooter">Scooter</SelectItem>
                                        <SelectItem value="auto">Auto Rickshaw</SelectItem>
                                        <SelectItem value="van">Van</SelectItem>
                                        <SelectItem value="on_foot">On Foot</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="village">Preferred Village / Area</Label>
                                <Input
                                    id="village"
                                    value={assignedVillage}
                                    onChange={(e) => setAssignedVillage(e.target.value)}
                                    placeholder="e.g. Thrissur, Palakkad"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {loading ? "Registering..." : "Register as Delivery Partner"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    );
};

export default BecomeDeliveryPartnerPage;
