function toggleDropdown(event, menuId) {
    event.preventDefault();
    const dropdownMenu = document.querySelector(`#${menuId}`);

    // Fecha outros submenus, se estiverem abertos
    const allDropdowns = document.querySelectorAll(".dropdown-content");
    allDropdowns.forEach(menu => {
        if (menu !== dropdownMenu) menu.style.display = "none";
    });

    // Alterna a visibilidade do submenu clicado
    dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
}

// Fecha os submenus ao clicar fora deles
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