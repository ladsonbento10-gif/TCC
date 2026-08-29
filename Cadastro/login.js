document.addEventListener("DOMContentLoaded", function () {

    /* ===== Toggle de senha ===== */
    var senha = document.getElementById("senha");
    var olho  = document.getElementById("olho");

    if (olho && senha) {
        olho.addEventListener("click", function () {
            if (senha.type === "password") {
                senha.type         = "text";
                olho.src           = "olho_fechado.png";
                olho.style.opacity = "0.85";
            } else {
                senha.type         = "password";
                olho.src           = "olho.png";
                olho.style.opacity = "0.45";
            }
        });
    }

    /* ===== Validação básica no submit ===== */
    var form  = document.getElementById("formLogin");
    var erro  = document.getElementById("erro-login");
    var botao = form ? form.querySelector(".botao") : null;

    if (form) {
        form.addEventListener("submit", function (e) {
            var emailVal = document.getElementById("email").value.trim();
            var senhaVal = senha ? senha.value : "";

            if (!emailVal || !senhaVal) {
                e.preventDefault();
                if (erro) {
                    erro.textContent = "Preencha o e-mail e a senha antes de continuar.";
                    erro.style.display = "block";
                }
                return;
            }

            /* Feedback visual de carregamento */
            if (botao) {
                botao.textContent = "Entrando...";
                botao.disabled    = true;
                botao.style.opacity = "0.75";
            }
        });

        /* Esconde o erro ao digitar novamente */
        form.querySelectorAll("input").forEach(function (el) {
            el.addEventListener("input", function () {
                if (erro) erro.style.display = "none";
            });
        });
    }
});
