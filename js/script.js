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