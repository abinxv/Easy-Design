const { getRoomConfig } = require("../data/roomCatalog");

function buildPinterestUrl(query) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

function buildInspirations(room, selectedItems = []) {
  const roomConfig = getRoomConfig(room);

  if (!roomConfig) {
    return [];
  }

  const uniqueItems = [...new Set(selectedItems.filter(Boolean))];
  const inspirations = [];

  inspirations.push({
    kind: "overview",
    title: `${roomConfig.label} Design Ideas`,
    description: `Explore Pinterest searches for ${roomConfig.label.toLowerCase()} layouts, furniture placement, and styling ideas.`,
    searchQuery: `${roomConfig.label} interior design ideas`,
    pinterestUrl: buildPinterestUrl(`${roomConfig.label} interior design ideas`),
    previewKey: roomConfig.previewKey,
    tags: ["Layout", "Styling", roomConfig.label],
  });

  uniqueItems.forEach((item) => {
    const searchQuery = `${item} ${roomConfig.label} interior design`;
    inspirations.push({
      kind: "item",
      title: `${item} Ideas`,
      description: `Pinterest results focused on ${item.toLowerCase()} inspiration for a ${roomConfig.label.toLowerCase()}.`,
      searchQuery,
      pinterestUrl: buildPinterestUrl(searchQuery),
      previewKey: roomConfig.previewKey,
      tags: [item, roomConfig.label],
    });
  });

  const paletteQuery = `${roomConfig.label} color palette interior`;
  inspirations.push({
    kind: "palette",
    title: `${roomConfig.label} Color Palettes`,
    description: `Browse mood boards and color combinations that suit a ${roomConfig.label.toLowerCase()}.`,
    searchQuery: paletteQuery,
    pinterestUrl: buildPinterestUrl(paletteQuery),
    previewKey: roomConfig.previewKey,
    tags: ["Colors", "Palette", roomConfig.label],
  });

  if (uniqueItems.length >= 2) {
    const comboText = uniqueItems.slice(0, 3).join(" + ");
    const comboQuery = `${comboText} ${roomConfig.label} design`;
    inspirations.push({
      kind: "combo",
      title: `${comboText} Combo`,
      description: `See how people combine ${uniqueItems.slice(0, 3).join(", ").toLowerCase()} in one ${roomConfig.label.toLowerCase()}.`,
      searchQuery: comboQuery,
      pinterestUrl: buildPinterestUrl(comboQuery),
      previewKey: roomConfig.previewKey,
      tags: ["Combo", roomConfig.label],
    });
  }

  return inspirations;
}

module.exports = {
  buildInspirations,
};
