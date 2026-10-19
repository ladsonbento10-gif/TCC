document.addEventListener("DOMContentLoaded", () => {
    const corpo = document.getElementById("corpoClientes");
    const selectPorPagina = document.getElementById("porPagina");
    const busca = document.getElementById("buscaCliente");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnProxima = document.getElementById("btnProxima");
    const info = document.getElementById("infoClientes");
    const paginaAtualEl = document.getElementById("paginaAtual");

    let pagina = 1;
    let totalPaginas = 1;
    let temporizador;

    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const fmtData = (d) => {
        if (!d || d.startsWith("0000")) return "-";
        const [a, m, di] = d.split("-");
        return `${di}/${m}/${a}`;
    };

    const fmtCpf = (c) => {
        const n = String(c ?? "").replace(/\D/g, "");
        return n.length === 11 ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (c || "-");
    };

    const fmtTel = (c) => c.numero_fone ? `(${c.dd_fone || ""}) ${c.numero_fone}` : "-";

    const fmtEndereco = (c) => {
        if (!c.rua) return "-";
        return [c.rua + (c.numero ? ", " + c.numero : ""), c.complemento].filter(Boolean).join(" - ");
    };

    async function carregar() {
        corpo.innerHTML = '<tr><td colspan="10">Carregando...</td></tr>';
        const params = new URLSearchParams({
            pagina, por_pagina: selectPorPagina.value, busca: busca.value.trim()
        });

        try {
            const resp = await fetch("listar_clientes.php?" + params);
            const dados = await resp.json();

            if (!dados.sucesso) {
                corpo.innerHTML = `<tr><td colspan="10">${esc(dados.mensagem)}</td></tr>`;
                return;
            }

            pagina = dados.pagina;
            totalPaginas = dados.total_paginas;

            corpo.innerHTML = dados.clientes.length
                ? dados.clientes.map((c) => `
                    <tr>
                        <td>${esc(c.id_cliente)}</td>
                        <td>${esc(c.nome)}</td>
                        <td>${esc(fmtCpf(c.cpf))}</td>
                        <td>${esc(c.email)}</td>
                        <td>${esc(fmtData(c.data_nascimento))}</td>
                        <td>${esc(fmtTel(c))}</td>
                        <td>${esc(fmtEndereco(c))}</td>
                        <td>${esc(c.nome_bairro || "-")}</td>
                        <td>${esc(c.nome_cidades || "-")}${c.nome_estados ? " / " + esc(c.nome_estados) : ""}</td>
                        <td>${esc(c.cep || "-")}</td>
                    </tr>`).join("")
                : '<tr><td colspan="10">Nenhum cliente encontrado.</td></tr>';

            const ini = dados.total ? (pagina - 1) * dados.por_pagina + 1 : 0;
            const fim = Math.min(pagina * dados.por_pagina, dados.total);
            info.textContent = `Mostrando ${ini}-${fim} de ${dados.total} clientes`;
            paginaAtualEl.textContent = `Página ${pagina} de ${totalPaginas}`;
            btnAnterior.disabled = pagina <= 1;
            btnProxima.disabled = pagina >= totalPaginas;
        } catch (e) {
            corpo.innerHTML = '<tr><td colspan="10">Não foi possível carregar os clientes.</td></tr>';
        }
    }

    selectPorPagina.addEventListener("change", () => { pagina = 1; carregar(); });
    busca.addEventListener("input", () => {
        clearTimeout(temporizador);
        temporizador = setTimeout(() => { pagina = 1; carregar(); }, 350);
    });
    btnAnterior.addEventListener("click", () => { if (pagina > 1) { pagina--; carregar(); } });
    btnProxima.addEventListener("click", () => { if (pagina < totalPaginas) { pagina++; carregar(); } });

    carregar();
});
