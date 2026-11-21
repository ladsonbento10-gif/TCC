// configuracao.js - lê e salva as configurações da loja (configuracao.php).
// O menu lateral fica em ../Administrador/admin_menu.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formConfig");
    const msg = document.getElementById("msgConfig");

    function aviso(texto, ok) { msg.textContent = texto; msg.className = "form-msg " + (ok ? "ok" : "erro"); }

    function preencher(cfg) {
        Object.keys(cfg).forEach((chave) => {
            if (form.elements[chave]) form.elements[chave].value = cfg[chave];
        });
    }

    async function chamar(opcoes) {
        const resp = await fetch("configuracao.php", Object.assign({ credentials: "same-origin", cache: "no-store" }, opcoes));
        if (resp.status === 401) { window.location.replace("../Administrador/Pagina_de_Login_Administrador.html"); throw new Error("Sessão expirada."); }
        const j = await resp.json();
        if (!j.sucesso) throw new Error(j.mensagem || "Erro inesperado.");
        return j;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const botao = form.querySelector("button[type=submit]");
        botao.disabled = true;
        try {
            const j = await chamar({ method: "POST", body: new URLSearchParams(new FormData(form)) });
            preencher(j.config);
            aviso(j.mensagem, true);
        } catch (err) {
            aviso(err.message, false);
        } finally {
            botao.disabled = false;
        }
    });

    chamar({}).then((j) => preencher(j.config)).catch((err) => aviso(err.message, false));
});
