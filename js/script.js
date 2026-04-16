<<<<<<< Updated upstream
document.getElementById("designForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const style = document.getElementById("style").value;
  const colorTheme = document.getElementById("colorTheme").value;
  const budget = document.getElementById("budget").value;

  const furniture = [];
  const checkboxes = document.querySelectorAll("input[type='checkbox']:checked");

  checkboxes.forEach((checkbox) => {
    furniture.push(checkbox.value);
  });

  console.log("Selected Style:", style);
  console.log("Color Theme:", colorTheme);
  console.log("Budget:", budget);
  console.log("Furniture:", furniture);

  alert("Preferences submitted! (Backend integration coming next)");
});
//comment
=======
//  LOAD DATASET
let dataset = [];

fetch("dataset.json")   //  correct path
.then(res => res.json())
.then(data => {
  dataset = data;
  console.log("Dataset loaded", dataset);
});

// 🔥 GENERATE BUTTON EVENT
generateBtn.addEventListener('click', () => {

  // ✅ Convert selections into tags
  let selectedTags = [];

  // styles
  selectedStyles.forEach(style => {
    selectedTags.push(style.toLowerCase());
  });

  // palette mapping → match dataset tags
  const paletteMap = {
    light: "white",
    pastel: "pastel",
    neutral: "neutral",
    vibrant: "colorful",
    earthy: "earthy",
    monochrome: "black",
    jewel: "blue",
    dark: "black"
  };

  selectedTags.push(paletteMap[selectedPalette]);

  // rooms
  Object.keys(roomSelections).forEach(room => {
    selectedTags.push(room.toLowerCase().replace(/\s+/g, ''));
  });

  console.log("Selected Tags:", selectedTags);

  // 🔥 FILTER DATASET
  let matches = dataset.filter(item =>
    selectedTags.every(tag => item.tags.includes(tag))
  );

  console.log("Matches:", matches);

  // 🔥 SHOW RESULTS
  resultsGrid.innerHTML = "";

  if(matches.length === 0){
    resultsGrid.innerHTML = "<p>No designs found 😢</p>";
    return;
  }

  matches.slice(0, 12).forEach(item => {
    let card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <img src="${item.image}" 
           style="width:100%; height:250px; object-fit:cover;">
    `;

    resultsGrid.appendChild(card);
  });

});
>>>>>>> Stashed changes
