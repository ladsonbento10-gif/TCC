document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            localStorage.setItem("menuAdminRecolhido", sidebar.classList.contains("collapsed") ? "1" : "0");
        });

        if (localStorage.getItem("menuAdminRecolhido") === "1") {
            sidebar.classList.add("collapsed");
        }
    }
});
document.addEventListener("DOMContentLoaded", () => {
    // Código original do seu menu responsivo
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            localStorage.setItem("menuAdminRecolhido", sidebar.classList.contains("collapsed") ? "1" : "0");
        });

        if (localStorage.getItem("menuAdminRecolhido") === "1") {
            sidebar.classList.add("collapsed");
        }
    }

    // --- REQUISIÇÃO PARA PEGAR OS FUNCIONÁRIOS DO BANCO ---
    carregarFuncionarios();
});

function carregarFuncionarios() {
    const tabelaBody = document.getElementById("tabela-funcionarios");

    // Faz a chamada em segundo plano para o arquivo PHP
    fetch("buscar_funcionarios.php")
        .then(response => response.json())
        .then(funcionarios => {
            tabelaBody.innerHTML = ""; // Limpa a mensagem de "Carregando..."

            if (funcionarios.erro) {
                tabelaBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Erro: ${funcionarios.erro}</td></tr>`;
                return;
            }

            if (funcionarios.length === 0) {
                tabelaBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>`;
                return;
            }

            // Loop para criar cada linha (<tr>) da tabela HTML da sua maneira original
            funcionarios.forEach(f => {
                const tr = document.createElement("tr");

                // Mapeia o status binário (1 e 0) para Ativo/Inativo
                const statusTexto = f.ativo == 1 ? "Ativo" : "Inativo";

                tr.innerHTML = `
                    <td>${f.nome}</td>
                    <td>${f.cpf}</td>
                    <td>${f.email}</td>
                    <td>${f.telefone ? f.telefone : ''}</td>
                    <td>${f.data_nascimento ? f.data_nascimento : ''}</td>
                    <td>${f.data_admissao}</td>
                    <td>${f.salario}</td>
                    <td>${f.nome_cargo}</td>
                    <td>${statusTexto}</td>
                `;
                tabelaBody.appendChild(tr);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar dados:", error);
            tabelaBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Erro ao processar a listagem.</td></tr>`;
        });
}
