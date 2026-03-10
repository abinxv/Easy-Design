import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type RoomType = "bedroom" | "kitchen" | "living-room" | "bathroom" | "office";

interface RoomConfig {
  label: string;
  emoji: string;
  items: string[];
}

interface Inspiration {
  title: string;
  description: string;
  pinterestUrl: string;
  imageQuery: string;
  tags: string[];
}

const roomConfigs: Record<RoomType, RoomConfig> = {
  bedroom: {
    label: "Bedroom",
    emoji: "🛏️",
    items: [
      "King-size Bed", "Nightstand", "Dresser", "Wardrobe", "Vanity Mirror",
      "Accent Chair", "Reading Lamp", "Wall Art", "Rug", "Curtains",
      "Indoor Plants", "Floating Shelves",
    ],
  },
  kitchen: {
    label: "Kitchen",
    emoji: "🍳",
    items: [
      "Island Counter", "Bar Stools", "Open Shelving", "Pendant Lights",
      "Backsplash Tile", "Pot Rack", "Wine Rack", "Herb Garden",
      "Breakfast Nook", "Display Cabinet", "Under-cabinet Lighting", "Chalkboard Wall",
    ],
  },
  "living-room": {
    label: "Living Room",
    emoji: "🛋️",
    items: [
      "Sectional Sofa", "Coffee Table", "TV Console", "Bookshelf",
      "Accent Chair", "Floor Lamp", "Gallery Wall", "Area Rug",
      "Fireplace Mantel", "Indoor Plants", "Throw Pillows", "Side Table",
    ],
  },
  bathroom: {
    label: "Bathroom",
    emoji: "🛁",
    items: [
      "Freestanding Tub", "Rainfall Shower", "Double Vanity", "Floating Mirror",
      "Towel Warmer", "Storage Ladder", "Tile Accent Wall", "Pendant Light",
      "Indoor Plants", "Woven Baskets", "Wall Sconces", "Stone Countertop",
    ],
  },
  office: {
    label: "Home Office",
    emoji: "💻",
    items: [
      "Standing Desk", "Ergonomic Chair", "Bookcase", "Monitor Riser",
      "Desk Lamp", "Pin Board", "Filing Cabinet", "Indoor Plants",
      "Rug", "Wall Art", "Cable Management", "Accent Lighting",
    ],
  },
};

function generateInspirations(room: RoomType, selectedItems: string[]): Inspiration[] {
  const roomLabel = roomConfigs[room].label;
  const inspirations: Inspiration[] = [];

  // General room inspiration
  inspirations.push({
    title: `${roomLabel} Design Ideas`,
    description: `Curated ${roomLabel.toLowerCase()} layouts and styling tips to spark your creativity.`,
    pinterestUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${roomLabel} interior design ideas`)}`,
    imageQuery: `${roomLabel} interior design`,
    tags: ["Layout", "Styling", "Inspiration"],
  });

  // Item-specific inspirations
  selectedItems.forEach((item) => {
    inspirations.push({
      title: `${item} Ideas for ${roomLabel}`,
      description: `Explore beautiful ways to incorporate a ${item.toLowerCase()} into your ${roomLabel.toLowerCase()}.`,
      pinterestUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${item} ${roomLabel} interior design`)}`,
      imageQuery: `${item} ${roomLabel}`,
      tags: [item, roomLabel],
    });
  });

  // Color palette inspiration
  inspirations.push({
    title: `${roomLabel} Color Palettes`,
    description: `Find the perfect color scheme for your ${roomLabel.toLowerCase()} with these trending palettes.`,
    pinterestUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${roomLabel} color palette interior`)}`,
    imageQuery: `${roomLabel} color palette`,
    tags: ["Colors", "Palette", "Mood"],
  });

  // Combination inspiration if multiple items selected
  if (selectedItems.length >= 2) {
    const combo = selectedItems.slice(0, 3).join(" + ");
    inspirations.push({
      title: `${combo} Combo`,
      description: `See how designers pair ${selectedItems.slice(0, 3).join(", ").toLowerCase()} together beautifully.`,
      pinterestUrl: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(`${combo} ${roomLabel} design`)}`,
      imageQuery: `${combo} ${roomLabel}`,
      tags: ["Combo", "Pairing"],
    });
  }

  return inspirations;
}

const DesignPage = () => {
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inspirations, setInspirations] = useState<Inspiration[] | null>(null);

  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const getInspirations = () => {
    if (!selectedRoom) return;
    setInspirations(generateInspirations(selectedRoom, selectedItems));
  };

  const reset = () => {
    setSelectedRoom(null);
    setSelectedItems([]);
    setInspirations(null);
  };

  const goBackToItems = () => {
    setInspirations(null);
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
              Pick your room, choose what you want in it, and get curated design inspiration.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Room Selection */}
              {!selectedRoom && !inspirations && (
                <motion.div
                  key="rooms"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-6 text-center">
                    What room are you designing?
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {(Object.entries(roomConfigs) as [RoomType, RoomConfig][]).map(
                      ([key, config]) => (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedRoom(key)}
                          className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 hover:shadow-card transition-all duration-200"
                        >
                          <span className="text-4xl block mb-3">{config.emoji}</span>
                          <span className="font-display text-sm font-semibold text-foreground">
                            {config.label}
                          </span>
                        </motion.button>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Item Selection */}
              {selectedRoom && !inspirations && (
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
                    <span className="text-2xl">{roomConfigs[selectedRoom].emoji}</span>
                    <h2 className="font-display text-2xl font-semibold text-foreground">
                      What do you want in your {roomConfigs[selectedRoom].label}?
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {roomConfigs[selectedRoom].items.map((item) => {
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
                    >
                      <Sparkles className="w-4 h-4" />
                      Get Inspiration
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 font-body">
                      {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Inspiration Results */}
              {inspirations && (
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
                      Your {roomConfigs[selectedRoom!].label} Inspiration
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {inspirations.map((item, idx) => (
                      <motion.a
                        key={idx}
                        href={item.pinterestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        whileHover={{ y: -4 }}
                        className="group bg-card border border-border rounded-2xl p-6 hover:shadow-card hover:border-primary/30 transition-all duration-300 block"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                        </div>
                        <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">
                          {item.description}
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
                          <span>View on Pinterest</span>
                          <ChevronRight className="w-3 h-3" />
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
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DesignPage;
