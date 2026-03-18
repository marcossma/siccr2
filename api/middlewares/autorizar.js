const pool = require("../config/database.js");

/**
 * Determina o nível de acesso efetivo do usuário.
 *
 * Hierarquia:
 *   super_admin → acesso total à plataforma
 *   diretor     → acesso total à sua unidade (inclui quem tem is_direcao_centro=true)
 *   chefe       → acesso à sua subunidade
 *   servidor    → apenas funcionalidades concedidas pelo chefe
 */
function getNivelAcesso(usuario) {
    if (usuario.permissao === "super_admin") return "super_admin";
    if (usuario.is_direcao_centro)           return "diretor";
    if (["diretor", "vice_diretor"].includes(usuario.permissao)) return "diretor";
    if (["chefe", "subchefe"].includes(usuario.permissao))       return "chefe";
    return "servidor";
}

/**
 * Middleware de autorização por nível.
 *
 * Uso: autorizar("super_admin")          — só super admin
 *      autorizar("diretor")              — diretor ou superior
 *      autorizar("chefe")                — chefe ou superior
 *      autorizar("servidor", "criar_despesa") — servidor com funcionalidade específica OU superior
 *
 * @param {string} nivelMinimo - Nível mínimo exigido
 * @param {string} [funcionalidade] - Nome da funcionalidade (apenas para nível "servidor")
 */
function autorizar(nivelMinimo, funcionalidade = null) {
    const HIERARQUIA = { super_admin: 4, diretor: 3, chefe: 2, servidor: 1 };

    return async (req, res, next) => {
        try {
            const usuario = req.usuario;
            const nivelEfetivo = getNivelAcesso(usuario);
            const pesoEfetivo  = HIERARQUIA[nivelEfetivo]  ?? 0;
            const pesoMinimo   = HIERARQUIA[nivelMinimo]   ?? 0;

            // Nível suficiente na hierarquia → acesso garantido
            if (pesoEfetivo >= pesoMinimo) {
                req.nivelAcesso = nivelEfetivo;
                return next();
            }

            // Servidor com funcionalidade específica concedida
            if (nivelEfetivo === "servidor" && funcionalidade) {
                const { rows } = await pool.query(
                    `SELECT pu.id
                     FROM permissoes_usuario pu
                     JOIN funcionalidades f ON f.id = pu.funcionalidade_id
                     WHERE pu.user_id = $1 AND f.nome = $2`,
                    [usuario.id, funcionalidade]
                );
                if (rows.length > 0) {
                    req.nivelAcesso = "servidor";
                    return next();
                }
            }

            return res.status(403).json({
                status: "error",
                message: "Acesso negado. Você não tem permissão para esta ação.",
                data: null
            });
        } catch (error) {
            return res.status(500).json({
                status: "error",
                message: "Erro ao verificar permissões.",
                data: null
            });
        }
    };
}

/**
 * Filtra o escopo de dados conforme o nível do usuário.
 * Retorna a cláusula WHERE e os params para filtrar por subunidade/unidade.
 *
 * Uso nas rotas:
 *   const { whereClause, params } = getEscopoFiltro(req.usuario, req.nivelAcesso, baseParams);
 */
function getEscopoFiltro(usuario, nivelAcesso, baseParams = []) {
    if (nivelAcesso === "super_admin" || nivelAcesso === "diretor") {
        // Acesso total (diretor vê sua unidade inteira, super_admin vê tudo)
        // A filtragem extra por unidade_id pode ser adicionada nas rotas se necessário
        return { whereClause: "", params: baseParams };
    }

    // Chefe e servidor → filtra pela subunidade do usuário
    const idx = baseParams.length + 1;
    return {
        whereClause: `AND subunidade_id = $${idx}`,
        params: [...baseParams, usuario.subunidade]
    };
}

module.exports = { autorizar, getNivelAcesso, getEscopoFiltro };
