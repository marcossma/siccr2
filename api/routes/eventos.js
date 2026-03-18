const express = require("express");
const router = express.Router();

const EVENTOS_URL = "https://www.ufsm.br/unidades-universitarias/ccr/eventos/";

// Cache simples em memória (30 minutos)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 60 * 1000;

router.get("/", async (req, res) => {
    const agora = Date.now();

    if (cache.data && (agora - cache.timestamp) < CACHE_TTL) {
        return res.status(200).json({ status: "success", message: "", data: cache.data });
    }

    try {
        const response = await fetch(EVENTOS_URL, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; SICCR-Bot/1.0)" }
        });

        if (!response.ok) {
            throw new Error(`Página de eventos retornou ${response.status}`);
        }

        const html = await response.text();

        // Extrair todos os blocos JSON-LD da página
        const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        const eventos = [];
        let match;

        while ((match = jsonLdRegex.exec(html)) !== null) {
            try {
                const jsonData = JSON.parse(match[1].trim());

                // Pode ser um único objeto ou um array
                const items = Array.isArray(jsonData) ? jsonData : [jsonData];

                items.forEach(item => {
                    // Lidar com @graph (schema.org)
                    const candidates = item["@graph"] ? item["@graph"] : [item];

                    candidates.forEach(node => {
                        if (node["@type"] === "Event") {
                            eventos.push({
                                nome: node.name || "",
                                descricao: node.description || "",
                                inicio: node.startDate || null,
                                fim: node.endDate || null,
                                local: typeof node.location === "string"
                                    ? node.location
                                    : node.location?.name || node.location?.address || "",
                                link: node.url || node["@id"] || "",
                                imagem: node.image?.url || node.image || null
                            });
                        }
                    });
                });
            } catch (_) {
                // Bloco JSON-LD inválido, ignorar
            }
        }

        // Ordenar por data de início (mais próximos primeiro)
        eventos.sort((a, b) => {
            if (!a.inicio) return 1;
            if (!b.inicio) return -1;
            return new Date(a.inicio) - new Date(b.inicio);
        });

        cache = { data: eventos, timestamp: agora };

        res.status(200).json({ status: "success", message: "", data: eventos });

    } catch (error) {
        console.error("Erro ao buscar eventos do CCR:", error.message);

        if (cache.data) {
            return res.status(200).json({ status: "success", message: "cache_expirado", data: cache.data });
        }

        res.status(503).json({
            status: "error",
            message: "Não foi possível carregar os eventos no momento.",
            data: []
        });
    }
});

module.exports = router;
