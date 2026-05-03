const { buildInspirations } = require("./utils/inspirationBuilder");

const preview = buildInspirations("bedroom", ["Single Bed", "Bookshelf", "Study Table"]);

console.log(JSON.stringify(preview, null, 2));
