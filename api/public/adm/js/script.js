document.addEventListener("DOMContentLoaded", function(event) {
    console.log("Módulo Administrativo carregado.");

    // Seleção de elementos
    const btnAdicionar = document.querySelector(".btn_adicionar");
    const frmUnidade = document.querySelector(".frmUnidade");
    const btnCadastrarUnidade = document.querySelector(".cadastrarUnidade");
    const btnCancelarUnidade = document.querySelector(".cancelarUnidade");
    const dialogPainel = document.querySelector(".dialogPainel");

    // Adição de Listeners
    btnAdicionar.addEventListener("click", function(event) {
        event.preventDefault();
        if (event.target.classList.contains("unidade")) {
            dialogPainel.showModal();
        }
    });

    btnCancelarUnidade.addEventListener("click", function(event) {
        event.preventDefault();
        frmUnidade.reset();
        dialogPainel.close();
    });
});