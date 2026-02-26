const express = require("express");
const fs = require("fs");

const app = express();
const PORT = 5000;

// IMPORTANT: to read JSON from frontend
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Server running ✅");
});

// Checklist save route
app.post("/save-checklist", (req, res) => {
  const data = req.body;

  const text = `
User: ${data.user}
Checked Items: ${data.checkedItems.join(", ")}
Date: ${new Date().toLocaleString()}
---------------------------------
`;

  fs.appendFile("checklist.txt", text, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error saving checklist");
    }

    res.send("Checklist saved successfully ✅");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});