(function () {
    const s = JSON.parse(localStorage.getItem("siccr") || "null");
    const t = localStorage.getItem("siccr_token");
    if (!t || !s) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/");
        return;
    }
    // Nível de acesso efetivo: super_admin ou diretor/vice_diretor ou is_direcao_centro
    const permissao = s.permissao || "";
    const isDirecao = s.is_direcao_centro === true;
    const temAcesso =
        permissao === "super_admin" ||
        permissao === "diretor" ||
        permissao === "vice_diretor" ||
        isDirecao;
    if (!temAcesso) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/");
    }
})();
