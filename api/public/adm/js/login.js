// Redirecionar se já estiver autenticado como admin
(function () {
    var siccr = JSON.parse(localStorage.getItem("siccr") || "null");
    var token = localStorage.getItem("siccr_token");
    if (token && siccr && siccr.permissao === "admin") {
        window.location.replace("/adm/painel");
    }
})();

const frmLoginAdmin = document.querySelector("#frmLoginAdmin");
const btnEntrar = document.querySelector("#btnEntrar");
const msgErro = document.querySelector("#msgErro");

function mostrarErro(msg) {
    msgErro.textContent = msg;
    msgErro.classList.add("visivel");
}

function ocultarErro() {
    msgErro.classList.remove("visivel");
}

frmLoginAdmin.addEventListener("submit", async function (event) {
    event.preventDefault();
    ocultarErro();

    const siape = document.querySelector("#txtSiape").value.trim();
    const senha = document.querySelector("#txtSenha").value;

    if (!siape || !senha) {
        mostrarErro("Preencha o SIAPE e a senha.");
        return;
    }

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Aguarde...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siape, senha })
        });

        const data = await response.json();

        if (data.status !== "success") {
            mostrarErro("SIAPE ou senha inválidos.");
            return;
        }

        const usuario = data.data[0];

        if (usuario.permissao !== "admin") {
            mostrarErro("Acesso negado. Apenas administradores podem acessar esta área.");
            return;
        }

        localStorage.setItem("siccr", JSON.stringify({
            user_id: usuario.user_id,
            nome: usuario.nome,
            siape: usuario.siape,
            email: usuario.email,
            permissao: usuario.permissao,
            subunidade_id: usuario.subunidade_id
        }));
        localStorage.setItem("siccr_token", data.token);
        localStorage.setItem("permissao", usuario.permissao);

        window.location.replace("/adm/painel");

    } catch (error) {
        mostrarErro("Erro ao tentar conectar ao servidor. Tente novamente.");
    } finally {
        btnEntrar.disabled = false;
        btnEntrar.textContent = "Entrar";
    }
});
