import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Loader2, ShieldAlert, Globe, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import VoiceUploadButton, { type VoiceExtractResult } from "./VoiceUploadButton";

const categories = ["Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"];

interface AddProductDialogProps {
  onProductAdded: () => void;
  disabled?: boolean;
}

interface PriceSuggestion {
  min_price: number;
  max_price: number;
  avg_price: number;
  suggested_price: number;
  reasoning: string;
  sample_count: number;
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
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dialectDetected, setDialectDetected] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [voiceMissingFields, setVoiceMissingFields] = useState<string[]>([]);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setDialectDetected(null);
    setAiConfidence(null);
    setPriceSuggestion(null);
    setVoiceMissingFields([]);
  };

  const fetchPriceSuggestion = useCallback(async (productName: string, productCategory?: string) => {
    if (!productName || productName.length < 3) {
      setPriceSuggestion(null);
      return;
    }
    setFetchingPrice(true);
    try {
      const { data, error } = await invokeEdgeFunction<any>("suggest-price", {
        product_name: productName,
        category: productCategory || undefined,
      });
      if (!error && data && data.sample_count >= 2) {
        setPriceSuggestion(data as PriceSuggestion);
      } else {
        setPriceSuggestion(null);
      }
    } catch {
      setPriceSuggestion(null);
    } finally {
      setFetchingPrice(false);
    }
  }, []);

  const handleNameChange = (newName: string) => {
    setName(newName);
    // Debounce price suggestion
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    const timer = setTimeout(() => {
      fetchPriceSuggestion(newName, category);
    }, 800);
    priceDebounceRef.current = timer;
  };

  const handleVoiceResult = (result: VoiceExtractResult) => {
    if (result.official_name) setName(result.official_name);
    if (result.local_name) setLocalName(result.local_name);
    if (result.price && result.price > 0) setPrice(String(result.price));
    if (result.quantity && result.quantity > 0) setStock(String(result.quantity));
    if (result.category && categories.includes(result.category)) setCategory(result.category);
    if (result.full_description) {
      setDescription(result.full_description);
    } else if (result.short_description) {
      setDescription(result.short_description);
    }
    if (result.dialect_detected) setDialectDetected(result.dialect_detected);
    if (result.ai_confidence !== undefined) setAiConfidence(result.ai_confidence);

    // Track missing fields for UI highlighting
    if (result.missing_fields && result.missing_fields.length > 0) {
      setVoiceMissingFields(result.missing_fields);
    } else {
      setVoiceMissingFields([]);
    }

    // Trigger price suggestion for the extracted name
    if (result.official_name) {
      fetchPriceSuggestion(result.official_name, result.category);
    }
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
        description: description || null,
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display">Add New Product</DialogTitle>
            <VoiceUploadButton onResult={handleVoiceResult} disabled={loading} />
          </div>
        </DialogHeader>

        {/* Dialect & AI Confidence Badges */}
        {dialectDetected && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Globe className="w-3 h-3" />
              {dialectDetected}
            </Badge>
            {aiConfidence !== null && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Sparkles className="w-3 h-3" />
                AI Confidence: {Math.round(aiConfidence * 100)}%
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Kerala Banana Chips" />
          </div>
          <div>
            <Label htmlFor="localName">Local Name</Label>
            <Input id="localName" value={localName} onChange={(e) => setLocalName(e.target.value)} placeholder="e.g. Nenthra Kaaya Chips" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="180"
                className={voiceMissingFields.includes("price") ? "border-amber-400 ring-1 ring-amber-300" : ""}
              />
              {/* AI Price Suggestion */}
              {fetchingPrice && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking prices...
                </p>
              )}
              {priceSuggestion && !fetchingPrice && (
                <div className="mt-1.5 p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-body text-primary font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Suggested: ₹{priceSuggestion.suggested_price || priceSuggestion.avg_price}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Range ₹{priceSuggestion.min_price} – ₹{priceSuggestion.max_price} · {priceSuggestion.sample_count} similar
                  </p>
                  {priceSuggestion.reasoning && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic">
                      {priceSuggestion.reasoning}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-primary hover:text-primary mt-1 px-2"
                    onClick={() => setPrice(String(priceSuggestion.suggested_price || priceSuggestion.avg_price))}
                  >
                    Use this price
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="stock">Quantity *</Label>
              <Input
                id="stock"
                type="number"
                min="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="50"
                className={voiceMissingFields.includes("quantity") ? "border-amber-400 ring-1 ring-amber-300" : ""}
              />
            </div>
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={(val) => { setCategory(val); if (name) fetchPriceSuggestion(name, val); }}>
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
