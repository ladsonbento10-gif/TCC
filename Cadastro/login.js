// login.js - botões da tela de login: Entrar, "Esqueci minha senha" e criar conta.
document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("formLogin");
    if (!form) return;

    var caixaErro = document.getElementById("erro-login");
    var botao = form.querySelector('button[type="submit"]');
    var textoBotao = botao ? botao.textContent : "Entrar";

    function mostrar(msg) {
        caixaErro.textContent = msg;
        caixaErro.style.display = "block";
    }

    function esconder() {
        caixaErro.style.display = "none";
    }

    form.addEventListener("input", esconder);

    // ENTRAR
    form.addEventListener("submit", function (evento) {
        evento.preventDefault();
        esconder();

        botao.disabled = true;
        botao.textContent = "Entrando...";

        fetch("login.php", {
            method: "POST",
            body: new FormData(form),
            credentials: "same-origin"
        })
            .then(function (resposta) {
                return resposta.json().catch(function () {
                    throw new Error("Resposta inválida do servidor.");
                });
            })
            .then(function (dados) {
                if (!dados.sucesso) {
                    mostrar(dados.mensagem || "E-mail ou senha incorretos. Tente novamente.");
                    botao.disabled = false;
                    botao.textContent = textoBotao;
                    return;
                }

                try {
                    if (dados.tipo === "admin") {
                        localStorage.setItem("nomeAdmin", dados.nome);
                    } else {
                        localStorage.setItem("nomeCliente", dados.nome);
                        localStorage.setItem("idCliente", dados.id);
                    }
                } catch (e) { /* sem localStorage: segue mesmo assim */ }

                window.location.href = dados.destino;
            })
            .catch(function () {
                mostrar("Não foi possível conectar ao servidor. Abra a página pelo localhost (XAMPP) e tente novamente.");
                botao.disabled = false;
                botao.textContent = textoBotao;
            });
    });

    // ESQUECI MINHA SENHA (sem envio de e-mail)
    var esqueci = document.querySelector(".link-esqueci");
    if (esqueci) {
        esqueci.addEventListener("click", function (evento) {
            evento.preventDefault();
            mostrar("A recuperação de senha por e-mail não está disponível. Procure o administrador do sistema.");
        });
    }
});
