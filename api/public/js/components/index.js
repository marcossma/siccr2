import "./responsive-menu.js";
import "./menu-navegacao-adm.js";
import "./assistente-ia.js";

// O widget flutuante do assistente aparece em qualquer página que carregue os
// componentes, sem precisar declarar a tag em cada HTML. A página /assistente
// declara <assistente-ia modo="pagina"> e, por isso, não recebe o flutuante.
function injetarAssistente() {
    if (document.querySelector("assistente-ia")) return;
    if (!localStorage.getItem("siccr_token")) return; // só para quem está logado
    document.body.appendChild(document.createElement("assistente-ia"));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injetarAssistente);
} else {
    injetarAssistente();
}
