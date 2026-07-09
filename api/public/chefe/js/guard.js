(function () {
    const s = JSON.parse(localStorage.getItem("siccr") || "null");
    const t = localStorage.getItem("siccr_token");
    if (!t || !s) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/");
        return;
    }
    const permissao = s.permissao || "";
    const isDirecao = s.is_direcao_centro === true;
    // Chefe ou superior tem acesso
    const temAcesso =
        permissao === "super_admin" ||
        permissao === "diretor" ||
        permissao === "vice_diretor" ||
        permissao === "chefe" ||
        permissao === "subchefe" ||
        isDirecao;
    if (!temAcesso) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/");
    }
})();
