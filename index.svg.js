const testData = getTestData();
testData.forEach((data, index) => {
    new TgChart(`chart${index}`, data);
});

const switchThemeButton = document.createElement("div");
switchThemeButton.className = "switch-theme-button";
switchThemeButton.innerText = "Switch Mode";
switchThemeButton.addEventListener("click", () => {
    document.querySelector(".app").classList.toggle("theme-night");
});
document.querySelector(".app").appendChild(switchThemeButton);




