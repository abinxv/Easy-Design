import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoomShopCartPanel from "@/components/RoomShopCartPanel";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRoomShopCart } from "@/hooks/useRoomShopCart";

const RoomCart = () => {
  const { toast } = useToast();
  const {
    clearCart,
    generateSuggestions,
    isSignedIn,
    items,
    loading,
    saveItems,
    saving,
    suggestions,
    suggestionsLoading,
  } = useRoomShopCart();

  const handleRemoveItem = async (id: string) => {
    try {
      await saveItems(items.filter((item) => item.id !== id));
    } catch (error) {
      toast({
        title: "Cart save failed",
        description: error instanceof Error ? error.message : "Unable to update your room cart right now.",
        variant: "destructive",
      });
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
    } catch (error) {
      toast({
        title: "Cart clear failed",
        description: error instanceof Error ? error.message : "Unable to clear your room cart right now.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateSuggestions = async () => {
    if (items.length === 0) {
      toast({
        title: "Add cart items first",
        description: "Add one or more purchase links from Room Shop before generating add-on ideas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateSuggestions();
      toast({
        title: "Add-on ideas ready",
        description: isSignedIn ? "These suggestions were saved with your room cart." : "Sign in to save these suggestions.",
      });
    } catch (error) {
      toast({
        title: "Suggestions failed",
        description: error instanceof Error ? error.message : "Unable to create add-on ideas right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-10 max-w-3xl text-center"
          >
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </span>
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              Room <span className="text-gradient-warm">Cart</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Review saved purchase links and generate add-on ideas that fit the items you already picked.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" asChild>
                <Link to="/room-shop">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Room Shop
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl">
            <RoomShopCartPanel
              cartItems={items}
              cartSuggestions={suggestions}
              cartLoading={loading}
              cartSaving={saving}
              suggestionsLoading={suggestionsLoading}
              isSignedIn={isSignedIn}
              onClearCart={() => void handleClearCart()}
              onGenerateSuggestions={() => void handleGenerateSuggestions()}
              onRemoveItem={(id) => void handleRemoveItem(id)}
            />
          </motion.section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RoomCart;
