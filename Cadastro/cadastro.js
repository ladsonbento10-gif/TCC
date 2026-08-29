/* ===== Troca de tipo via tabs ===== */
function selecionarTipo(tipo) {
    var divAdmin   = document.getElementById("campo_admin");
    var divCliente = document.getElementById("campo_cliente");
    var hidden     = document.getElementById("tipo_hidden");
    var tabs       = document.querySelectorAll(".tab-btn");

    // Desabilita e oculta tudo
    document.querySelectorAll("#campo_admin input, #campo_admin select, #campo_cliente input, #campo_cliente select").forEach(function(el) {
        el.removeAttribute("required");
        el.disabled = true;
    });

    divAdmin.style.display   = "none";
    divCliente.style.display = "none";

    // Marca tab ativa
    tabs.forEach(function(btn) { btn.classList.remove("ativo"); });

    if (tipo === "administrador") {
        divAdmin.style.display = "block";
        hidden.value = "administrador";
        tabs[0].classList.add("ativo");

        document.querySelectorAll("#campo_admin input, #campo_admin select").forEach(function(el) {
            el.setAttribute("required", true);
            el.disabled = false;
        });

    } else if (tipo === "cliente") {
        divCliente.style.display = "block";
        hidden.value = "cliente";
        tabs[1].classList.add("ativo");

        document.querySelectorAll("#campo_cliente input, #campo_cliente select").forEach(function(el) {
            el.setAttribute("required", true);
            el.disabled = false;
        });
    }
}

/* ===== Toggle de senha — Administrador ===== */
document.addEventListener("DOMContentLoaded", function() {

    var senha = document.getElementById("senha");
    var olho  = document.getElementById("olho");

    if (olho && senha) {
        olho.addEventListener("click", function() {
            if (senha.type === "password") {
                senha.type  = "text";
                olho.src    = "olho_fechado.png";
                olho.style.opacity = "0.85";
            } else {
                senha.type  = "password";
                olho.src    = "olho.png";
                olho.style.opacity = "0.45";
            }
        });
    }

    /* ===== Toggle de senha — Cliente ===== */
    var senhaCliente = document.getElementById("senha_cliente");
    var olhoCliente  = document.getElementById("olho_cliente");

    if (olhoCliente && senhaCliente) {
        olhoCliente.addEventListener("click", function() {
            if (senhaCliente.type === "password") {
                senhaCliente.type    = "text";
                olhoCliente.src      = "olho_fechado.png";
                olhoCliente.style.opacity = "0.85";
            } else {
                senhaCliente.type    = "password";
                olhoCliente.src      = "olho.png";
                olhoCliente.style.opacity = "0.45";
            }
        });
    }

    /* Inicia com Administrador selecionado */
    selecionarTipo("administrador");
});
