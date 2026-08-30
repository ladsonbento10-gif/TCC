// ======================================================
// CADASTRO - ADMINISTRADOR / CLIENTE / VIACEP
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    // ======================================================
    // SENHA DO ADMINISTRADOR
    // ======================================================

    var senhaAdmin = document.getElementById("senha");
    var olhoAdmin = document.getElementById("olho");

    if (senhaAdmin && olhoAdmin) {

        olhoAdmin.addEventListener("click", function () {

            if (senhaAdmin.type === "password") {

                senhaAdmin.type = "text";
                olhoAdmin.src = "olho_fechado.png";
                olhoAdmin.style.opacity = "0.85";

            } else {

                senhaAdmin.type = "password";
                olhoAdmin.src = "olho.png";
                olhoAdmin.style.opacity = "0.45";

            }

        });

    }


    // ======================================================
    // SENHA DO CLIENTE
    // ======================================================

    var senhaCliente = document.getElementById("senha_cliente");
    var olhoCliente = document.getElementById("olho_cliente");

    if (senhaCliente && olhoCliente) {

        olhoCliente.addEventListener("click", function () {

            if (senhaCliente.type === "password") {

                senhaCliente.type = "text";
                olhoCliente.src = "olho_fechado.png";
                olhoCliente.style.opacity = "0.85";

            } else {

                senhaCliente.type = "password";
                olhoCliente.src = "olho.png";
                olhoCliente.style.opacity = "0.45";

            }

        });

    }


    // ======================================================
    // VIACEP
    // ======================================================

    var campoCep = document.querySelector(
        '#campo_cliente input[name="cep"]'
    );

    var campoEndereco = document.querySelector(
        '#campo_cliente input[name="endereco"]'
    );

    var campoBairro = document.querySelector(
        '#campo_cliente input[name="bairro"]'
    );

    var campoCidade = document.querySelector(
        '#campo_cliente input[name="cidade"]'
    );

    var campoEstado = document.querySelector(
        '#campo_cliente input[name="estado"]'
    );


    if (campoCep) {

        campoCep.addEventListener("input", function () {

            // Retira tudo que não for número
            var cep = campoCep.value.replace(/\D/g, "");

            // Limita o CEP para 8 números
            cep = cep.substring(0, 8);


            // ==================================================
            // MÁSCARA DO CEP
            // ==================================================

            if (cep.length > 5) {

                campoCep.value =
                    cep.substring(0, 5) +
                    "-" +
                    cep.substring(5);

            } else {

                campoCep.value = cep;

            }


            // ==================================================
            // CONSULTA SOMENTE COM 8 NÚMEROS
            // ==================================================

            if (cep.length !== 8) {
                return;
            }


            // ==================================================
            // CONSULTA VIACEP
            // ==================================================

            fetch("https://viacep.com.br/ws/" + cep + "/json/")

                .then(function (resposta) {

                    if (!resposta.ok) {
                        throw new Error("Erro ao consultar o CEP.");
                    }

                    return resposta.json();

                })

                .then(function (dados) {


                    // ==========================================
                    // CEP NÃO ENCONTRADO
                    // ==========================================

                    if (dados.erro) {

                        alert("CEP não encontrado.");

                        campoEndereco.value = "";
                        campoBairro.value = "";
                        campoCidade.value = "";
                        campoEstado.value = "";

                        return;
                    }


                    // ==========================================
                    // PREENCHER OS CAMPOS
                    // ==========================================

                    campoEndereco.value =
                        dados.logradouro || "";

                    campoBairro.value =
                        dados.bairro || "";

                    campoCidade.value =
                        dados.localidade || "";

                    campoEstado.value =
                        dados.uf || "";


                })

                .catch(function (erro) {

                    console.error(
                        "Erro ao consultar o ViaCEP:",
                        erro
                    );

                });

        });

    }

});


// ======================================================
// SELECIONAR ADMINISTRADOR OU CLIENTE
// ======================================================

function selecionarTipo(tipo) {

    var divAdmin =
        document.getElementById("campo_admin");

    var divCliente =
        document.getElementById("campo_cliente");

    var hidden =
        document.getElementById("tipo_hidden");

    var tabs =
        document.querySelectorAll(".tab-btn");


    // ======================================================
    // DESABILITAR TODOS OS CAMPOS
    // ======================================================

    document.querySelectorAll(
        "#campo_admin input, #campo_admin select, " +
        "#campo_cliente input, #campo_cliente select"
    ).forEach(function (campo) {

        campo.removeAttribute("required");
        campo.disabled = true;

    });


    // ======================================================
    // ESCONDER AS DUAS ÁREAS
    // ======================================================

    divAdmin.style.display = "none";
    divCliente.style.display = "none";


    // ======================================================
    // REMOVER TAB ATIVA
    // ======================================================

    tabs.forEach(function (botao) {

        botao.classList.remove("ativo");

    });


    // ======================================================
    // ADMINISTRADOR
    // ======================================================

    if (tipo === "administrador") {

        divAdmin.style.display = "block";

        hidden.value = "administrador";

        if (tabs[0]) {
            tabs[0].classList.add("ativo");
        }


        document.querySelectorAll(
            "#campo_admin input, #campo_admin select"
        ).forEach(function (campo) {

            campo.setAttribute("required", true);
            campo.disabled = false;

        });

    }


    // ======================================================
    // CLIENTE
    // ======================================================

    else if (tipo === "cliente") {

        divCliente.style.display = "block";

        hidden.value = "cliente";

        if (tabs[1]) {
            tabs[1].classList.add("ativo");
        }


        document.querySelectorAll(
            "#campo_cliente input, #campo_cliente select"
        ).forEach(function (campo) {

            campo.setAttribute("required", true);
            campo.disabled = false;

        });

    }

}