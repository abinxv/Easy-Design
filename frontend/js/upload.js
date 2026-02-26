// Helper function to get checked values by name
function getCheckedValues(name) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checked).map(cb => cb.value);
}

document.addEventListener("DOMContentLoaded", function () {

  const form = document.getElementById("designForm");
  const otherCheckbox = document.getElementById("otherCheckbox");
  const otherInputContainer = document.getElementById("otherInputContainer");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const customItemsDiv = document.getElementById("customItems");

  // Show / Hide custom item section
  if (otherCheckbox) {
    otherCheckbox.addEventListener("change", function () {
      otherInputContainer.style.display = this.checked ? "block" : "none";
    });
  }

  // Add more custom inputs
  if (addMoreBtn) {
    addMoreBtn.addEventListener("click", function () {
      const newInput = document.createElement("input");
      newInput.type = "text";
      newInput.className = "customInput";
      newInput.placeholder = "Enter custom item";
      newInput.style.display = "block";
      newInput.style.marginTop = "8px";
      customItemsDiv.appendChild(newInput);
    });
  }

  // Submit Form
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const style = document.getElementById("style").value;
    const colorTheme = document.getElementById("colorTheme").value;
    const budget = document.getElementById("budget").value;

    const data = {
      style,
      colorTheme,
      budget,
      rooms: {
        livingRoom: getCheckedValues("livingRoom"),
        bedroom: getCheckedValues("bedroom"),
        kitchen: getCheckedValues("kitchen"),
        diningRoom: getCheckedValues("diningRoom"),
        study: getCheckedValues("study"),
        other: []
      }
    };

    // Collect custom items
    if (otherCheckbox && otherCheckbox.checked) {
      const customInputs = document.querySelectorAll(".customInput");
      data.rooms.other = Array.from(customInputs)
        .map(input => input.value.trim())
        .filter(value => value !== "");
    }

    try {
      const response = await fetch("http://localhost:5000/api/design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      alert("Preferences saved successfully!");
      console.log(result);

    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong.");
    }

  });

});