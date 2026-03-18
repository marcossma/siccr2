const express = require("express");
const router = express.Router();

const WP_API = "https://www.ufsm.br/unidades-universitarias/ccr/wp-json/wp/v2/posts";

// Cache simples em memória (15 minutos)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 15 * 60 * 1000;

router.get("/", async (req, res) => {
    const agora = Date.now();
    const limit = Math.min(parseInt(req.query.limit) || 12, 12);

    if (cache.data && (agora - cache.timestamp) < CACHE_TTL) {
        return res.status(200).json({ status: "success", message: "", data: cache.data.slice(0, limit) });
    }

    try {
        const response = await fetch(`${WP_API}?per_page=12&_embed`);

        if (!response.ok) {
            throw new Error(`WordPress API retornou ${response.status}`);
        }

        const posts = await response.json();

        const noticias = posts.map(post => {
            const imagem = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null;
            const resumoHtml = post.excerpt?.rendered || "";
            const resumo = resumoHtml.replace(/<[^>]+>/g, "").replace(/\[&hellip;\]|\.{3}/, "").trim();

            return {
                id: post.id,
                titulo: post.title?.rendered || "",
                resumo,
                data: post.date,
                link: post.link,
                imagem
            };
        });

        cache = { data: noticias, timestamp: agora };

        res.status(200).json({ status: "success", message: "", data: noticias.slice(0, limit) });

    } catch (error) {
        console.error("Erro ao buscar notícias do WordPress:", error.message);

        // Se houver cache expirado, retorna ele como fallback
        if (cache.data) {
            return res.status(200).json({ status: "success", message: "cache_expirado", data: cache.data });
        }

        res.status(503).json({
            status: "error",
            message: "Não foi possível carregar as notícias no momento.",
            data: []
        });
    }
});

module.exports = router;
