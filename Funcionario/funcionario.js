// funcionario.js - lista, cadastra, edita e ativa/desativa funcionários (dados do banco).
// O menu lateral fica em ../Administrador/admin_menu.js
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    let funcionarios = [];
    let cargos = [];

    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const dinheiro = (v) => (v === null || v === "" ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
    const dataBR = (d) => (d ? d.split("-").reverse().join("/") : "—");

    async function chamar(url, opcoes) {
        const resp = await fetch(url, Object.assign({ credentials: "same-origin", cache: "no-store" }, opcoes));
        if (resp.status === 401) {
            window.location.replace("../Administrador/Pagina_de_Login_Administrador.html");
            throw new Error("Sessão expirada.");
        }
        const json = await resp.json();
        if (!json.sucesso) throw new Error(json.mensagem || "Erro inesperado.");
        return json;
    }

    function desenhar() {
        const termo = $("buscaFuncionario").value.trim().toLowerCase();
        const lista = funcionarios.filter((f) =>
            !termo || [f.nome, f.cpf, f.email, f.nome_cargo].some((x) => String(x || "").toLowerCase().includes(termo)));
        const tbody = $("tabela-funcionarios");
        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="tabela-vazia">Nenhum funcionário encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map((f) => `<tr>
            <td>${esc(f.nome)}</td>
            <td>${esc(f.cpf)}</td>
            <td>${esc(f.email)}</td>
            <td>${dataBR(f.data_admissao)}</td>
            <td>${dinheiro(f.salario)}</td>
            <td>${esc(f.nome_cargo)}</td>
            <td><span class="status-badge ${Number(f.ativo) === 1 ? "success" : "danger"}">${Number(f.ativo) === 1 ? "Ativo" : "Inativo"}</span></td>
            <td class="acoes-linha">
                <button type="button" class="btn-mini" data-editar="${f.id_funcionario}"><i class="fas fa-pen"></i> Editar</button>
                <button type="button" class="btn-mini ${Number(f.ativo) === 1 ? "perigo" : ""}" data-alternar="${f.id_funcionario}">
                    ${Number(f.ativo) === 1 ? "Desativar" : "Ativar"}</button>
            </td>
        </tr>`).join("");
    }

    async function carregar() {
        try {
            const j = await chamar("funcionario.php?acao=listar");
            funcionarios = j.funcionarios;
            cargos = j.cargos;
            $("campoCargo").innerHTML = '<option value="">Selecione...</option>' +
                cargos.map((c) => `<option value="${c.id_cargo}">${esc(c.nome)}</option>`).join("");
            desenhar();
        } catch (e) {
            $("tabela-funcionarios").innerHTML = `<tr><td colspan="8" class="tabela-vazia erro-txt">${esc(e.message)}</td></tr>`;
        }
    }

    // ----- modal -----
    const modal = $("modalFuncionario");
    const form = $("formFuncionario");
    const msg = $("msgFuncionario");

    function aviso(texto, ok) { msg.textContent = texto; msg.className = "form-msg " + (ok ? "ok" : "erro"); }

    function abrirModal(f) {
        form.reset();
        aviso("", true);
        $("tituloModalFuncionario").textContent = f ? "Editar funcionário" : "Novo funcionário";
        form.elements.id.value = f ? f.id_funcionario : "";
        if (f) {
            form.elements.nome.value = f.nome;
            form.elements.cpf.value = f.cpf;
            form.elements.email.value = f.email;
            form.elements.telefone.value = f.telefone || "";
            form.elements.data_nascimento.value = f.data_nascimento || "";
            form.elements.data_admissao.value = f.data_admissao;
            form.elements.salario.value = f.salario ?? "";
            form.elements.cargo_id.value = f.cargo_id;
            form.elements.ativo.value = Number(f.ativo) === 1 ? "1" : "0";
        } else {
            form.elements.data_admissao.value = new Date().toISOString().slice(0, 10);
        }
        modal.hidden = false;
        form.elements.nome.focus();
    }
    const fechar = () => { modal.hidden = true; };

    $("btnNovoFuncionario").addEventListener("click", () => abrirModal(null));
    $("fecharModalFuncionario").addEventListener("click", fechar);
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
    $("buscaFuncionario").addEventListener("input", desenhar);

    $("tabela-funcionarios").addEventListener("click", async (e) => {
        const ed = e.target.closest("[data-editar]");
        const al = e.target.closest("[data-alternar]");
        if (ed) {
            abrirModal(funcionarios.find((f) => String(f.id_funcionario) === ed.dataset.editar));
        } else if (al) {
            const f = funcionarios.find((x) => String(x.id_funcionario) === al.dataset.alternar);
            const acao = Number(f.ativo) === 1 ? "desativar" : "ativar";
            if (!confirm(`Deseja ${acao} ${f.nome}?`)) return;
            try {
                await chamar("funcionario.php", { method: "POST", body: new URLSearchParams({ acao: "alternar", id: f.id_funcionario }) });
                await carregar();
            } catch (err) { alert(err.message); }
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const botao = form.querySelector("button[type=submit]");
        const corpo = new URLSearchParams(new FormData(form));
        corpo.set("acao", "salvar");
        botao.disabled = true;
        try {
            const j = await chamar("funcionario.php", { method: "POST", body: corpo });
            aviso(j.mensagem, true);
            await carregar();
            setTimeout(fechar, 700);
        } catch (err) {
            aviso(err.message, false);
        } finally {
            botao.disabled = false;
        }
    });

    carregar();
});
