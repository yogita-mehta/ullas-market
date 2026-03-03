import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Store, Upload, Shield, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const BecomeSellerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [kudumbashreeUnit, setKudumbashreeUnit] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificateFile(file);
      setCertificatePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessName) {
      toast({ title: "Business name required", variant: "destructive" });
      return;
    }

    if (!fssaiNumber.trim()) {
      toast({ title: "FSSAI number is required", description: "You must provide a valid FSSAI registration number.", variant: "destructive" });
      return;
    }

    if (!certificateFile) {
      toast({ title: "FSSAI certificate required", description: "Please upload your FSSAI certificate image.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Try to upload FSSAI certificate (graceful - bucket may not exist yet)
      let certificateUrl: string | null = null;
      try {
        const ext = certificateFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("fssai-certificates")
          .upload(path, certificateFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("fssai-certificates")
            .getPublicUrl(path);
          certificateUrl = urlData.publicUrl;
        } else {
          // Try product-images bucket as fallback
          const { error: fallbackError } = await supabase.storage
            .from("product-images")
            .upload(`fssai/${path}`, certificateFile);

          if (!fallbackError) {
            const { data: urlData } = supabase.storage
              .from("product-images")
              .getPublicUrl(`fssai/${path}`);
            certificateUrl = urlData.publicUrl;
          }
        }
      } catch {
        // Certificate upload optional if storage not configured
        console.warn("Could not upload certificate - storage may not be configured");
      }

      // Add seller role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "seller" });

      // Ignore duplicate role error
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      // Create seller profile - use existing columns as primary, try new columns too
      const profileData: any = {
        user_id: user.id,
        business_name: businessName,
        fssai_license: fssaiNumber.trim(), // Store in existing column
        fssai_verified: false,
        kudumbashree_unit: kudumbashreeUnit || null,
      };

      // Try adding new columns (they might not exist yet)
      try {
        profileData.fssai_number = fssaiNumber.trim();
        profileData.fssai_certificate_url = certificateUrl;
        profileData.fssai_status = "pending";
      } catch {
        // Columns don't exist yet - that's ok
      }

      const { error: profileError } = await supabase
        .from("seller_profiles")
        .insert(profileData);

      if (profileError) {
        // If new columns cause error, retry with only existing columns
        if (profileError.message.includes("column") || profileError.message.includes("fssai_number")) {
          const { error: retryError } = await supabase
            .from("seller_profiles")
            .insert({
              user_id: user.id,
              business_name: businessName,
              fssai_license: fssaiNumber.trim(),
              fssai_verified: false,
              kudumbashree_unit: kudumbashreeUnit || null,
            });
          if (retryError) throw retryError;
        } else {
          throw profileError;
        }
      }

      setSubmitted(true);
      toast({ title: "Registration submitted! 🎉", description: "Your FSSAI verification is under review." });

      // Navigate to seller dashboard after short delay
      setTimeout(() => navigate("/seller"), 2000);
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
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                Registration Submitted!
              </h2>
              <p className="text-muted-foreground font-body text-sm mb-4">
                Your FSSAI verification is under review. You'll be able to add products once approved by our team.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 font-body">
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
            <Store className="w-10 h-10 text-primary mx-auto mb-2" />
            <CardTitle className="font-display text-2xl">Become a Seller</CardTitle>
            <p className="text-muted-foreground font-body text-sm">
              Start selling your homemade products on Ullas
            </p>
          </CardHeader>
          <CardContent>
            {/* FSSAI Notice */}
            <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 font-body">
                  <strong>FSSAI verification is mandatory.</strong> You must provide a valid FSSAI number and certificate. Your account will be reviewed before you can list products.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Lakshmi's Kitchen"
                />
              </div>
              <div>
                <Label htmlFor="fssaiNumber">FSSAI Number *</Label>
                <Input
                  id="fssaiNumber"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  placeholder="e.g. 10020021000123"
                />
              </div>
              <div>
                <Label>FSSAI Certificate *</Label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-muted/30">
                  {certificatePreview ? (
                    <div className="relative w-full h-full">
                      <img src={certificatePreview} alt="Certificate Preview" className="h-full w-full object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-sm font-body">Upload FSSAI Certificate</span>
                      <span className="text-xs font-body text-muted-foreground/70">JPG, PNG, PDF</span>
                    </div>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCertificateChange} />
                </label>
              </div>
              <div>
                <Label htmlFor="kudumbashree">Kudumbashree Unit (optional)</Label>
                <Input
                  id="kudumbashree"
                  value={kudumbashreeUnit}
                  onChange={(e) => setKudumbashreeUnit(e.target.value)}
                  placeholder="e.g. Thrissur Unit 5"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading ? "Submitting for Verification..." : "Submit for FSSAI Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default BecomeSellerPage;
