(function () {
    var s = JSON.parse(localStorage.getItem("siccr") || "null");
    var t = localStorage.getItem("siccr_token");
    if (!t || !s || s.permissao !== "super_admin") {
        localStorage.removeItem("siccr");
        localStorage.removeItem("siccr_token");
        document.documentElement.style.visibility = "hidden";
        location.replace("/adm/login");
    }
})();
