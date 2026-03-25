const roomCatalog = {
  bedroom: {
    label: "Bedroom",
    previewKey: "bedroom",
    items: [
      "King-size Bed",
      "Nightstand",
      "Dresser",
      "Wardrobe",
      "Vanity Mirror",
      "Accent Chair",
      "Reading Lamp",
      "Wall Art",
      "Rug",
      "Curtains",
      "Indoor Plants",
      "Floating Shelves",
      "Bookshelf",
      "Study Table",
      "Single Bed",
    ],
  },
  kitchen: {
    label: "Kitchen",
    previewKey: "kitchen",
    items: [
      "Island Counter",
      "Bar Stools",
      "Open Shelving",
      "Pendant Lights",
      "Backsplash Tile",
      "Pot Rack",
      "Wine Rack",
      "Herb Garden",
      "Breakfast Nook",
      "Display Cabinet",
      "Under-cabinet Lighting",
      "Chalkboard Wall",
    ],
  },
  "living-room": {
    label: "Living Room",
    previewKey: "living-room",
    items: [
      "Sectional Sofa",
      "Coffee Table",
      "TV Console",
      "Bookshelf",
      "Accent Chair",
      "Floor Lamp",
      "Gallery Wall",
      "Area Rug",
      "Fireplace Mantel",
      "Indoor Plants",
      "Throw Pillows",
      "Side Table",
    ],
  },
  bathroom: {
    label: "Bathroom",
    previewKey: "bathroom",
    items: [
      "Freestanding Tub",
      "Rainfall Shower",
      "Double Vanity",
      "Floating Mirror",
      "Towel Warmer",
      "Storage Ladder",
      "Tile Accent Wall",
      "Pendant Light",
      "Indoor Plants",
      "Woven Baskets",
      "Wall Sconces",
      "Stone Countertop",
    ],
  },
  office: {
    label: "Home Office",
    previewKey: "office",
    items: [
      "Standing Desk",
      "Ergonomic Chair",
      "Bookcase",
      "Monitor Riser",
      "Desk Lamp",
      "Pin Board",
      "Filing Cabinet",
      "Indoor Plants",
      "Rug",
      "Wall Art",
      "Cable Management",
      "Accent Lighting",
    ],
  },
};

function listRoomCatalog() {
  return Object.entries(roomCatalog).map(([slug, config]) => ({
    slug,
    label: config.label,
    previewKey: config.previewKey,
    items: config.items,
  }));
}

function getRoomConfig(room) {
  return roomCatalog[room] || null;
}

module.exports = {
  roomCatalog,
  listRoomCatalog,
  getRoomConfig,
};
