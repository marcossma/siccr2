function toggleDropdown() {
    const dropdownMenu = document.querySelector("#dropdown-menu");
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
}

// Fecha o menu dropdown ao clicar fora dele
window.onclick = function(event) {
    if (!event.target.matches(".dropdown-btn")) {
        const dropdowns = document.querySelectorAll(".dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.style.display === "block") {
                openDropdown.style.display = "none";
            }
        }
    }
}