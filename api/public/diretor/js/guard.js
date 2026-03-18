(function () {
    var s = JSON.parse(localStorage.getItem("siccr") || "null");
    var t = localStorage.getItem("siccr_token");
    if (!t || !s) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/login");
        return;
    }
    // Nível de acesso efetivo: super_admin ou diretor/vice_diretor ou is_direcao_centro
    var permissao = s.permissao || "";
    var isDirecao = s.is_direcao_centro === true;
    var temAcesso =
        permissao === "super_admin" ||
        permissao === "diretor" ||
        permissao === "vice_diretor" ||
        isDirecao;
    if (!temAcesso) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/login");
    }
})();
