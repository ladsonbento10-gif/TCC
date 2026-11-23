// admin_menu.js - comportamento do menu lateral, igual em TODAS as páginas do administrador:
// recolher/expandir (lembra a escolha), item ativo, confirmação ao sair e nome do administrador.
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".sidebar");
    const menuToggle = document.getElementById("menuToggle");

    // ----- recolher / expandir -----
    if (menuToggle && sidebar) {
        let recolhido = null;
        try { recolhido = localStorage.getItem("menuAdminRecolhido"); } catch (e) { /* sem storage */ }
        if (recolhido === "1") sidebar.classList.add("collapsed");

        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            try { localStorage.setItem("menuAdminRecolhido", sidebar.classList.contains("collapsed") ? "1" : "0"); } catch (e) { /* sem storage */ }
        });
    }

    // ----- item ativo (considera também a aba #painel-... da página de produtos) -----
    function marcarAtivo() {
        const links = document.querySelectorAll(".sidebar .menu li a");
        const arquivoAtual = location.pathname.split("/").pop();
        let hash = location.hash;
        if (arquivoAtual === "estoque.html" && !hash) hash = "#painel-produto";

        let achou = false;
        links.forEach((a) => {
            const li = a.parentElement;
            const url = new URL(a.getAttribute("href"), location.href);
            const mesmoArquivo = url.pathname.split("/").pop() === arquivoAtual;
            const mesmoHash = url.hash === "" ? true : url.hash === hash;
            const ativo = mesmoArquivo && mesmoHash && !(arquivoAtual === "estoque.html" && url.hash === "");
            li.classList.toggle("active", ativo);
            if (ativo) achou = true;
        });
        if (!achou) { /* página sem item no menu: nada fica ativo */ }
    }
    marcarAtivo();
    window.addEventListener("hashchange", marcarAtivo);

    // ----- sair com confirmação -----
    document.querySelectorAll(".sidebar .logout-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            if (!confirm("Tem certeza que deseja sair da Área do Administrador?")) e.preventDefault();
        });
    });

    // ----- nome do administrador no topo -----
    let nome = null;
    try { nome = localStorage.getItem("nomeAdmin"); } catch (e) { /* sem storage */ }
    if (nome) {
        ["nomeAdminHeader", "nomeAdminBoasVindas"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = nome;
        });
    }
});