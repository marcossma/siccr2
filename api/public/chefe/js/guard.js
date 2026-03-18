(function () {
    var s = JSON.parse(localStorage.getItem("siccr") || "null");
    var t = localStorage.getItem("siccr_token");
    if (!t || !s) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/login");
        return;
    }
    var permissao = s.permissao || "";
    var isDirecao = s.is_direcao_centro === true;
    // Chefe ou superior tem acesso
    var temAcesso =
        permissao === "super_admin" ||
        permissao === "diretor" ||
        permissao === "vice_diretor" ||
        permissao === "chefe" ||
        permissao === "subchefe" ||
        isDirecao;
    if (!temAcesso) {
        document.documentElement.style.visibility = "hidden";
        location.replace("/login");
    }
})();
