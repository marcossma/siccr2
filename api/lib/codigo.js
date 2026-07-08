"use strict";

// Código de lotação no formato canônico "XX.XX.XX.XX.X.X"
// (6 grupos, larguras 2,2,2,2,1,1). Grupos não informados viram zeros,
// para que o cadastro manual precise digitar só até a parte relevante.
const LARGURAS = [2, 2, 2, 2, 1, 1];

function padronizarCodigo(cod) {
    if (cod === null || cod === undefined) return "";
    const partes = String(cod).replace(",", ".").trim().split(".").filter((s) => s !== "");
    if (partes.length === 0) return "";
    return LARGURAS.map((largura, i) => {
        const seg = partes[i] !== undefined ? partes[i].replace(/\D/g, "") : "";
        return (seg || "0").padStart(largura, "0");
    }).join(".");
}

module.exports = { padronizarCodigo };
