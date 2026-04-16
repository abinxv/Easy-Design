import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Bot,
  BedDouble,
  ChefHat,
  Sofa,
  Bath,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fetchRoomCatalog, searchInspirations, type RoomCatalogEntry, type SearchInspirationsResponse } from "@/lib/designs";
import { getInspirationPreview } from "@/lib/previewImages";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import DesignChatAssistant from "@/components/DesignChatAssistant";

const roomIcons = {
  bedroom: BedDouble,
  kitchen: ChefHat,
  "living-room": Sofa,
  bathroom: Bath,
  office: BriefcaseBusiness,
} as const;

const DesignPage = () => {
  const [rooms, setRooms] = useState<RoomCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [results, setResults] = useState<SearchInspirationsResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const { token, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        const response = await fetchRoomCatalog();
        if (!isMounted) {
          return;
        }
        setRooms(response.rooms);
        setCatalogError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setCatalogError(error instanceof Error ? error.message : "Unable to load rooms.");
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedRoomConfig = rooms.find((room) => room.slug === selectedRoom) || null;

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => (prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]));
  };

  const getInspirations = async () => {
    if (!selectedRoom) {
      return;
    }

    setSearchLoading(true);
    try {
      const response = await searchInspirations(
        {
          room: selectedRoom,
          selectedItems,
        },
        token
      );

      setResults(response);
      if (response.savedDesign) {
        toast({
          title: "Design saved",
          description: "This inspiration set was added to your dashboard history.",
        });
      } else if (!user) {
        toast({
          title: "Inspiration ready",
          description: "Sign in if you want future searches saved to your dashboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unable to load inspiration links.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const reset = () => {
    setSelectedRoom(null);
    setSelectedItems([]);
    setResults(null);
  };

  const goBackToItems = () => {
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Design Your <span className="text-gradient-warm">Room</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto font-body">
              Pick your room, choose what you want in it, and get Pinterest inspiration links built around your choices.
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="chatbot" className="space-y-8">
              <div className="flex justify-center">
                <TabsList className="h-auto rounded-2xl bg-muted/70 p-1.5">
                  <TabsTrigger value="chatbot" className="rounded-xl px-5 py-2.5">
                    <Bot className="w-4 h-4" />
                    Chatbot
                  </TabsTrigger>
                  <TabsTrigger value="guided" className="rounded-xl px-5 py-2.5">
                    <Sparkles className="w-4 h-4" />
                    Guided Picker
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="chatbot" className="mt-0">
                <DesignChatAssistant />
              </TabsContent>

              <TabsContent value="guided" className="mt-0">
                <AnimatePresence mode="wait">
                  {!selectedRoom && !results && (
                    <motion.div
                      key="rooms"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-center">
                        What room are you designing?
                      </h2>

                      {catalogLoading && (
                        <div className="text-center text-muted-foreground">Loading room options...</div>
                      )}

                      {catalogError && (
                        <div className="text-center text-destructive">{catalogError}</div>
                      )}

                      {!catalogLoading && !catalogError && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {rooms.map((room) => {
                            const Icon = roomIcons[room.slug as keyof typeof roomIcons] || Sparkles;
                            return (
                              <motion.button
                                key={room.slug}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedRoom(room.slug)}
                                className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 hover:shadow-card transition-all duration-200"
                              >
                                <span className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent flex items-center justify-center">
                                  <Icon className="w-7 h-7 text-primary" />
                                </span>
                                <span className="font-display text-sm font-semibold text-foreground">
                                  {room.label}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {selectedRoomConfig && !results && (
                    <motion.div
                      key="items"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <Button variant="ghost" size="sm" onClick={reset}>
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </Button>
                        <h2 className="font-display text-2xl font-semibold text-foreground">
                          What do you want in your {selectedRoomConfig.label}?
                        </h2>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                        {selectedRoomConfig.items.map((item) => {
                          const isSelected = selectedItems.includes(item);
                          return (
                            <motion.button
                              key={item}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleItem(item)}
                              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                                isSelected
                                  ? "bg-primary/10 border-primary text-foreground"
                                  : "bg-card border-border text-muted-foreground hover:border-primary/30"
                              }`}
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <span className="font-body text-sm font-medium">{item}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="text-center">
                        <Button
                          size="lg"
                          onClick={getInspirations}
                          className="gradient-warm text-primary-foreground shadow-warm"
                          disabled={searchLoading}
                        >
                          <Sparkles className="w-4 h-4" />
                          {searchLoading ? "Loading..." : "Get Inspiration"}
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2 font-body">
                          {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
                        </p>
                        {!user && (
                          <p className="text-xs text-muted-foreground mt-1 font-body">
                            You can browse without logging in. Sign in to save your searches to the dashboard.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {results && selectedRoom && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="sm" onClick={goBackToItems}>
                          <ArrowLeft className="w-4 h-4" />
                          Back
                        </Button>
                        <h2 className="font-display text-2xl font-semibold text-foreground">
                          Your {results.room.label} Inspiration
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {results.inspirations.map((item, index) => (
                          <motion.a
                            key={`${item.title}-${index}`}
                            href={item.pinterestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            whileHover={{ y: -4 }}
                            className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-card hover:border-primary/30 transition-all duration-300 block"
                          >
                            <img
                              src={getInspirationPreview(selectedRoom, index, item.kind)}
                              alt={item.title}
                              className="w-full h-52 object-cover"
                              loading="lazy"
                            />
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-3 gap-3">
                                <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {item.title}
                                </h3>
                                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                              </div>
                              <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">
                                {item.description}
                              </p>
                              <p className="text-xs text-muted-foreground font-body mb-4">
                                Search used: {item.searchQuery}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-body"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-4 flex items-center gap-2 text-xs text-primary font-medium font-body">
                                <span>Open Pinterest search</span>
                                <ChevronRight className="w-3 h-3" />
                              </div>
                            </div>
                          </motion.a>
                        ))}
                      </div>

                      <div className="text-center pt-6">
                        <Button variant="outline" size="lg" onClick={reset}>
                          Design Another Room
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesignPage;
