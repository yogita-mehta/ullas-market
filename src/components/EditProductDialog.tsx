import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const categories = ["Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"];

interface EditProductDialogProps {
    product: Tables<"products"> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductUpdated: () => void;
}

const EditProductDialog = ({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [localName, setLocalName] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (product) {
            setName(product.name);
            setLocalName(product.local_name || "");
            setPrice(String(product.price));
            setStock(String(product.stock));
            setCategory(product.category);
            setImagePreview(product.image_url || null);
            setIsActive(product.is_active);
            setImageFile(null);
        }
    }, [product]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !name || !price || !stock || !category) {
            toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            let imageUrl = product.image_url;

            if (imageFile) {
                const ext = imageFile.name.split(".").pop();
                const path = `${product.seller_id}/${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(path, imageFile);

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(path);
                imageUrl = urlData.publicUrl;
            }

            const { error } = await supabase
                .from("products")
                .update({
                    name,
                    local_name: localName || null,
                    price: parseInt(price),
                    stock: parseInt(stock),
                    category,
                    image_url: imageUrl,
                    is_active: isActive,
                })
                .eq("id", product.id);

            if (error) throw error;

            toast({ title: "Product updated!", description: `${name} has been updated.` });
            onOpenChange(false);
            onProductUpdated();
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display">Edit Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="edit-name">Product Name *</Label>
                        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="edit-localName">Local Name</Label>
                        <Input id="edit-localName" value={localName} onChange={(e) => setLocalName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="edit-price">Price (₹) *</Label>
                            <Input id="edit-price" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="edit-stock">Quantity *</Label>
                            <Input id="edit-stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label>Category *</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Product Image</Label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-muted/30">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-xl" />
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground">
                                    <Upload className="w-6 h-6 mb-1" />
                                    <span className="text-sm font-body">Click to upload</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="edit-active"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-border"
                        />
                        <Label htmlFor="edit-active" className="text-sm cursor-pointer">Product is active (visible on marketplace)</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {loading ? "Updating..." : "Save Changes"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditProductDialog;
