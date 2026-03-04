import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Send, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ContactUsPage = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) {
            toast({ title: "All fields required", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }
        setSending(true);
        // Simulate sending
        await new Promise((r) => setTimeout(r, 1000));
        toast({ title: "Message sent! ✉️", description: "We'll get back to you within 24 hours." });
        setName("");
        setEmail("");
        setMessage("");
        setSending(false);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-4xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Contact Us</h1>
                        <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                            Have questions or feedback? We'd love to hear from you.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                            <Card className="shadow-card">
                                <CardHeader>
                                    <CardTitle className="font-display text-lg">Send a Message</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-body text-muted-foreground mb-1.5 block">Name</label>
                                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-body text-muted-foreground mb-1.5 block">Email</label>
                                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-body text-muted-foreground mb-1.5 block">Message</label>
                                            <textarea
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="How can we help?"
                                                rows={4}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full" disabled={sending}>
                                            {sending ? "Sending..." : <><Send className="w-4 h-4 mr-1" /> Send Message</>}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                            <div className="space-y-5">
                                {[
                                    { icon: Mail, title: "Email", detail: "support@ullas.in", sub: "We reply within 24 hours" },
                                    { icon: Phone, title: "Phone", detail: "+91 94XX XXX XXX", sub: "Mon–Sat, 9 AM – 6 PM" },
                                    { icon: MapPin, title: "Address", detail: "Ullas Marketplace", sub: "Thiruvananthapuram, Kerala, India" },
                                ].map((c, i) => (
                                    <Card key={c.title} className="shadow-card">
                                        <CardContent className="flex items-start gap-4 p-5">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <c.icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-display font-semibold text-foreground text-sm">{c.title}</p>
                                                <p className="text-sm text-foreground font-body">{c.detail}</p>
                                                <p className="text-xs text-muted-foreground font-body">{c.sub}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ContactUsPage;
