// admin_painel.js - painel principal do administrador:
// dados do banco em tempo real, sininho de notificações, menu do usuário e perfil.
document.addEventListener("DOMContentLoaded", () => {
    const INTERVALO_MS = 5000; // atualização automática a cada 5 segundos
    const $ = (id) => document.getElementById(id);

    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    function paraData(texto) {
        return texto ? new Date(String(texto).replace(" ", "T")) : null;
    }

    function formatarQuando(texto) {
        const d = paraData(texto);
        if (!d || isNaN(d)) return "";
        const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const hoje = new Date();
        const ontem = new Date();
        ontem.setDate(hoje.getDate() - 1);
        if (d.toDateString() === hoje.toDateString()) return "Hoje, " + hora;
        if (d.toDateString() === ontem.toDateString()) return "Ontem, " + hora;
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + ", " + hora;
    }

    // ---------- Painel em tempo real ----------
    let limiteBaixo = 10;

    function statusEstoque(qtd) {
        qtd = Number(qtd);
        if (qtd <= 0) return ["danger", "Esgotado"];
        if (qtd <= limiteBaixo) return ["warning", "Estoque baixo"];
        return ["success", "Em estoque"];
    }

    function atualizarCartoes(c) {
        const mapa = { cardProdutos: c.produtos, cardClientes: c.clientes, cardPedidos: c.pedidos, cardEstoqueBaixo: c.estoque_baixo };
        Object.entries(mapa).forEach(([id, valor]) => {
            const el = $(id);
            if (el) el.textContent = Number(valor).toLocaleString("pt-BR");
        });
    }

    function atualizarGrafico(v) {
        const g = window.salesChartInst;
        if (!g) return;
        g.data.labels = v.labels;
        g.data.datasets[0].data = v.valores;
        g.update();
    }

    function atualizarProdutos(lista) {
        const tbody = $("tabelaProdutosRecentes");
        if (!tbody) return;
        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhum produto cadastrado.</td></tr>';
            return;
        }
        tbody.innerHTML = lista.map((p) => {
            const [classe, texto] = statusEstoque(p.estoque);
            return `<tr>
                <td>#${esc(p.id)}</td>
                <td>${esc(p.produto)}</td>
                <td>${esc(p.marca || "-")}</td>
                <td>${esc(p.categoria || "-")}</td>
                <td>${esc(p.estoque)}</td>
                <td><span class="status-badge ${classe}">${texto}</span></td>
            </tr>`;
        }).join("");
    }

    const ICONES_ATIVIDADE = {
        produto: ["blue", "fa-cube"],
        pedido: ["green", "fa-shopping-cart"],
        estoque: ["orange", "fa-exclamation-triangle"],
        cliente: ["purple", "fa-user-plus"]
    };

    function atualizarAtividades(lista) {
        const ul = $("listaAtividades");
        if (!ul) return;
        if (!lista.length) {
            ul.innerHTML = '<li><div class="activity-details"><p>Nenhuma atividade recente.</p></div></li>';
            return;
        }
        ul.innerHTML = lista.map((a) => {
            const [cor, icone] = ICONES_ATIVIDADE[a.tipo] || ICONES_ATIVIDADE.produto;
            return `<li>
                <div class="activity-icon ${cor}"><i class="fas ${icone}"></i></div>
                <div class="activity-details"><p>${esc(a.texto)}</p></div>
                <span class="activity-time">${esc(formatarQuando(a.data))}</span>
            </li>`;
        }).join("");
    }

    // ---------- Notificações (sininho) ----------
    const TIPOS_NOTIF = {
        estoque_baixo: { icone: "fa-exclamation-triangle", classe: "alerta", rotulo: "Estoque" },
        esgotado: { icone: "fa-ban", classe: "critico", rotulo: "Estoque" },
        novo_pedido: { icone: "fa-shopping-cart", classe: "", rotulo: "Pedido" },
        novo_cliente: { icone: "fa-user-plus", classe: "", rotulo: "Cliente" }
    };

    let notificacoes = [];

    function lerLidas() {
        try { return new Set(JSON.parse(localStorage.getItem("notifAdminLidas") || "[]")); }
        catch (e) { return new Set(); }
    }

    function salvarLidas(set) {
        try { localStorage.setItem("notifAdminLidas", JSON.stringify([...set].slice(-200))); } catch (e) { /* sem storage */ }
    }

    function desenharNotificacoes() {
        const lidas = lerLidas();
        const naoLidas = notificacoes.filter((n) => !lidas.has(n.chave)).length;

        const badge = $("badgeNotificacoes");
        if (badge) {
            badge.textContent = naoLidas > 9 ? "9+" : naoLidas;
            badge.hidden = naoLidas === 0;
        }

        const ul = $("listaNotificacoes");
        if (!ul) return;
        if (!notificacoes.length) {
            ul.innerHTML = '<li class="notif-vazia">Nenhuma notificação.</li>';
            return;
        }
        ul.innerHTML = notificacoes.map((n) => {
            const t = TIPOS_NOTIF[n.tipo] || TIPOS_NOTIF.novo_pedido;
            const quando = formatarQuando(n.data);
            return `<li class="${lidas.has(n.chave) ? "" : "nao-lida"}">
                <div class="notif-icone ${t.classe}"><i class="fas ${t.icone}"></i></div>
                <div class="notif-texto">
                    <strong>${esc(n.titulo)} · ${t.rotulo}</strong>
                    <span>${esc(n.descricao)}</span>
                    ${quando ? `<small>${esc(quando)}</small>` : ""}
                </div>
            </li>`;
        }).join("");
    }

    function marcarTodasLidas() {
        const lidas = lerLidas();
        notificacoes.forEach((n) => lidas.add(n.chave));
        salvarLidas(lidas);
        desenharNotificacoes();
    }

    // ---------- Busca de dados ----------
    let carregando = false;

    async function carregarPainel() {
        if (carregando) return;
        carregando = true;
        try {
            const resp = await fetch("dashboard_dados.php", { cache: "no-store", credentials: "same-origin" });
            if (resp.status === 401) {
                window.location.replace("../Cliente/Pagina_de_Login_Cliente.html");
                return;
            }
            const dados = await resp.json();
            if (!dados.sucesso) throw new Error(dados.mensagem || "Falha ao carregar");

            limiteBaixo = dados.limite_baixo;
            atualizarCartoes(dados.cartoes);
            atualizarGrafico(dados.vendas);
            atualizarProdutos(dados.produtos_recentes);
            atualizarAtividades(dados.atividades);
            notificacoes = dados.notificacoes;
            desenharNotificacoes();
        } catch (erro) {
            console.warn("Painel: não foi possível atualizar agora.", erro);
        } finally {
            carregando = false;
        }
    }

    carregarPainel();
    setInterval(() => { if (!document.hidden) carregarPainel(); }, INTERVALO_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarPainel(); });

    // ---------- Menus suspensos ----------
    const menus = [
        { botao: $("btnSino"), menu: $("menuNotificacoes") },
        { botao: $("btnUsuario"), menu: $("menuUsuario") }
    ];

    function fecharMenus(exceto) {
        menus.forEach(({ botao, menu }) => {
            if (menu && menu !== exceto) {
                menu.hidden = true;
                botao.setAttribute("aria-expanded", "false");
            }
        });
    }

    menus.forEach(({ botao, menu }) => {
        if (!botao || !menu) return;
        botao.addEventListener("click", (e) => {
            e.stopPropagation();
            fecharMenus(menu);
            menu.hidden = !menu.hidden;
            botao.setAttribute("aria-expanded", String(!menu.hidden));
        });
        menu.addEventListener("click", (e) => e.stopPropagation());
    });

    document.addEventListener("click", () => fecharMenus(null));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { fecharMenus(null); fecharModal(); }
    });

    const btnLidas = $("btnMarcarLidas");
    if (btnLidas) btnLidas.addEventListener("click", marcarTodasLidas);

    const sairMenu = $("btnSairMenu");
    if (sairMenu) {
        sairMenu.addEventListener("click", (e) => {
            if (!confirm("Tem certeza que deseja sair da Área do Administrador?")) e.preventDefault();
        });
    }

    // ---------- Perfil do administrador ----------
    const modal = $("modalPerfil");
    const TITULOS = { dados: "Meus dados", editar: "Alterar dados pessoais", senha: "Alterar senha" };

    function mostrarMensagem(el, texto, ok) {
        if (!el) return;
        el.textContent = texto;
        el.className = "form-msg " + (ok ? "ok" : "erro");
    }

    async function carregarPerfil() {
        const resp = await fetch("perfil_admin.php", { cache: "no-store", credentials: "same-origin" });
        const json = await resp.json();
        if (!json.sucesso) throw new Error(json.mensagem);
        $("pfNome").textContent = json.admin.nome || "-";
        $("pfEmail").textContent = json.admin.email || "-";
        $("pfCargo").textContent = json.admin.cargo || "-";
        $("editNome").value = json.admin.nome || "";
        $("editEmail").value = json.admin.email || "";
    }

    async function abrirModal(vista) {
        fecharMenus(null);
        $("modalPerfilTitulo").textContent = TITULOS[vista];
        modal.querySelectorAll("[data-vista]").forEach((el) => { el.hidden = el.dataset.vista !== vista; });
        mostrarMensagem($("msgDados"), "", true);
        mostrarMensagem($("msgSenha"), "", true);
        $("formSenha").reset();
        modal.hidden = false;
        try { await carregarPerfil(); }
        catch (e) { mostrarMensagem($("msgDados"), e.message || "Não foi possível carregar seus dados.", false); }
    }

    function fecharModal() { if (modal) modal.hidden = true; }

    document.querySelectorAll("[data-perfil]").forEach((b) => b.addEventListener("click", () => abrirModal(b.dataset.perfil)));
    const btnFechar = $("modalPerfilFechar");
    if (btnFechar) btnFechar.addEventListener("click", fecharModal);
    if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) fecharModal(); });

    async function enviarFormulario(form, acao, msgEl, aoSucesso) {
        const botao = form.querySelector("button[type=submit]");
        const corpo = new URLSearchParams(new FormData(form));
        corpo.set("acao", acao);
        botao.disabled = true;
        try {
            const resp = await fetch("perfil_admin.php", { method: "POST", body: corpo, credentials: "same-origin" });
            const json = await resp.json();
            mostrarMensagem(msgEl, json.mensagem, json.sucesso);
            if (json.sucesso && aoSucesso) aoSucesso(json);
        } catch (e) {
            mostrarMensagem(msgEl, "Erro de conexão com o servidor.", false);
        } finally {
            botao.disabled = false;
        }
    }

    const formDados = $("formDados");
    if (formDados) {
        formDados.addEventListener("submit", (e) => {
            e.preventDefault();
            enviarFormulario(formDados, "dados", $("msgDados"), (json) => {
                try { localStorage.setItem("nomeAdmin", json.nome); } catch (err) { /* sem storage */ }
                $("nomeAdminHeader").textContent = json.nome;
                const boasVindas = $("nomeAdminBoasVindas");
                if (boasVindas) boasVindas.textContent = json.nome;
                $("pfNome").textContent = json.nome;
                $("pfEmail").textContent = json.email;
            });
        });
    }

    const formSenha = $("formSenha");
    if (formSenha) {
        formSenha.addEventListener("submit", (e) => {
            e.preventDefault();
            enviarFormulario(formSenha, "senha", $("msgSenha"), () => formSenha.reset());
        });
    }
});
