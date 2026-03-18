document.addEventListener("DOMContentLoaded", function () {
    const s = JSON.parse(localStorage.getItem("siccr") || "null");

    const nomeEl = document.getElementById("usuarioNome");
    if (nomeEl && s) nomeEl.textContent = s.nome || "";

    const btnSair = document.getElementById("btnSair");
    if (btnSair) {
        btnSair.addEventListener("click", function (e) {
            e.preventDefault();
            localStorage.removeItem("siccr");
            localStorage.removeItem("siccr_token");
            location.replace("/login");
        });
    }
});
