// relatorio.js - relatórios de vendas com dados do banco (relatorio.php).
// O menu lateral fica em ../Administrador/admin_menu.js
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const dataHora = (s) => { const [d, h] = String(s).split(" "); return d.split("-").reverse().join("/") + " " + (h || "").slice(0, 5); };

    let grafico = null;

    function periodo(de, ate) { $("filtroDe").value = de; $("filtroAte").value = ate; }
    function marcarAtalho(btn) {
        document.querySelectorAll("#atalhosPeriodo .btn-sec").forEach((b) => b.classList.toggle("ativo", b === btn));
    }

    async function carregar() {
        const de = $("filtroDe").value, ate = $("filtroAte").value;
        $("msgRelatorio").textContent = "";
        try {
            const resp = await fetch("relatorio.php?" + new URLSearchParams({ de, ate }), { credentials: "same-origin", cache: "no-store" });
            if (resp.status === 401) { window.location.replace("../Administrador/Pagina_de_Login_Administrador.html"); return; }
            const j = await resp.json();
            if (!j.sucesso) throw new Error(j.mensagem);
            desenhar(j);
        } catch (e) {
            $("msgRelatorio").textContent = e.message || "Não foi possível carregar o relatório.";
        }
    }

    function linhas(tbody, lista, vazio, colunas) {
        tbody.innerHTML = lista.length ? lista.map(colunas).join("") : `<tr><td colspan="9" class="tabela-vazia">${vazio}</td></tr>`;
    }

    function desenhar(j) {
        $("kpiFaturamento").textContent = reais(j.resumo.faturamento);
        $("kpiPedidos").textContent = j.resumo.pedidos;
        $("kpiTicket").textContent = reais(j.resumo.ticket_medio);
        $("kpiItens").textContent = j.resumo.itens;

        // gráfico
        const dias = j.por_dia.map((d) => d.dia.split("-").reverse().slice(0, 2).join("/"));
        const totais = j.por_dia.map((d) => Number(d.total));
        $("semDados").hidden = totais.length > 0;
        if (grafico) grafico.destroy();
        if (window.Chart) {
            grafico = new Chart($("graficoDias"), {
                type: "bar",
                data: { labels: dias, datasets: [{ label: "Vendas (R$)", data: totais, backgroundColor: "#1f9c50", borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                           scales: { y: { beginAtZero: true, ticks: { callback: (v) => "R$ " + v } } } },
            });
        }

        linhas($("tbTop"), j.top_produtos, "Sem vendas no período.",
            (p) => `<tr><td>${esc(p.produto)}</td><td class="num">${Number(p.quantidade)}</td><td class="num">${reais(p.total)}</td></tr>`);
        linhas($("tbPagamento"), j.por_pagamento, "Sem vendas no período.",
            (p) => `<tr><td>${esc(p.forma)}</td><td class="num">${Number(p.pedidos)}</td><td class="num">${reais(p.total)}</td></tr>`);
        $("limiteEstoque").textContent = "(quantidade até " + j.limite_estoque + ")";
        linhas($("tbBaixo"), j.estoque_baixo, "Nenhum produto com estoque baixo.",
            (p) => `<tr><td>${esc(p.produto)}</td><td class="num">${Number(p.quantidade)}</td></tr>`);

        const opcoes = (lista, atual) => lista.map((s) => `<option${s === atual ? " selected" : ""}>${esc(s)}</option>`).join("");
        linhas($("tbPedidos"), j.pedidos, "Nenhum pedido no período.", (p) => `<tr data-id="${p.id}">
            <td>#${p.id}</td><td>${dataHora(p.data_venda)}</td><td>${esc(p.cliente || "—")}</td><td>${esc(p.forma || "—")}</td>
            <td class="num">${reais(p.preco_total)}</td>
            <td><select class="sel-status" data-campo="status_venda" aria-label="Status do pedido ${p.id}">${opcoes(j.status_venda, p.status_venda)}</select></td>
            <td>${p.status_envio ? `<select class="sel-status" data-campo="status_envio" aria-label="Entrega do pedido ${p.id}">${opcoes(j.status_envio, p.status_envio)}</select>` : "—"}</td>
            <td>${esc(p.codigo_rastreio || "—")}</td></tr>`);
    }

    // mudar status de um pedido
    $("tbPedidos").addEventListener("change", async (e) => {
        const sel = e.target.closest("select[data-campo]");
        if (!sel) return;
        const id = sel.closest("tr").dataset.id;
        if (sel.dataset.campo === "status_venda" && ["Cancelado", "Estornado"].includes(sel.value) &&
            !confirm(`Marcar o pedido #${id} como ${sel.value}? Os produtos voltam para o estoque.`)) { carregar(); return; }
        const corpo = new URLSearchParams({ acao: "status", id_venda: id });
        corpo.set(sel.dataset.campo, sel.value);
        try {
            const resp = await fetch("relatorio.php", { method: "POST", body: corpo, credentials: "same-origin" });
            const j = await resp.json();
            if (!j.sucesso) throw new Error(j.mensagem);
            carregar();
        } catch (err) { alert(err.message); carregar(); }
    });

    $("atalhosPeriodo").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const hoje = new Date();
        if (b.dataset.mes) periodo(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(hoje));
        else periodo(iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - Number(b.dataset.dias))), iso(hoje));
        marcarAtalho(b);
        carregar();
    });
    $("btnFiltrar").addEventListener("click", () => { marcarAtalho(null); carregar(); });
    $("btnCsv").addEventListener("click", () => {
        window.location.href = "relatorio.php?" + new URLSearchParams({ exportar: "csv", de: $("filtroDe").value, ate: $("filtroAte").value });
    });

    const hoje = new Date();
    periodo(iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(hoje));
    carregar();
});
