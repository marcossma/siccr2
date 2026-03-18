(function () {
    var s = JSON.parse(localStorage.getItem("siccr") || "null");
    var t = localStorage.getItem("siccr_token");
    if (!t || !s || s.permissao !== "admin") {
        document.documentElement.style.visibility = "hidden";
        location.replace("/adm/login");
    }
})();
