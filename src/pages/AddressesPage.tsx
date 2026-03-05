import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    CheckCircle,
    X,
    LocateFixed,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useGeolocation } from "@/hooks/useGeolocation";

type Address = Tables<"addresses">;

interface AddressForm {
    name: string;
    phone: string;
    village: string;
    district: string;
    state: string;
    pincode: string;
}

const emptyForm: AddressForm = {
    name: "",
    phone: "",
    village: "",
    district: "",
    state: "",
    pincode: "",
};

const AddressesPage = () => {
    const { user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<AddressForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const { loading: geoLoading, detectAndSaveLocation } = useGeolocation();

    const handleDetectLocation = async () => {
        if (!user) return;
        const loc = await detectAndSaveLocation(user.id);
        if (loc) {
            setForm((prev) => ({
                ...prev,
                village: loc.village || prev.village,
                district: loc.district || prev.district,
                state: loc.state || prev.state,
                pincode: loc.pincode || prev.pincode,
            }));
            toast({ title: "Location detected! 📍", description: "Address fields have been auto-filled." });
        } else {
            toast({ title: "Could not detect location", description: "Please enter address manually.", variant: "destructive" });
        }
    };

    const fetchAddresses = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false });
        setAddresses(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchAddresses();
    }, [user]);

    const handleSave = async () => {
        if (!user || !form.name.trim()) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        setSaving(true);

        if (editingId) {
            const { error } = await supabase
                .from("addresses")
                .update({ ...form })
                .eq("id", editingId);
            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Address updated" });
            }
        } else {
            const isFirst = addresses.length === 0;
            const { error } = await supabase.from("addresses").insert({
                user_id: user.id,
                ...form,
                is_default: isFirst,
            });
            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Address added" });
            }
        }

        setSaving(false);
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchAddresses();
    };

    const handleEdit = (addr: Address) => {
        setEditingId(addr.id);
        setForm({
            name: addr.name,
            phone: addr.phone || "",
            village: addr.village || "",
            district: addr.district || "",
            state: addr.state || "",
            pincode: addr.pincode || "",
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this address?")) return;
        await supabase.from("addresses").delete().eq("id", id);
        toast({ title: "Address deleted" });
        fetchAddresses();
    };

    const setDefault = async (id: string) => {
        if (!user) return;
        // Unset all defaults first
        await supabase
            .from("addresses")
            .update({ is_default: false })
            .eq("user_id", user.id);
        // Set the selected one
        await supabase.from("addresses").update({ is_default: true }).eq("id", id);
        toast({ title: "Default address updated" });
        fetchAddresses();
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mb-8"
                    >
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                My Addresses
                            </h1>
                            <p className="text-muted-foreground font-body text-sm">
                                Manage your delivery addresses
                            </p>
                        </div>
                        {!showForm && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setShowForm(true);
                                    setEditingId(null);
                                    setForm(emptyForm);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Address
                            </Button>
                        )}
                    </motion.div>

                    {/* Add/Edit Form */}
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="shadow-card mb-6">
                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                    <CardTitle className="font-display text-base">
                                        {editingId ? "Edit Address" : "New Address"}
                                    </CardTitle>
                                    <button
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditingId(null);
                                            setForm(emptyForm);
                                        }}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="Full Name *"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Phone"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>
                                    <Input
                                        placeholder="Village / Town"
                                        value={form.village}
                                        onChange={(e) => setForm({ ...form, village: e.target.value })}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            placeholder="District"
                                            value={form.district}
                                            onChange={(e) => setForm({ ...form, district: e.target.value })}
                                        />
                                        <Input
                                            placeholder="State"
                                            value={form.state}
                                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                                        />
                                    </div>
                                    <Input
                                        placeholder="Pincode"
                                        value={form.pincode}
                                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDetectLocation}
                                        disabled={geoLoading}
                                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                                    >
                                        {geoLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <LocateFixed className="w-4 h-4 mr-2" />
                                        )}
                                        {geoLoading ? "Detecting..." : "📍 Detect Location"}
                                    </Button>
                                    <Button onClick={handleSave} disabled={saving} className="w-full">
                                        {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        {editingId ? "Update Address" : "Save Address"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Address List */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : addresses.length === 0 && !showForm ? (
                        <div className="text-center py-16">
                            <MapPin className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="text-muted-foreground font-body">
                                No addresses saved yet
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {addresses.map((addr, i) => (
                                <motion.div
                                    key={addr.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card
                                        className={`shadow-card transition-all ${addr.is_default ? "ring-2 ring-primary/30" : ""
                                            }`}
                                    >
                                        <CardContent className="p-4 flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <MapPin className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-body font-semibold text-foreground text-sm">
                                                        {addr.name}
                                                    </p>
                                                    {addr.is_default && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs flex items-center gap-0.5"
                                                        >
                                                            <CheckCircle className="w-3 h-3" /> Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-body">
                                                    {[addr.village, addr.district, addr.state, addr.pincode]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </p>
                                                {addr.phone && (
                                                    <p className="text-xs text-muted-foreground font-body mt-0.5">
                                                        📞 {addr.phone}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {!addr.is_default && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs"
                                                        onClick={() => setDefault(addr.id)}
                                                    >
                                                        Set Default
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-muted-foreground"
                                                    onClick={() => handleEdit(addr)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleDelete(addr.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default AddressesPage;
