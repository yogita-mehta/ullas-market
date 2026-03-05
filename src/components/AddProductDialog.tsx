import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Upload, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const categories = ["Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"];

interface AddProductDialogProps {
  onProductAdded: () => void;
  disabled?: boolean;
}

const AddProductDialog = ({ onProductAdded, disabled = false }: AddProductDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [localName, setLocalName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setName("");
    setLocalName("");
    setPrice("");
    setStock("");
    setCategory("");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !price || !stock || !category) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        name,
        local_name: localName || null,
        price: parseInt(price),
        stock: parseInt(stock),
        category,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({ title: "Product added!", description: `${name} is now live on the marketplace.` });
      resetForm();
      setOpen(false);
      onProductAdded();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="hero" size="sm" disabled className="opacity-50 cursor-not-allowed">
              <ShieldAlert className="w-4 h-4" /> Add Product
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Complete FSSAI verification to add products</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" size="sm">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kerala Banana Chips" />
          </div>
          <div>
            <Label htmlFor="localName">Local Name</Label>
            <Input id="localName" value={localName} onChange={(e) => setLocalName(e.target.value)} placeholder="e.g. Nenthra Kaaya Chips" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input id="price" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180" />
            </div>
            <div>
              <Label htmlFor="stock">Quantity *</Label>
              <Input id="stock" type="number" min="1" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="50" />
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;
