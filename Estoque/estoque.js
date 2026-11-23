// estoque.js - Categorias, Marcas, Cadastro e Lista de Produtos (tudo vem do banco via estoque.php).
// O menu lateral fica em ../Administrador/admin_menu.js
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const estado = { marcas: [], categorias: [], produtos: [], limite: 10, pagina: 1, carregadoEm: 0 };
    const POR_PAGINA = 15;

    // ---------- utilitários ----------
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    function aviso(texto, tipo) {
        const el = document.createElement("div");
        el.className = "est-toast " + (tipo || "ok");
        el.textContent = texto;
        $("toasts").appendChild(el);
        setTimeout(() => el.remove(), 4500);
    }

    async function api(acao, dados, metodo) {
        const post = (metodo || (dados ? "POST" : "GET")) === "POST";
        let resp;
        if (post) {
            const corpo = new URLSearchParams(Object.assign({ acao }, dados || {}));
            resp = await fetch("estoque.php", { method: "POST", body: corpo, credentials: "same-origin", cache: "no-store" });
        } else {
            resp = await fetch("estoque.php?acao=" + encodeURIComponent(acao), { credentials: "same-origin", cache: "no-store" });
        }
        if (resp.status === 401) {
            window.location.replace("../Administrador/Pagina_de_Login_Administrador.html");
            throw new Error("Sessão expirada.");
        }
        let json;
        try { json = await resp.json(); } catch (e) { throw new Error("Resposta inválida do servidor."); }
        if (!json.sucesso) throw new Error(json.mensagem || "Erro inesperado.");
        return json;
    }

    async function ocupado(botao, fn) {
        if (botao) botao.disabled = true;
        try { return await fn(); } finally { if (botao) botao.disabled = false; }
    }

    // ---------- emojis (mesma lógica da loja) ----------
    const EMOJIS = [
        [/morango/, "🍓"], [/\buva\b/, "🍇"], [/banana/, "🍌"], [/\bmaca\b/, "🍎"], [/laranja|tangerina/, "🍊"], [/limao/, "🍋"], [/mamao|manga/, "🥭"],
        [/melancia/, "🍉"], [/abacaxi/, "🍍"], [/tomate|extrato|molho de tomate|sugo|ketchup/, "🍅"], [/cebola/, "🧅"], [/\balho\b/, "🧄"],
        [/chips|ruffles|cheetos|salgadinho/, "🥨"], [/batata palito|batata congelada/, "🍟"], [/batata/, "🥔"], [/cenoura/, "🥕"],
        [/alface/, "🥬"], [/brocolis/, "🥦"], [/pepino|abobrinha/, "🥒"], [/milho verde|ervilha/, "🌽"], [/pipoca/, "🍿"],
        [/frango|coxa|nuggets/, "🍗"], [/linguica/, "🌭"], [/hamburguer/, "🍔"], [/pizza/, "🍕"], [/lasanha|massa para lasanha/, "🍝"],
        [/acem|contrafile|alcatra|patinho|costela|bisteca|carne/, "🥩"], [/camarao/, "🦐"], [/salmao|tilapia|merluza|atum|sardinha|peixe/, "🐟"],
        [/\bovos\b/, "🥚"], [/leite condensado|doce de leite|goiabada/, "🍮"], [/leite|iogurte/, "🥛"], [/queijo|requeijao/, "🧀"],
        [/presunto/, "🥓"], [/manteiga|margarina/, "🧈"], [/creme de leite/, "🥛"], [/croissant/, "🥐"], [/pao de queijo/, "🧀"],
        [/\bpao\b|torrada|rosca/, "🍞"], [/bolo/, "🍰"], [/sonho/, "🍩"], [/sorvete/, "🍨"], [/chocolate|bombom|achocolatado|wafer|pacoca/, "🍫"],
        [/biscoito|cream cracker|maisena/, "🍪"], [/gelatina|pudim/, "🍮"], [/mel puro|geleia/, "🍯"], [/\bcafe\b/, "☕"], [/\bcha\b/, "🍵"],
        [/arroz/, "🍚"], [/feijao|lentilha|grao-de-bico|grao de bico/, "🫘"], [/macarrao|espaguete|penne|parafuso|pesto/, "🍝"],
        [/aveia|granola|cereal|quinoa/, "🥣"], [/amendoim|pasta de amendoim/, "🥜"], [/azeite|oleo/, "🫒"], [/sal |sal$/, "🧂"],
        [/acucar|fermento|farinha|fuba|amido/, "🌾"], [/maionese|vinagre|shoyu|tempero|oregano|pimenta|colorau|paprica|caldo/, "🧂"],
        [/refrigerante|\bcola\b|guarana|isotonico|energetico/, "🥤"], [/agua de coco/, "🥥"], [/agua/, "💧"], [/suco/, "🧃"], [/cerveja/, "🍺"], [/vinho/, "🍷"],
        [/detergente|sabao|amaciante|sanitaria|desinfetante|limpa|esponja/, "🧼"], [/saco de lixo/, "🗑️"], [/papel higienico|papel toalha/, "🧻"],
        [/sabonete|shampoo|condicionador|desodorante/, "🧴"], [/creme dental|escova/, "🪥"], [/absorvente/, "🩹"],
    ];
    const EMOJI_CAT = [
        [/hortifruti/, "🥬"], [/acougue/, "🥩"], [/peixaria/, "🐟"], [/frios|laticinio/, "🧀"], [/padaria|confeitaria/, "🥖"], [/mercearia/, "🥫"],
        [/graos|cereais/, "🌾"], [/massas|molhos/, "🍝"], [/oleos|temperos/, "🫒"], [/biscoito|snack/, "🍪"], [/doce|sobremesa/, "🍫"],
        [/cafe|manha/, "☕"], [/congelado/, "🧊"], [/bebida/, "🥤"], [/limpeza/, "🧽"], [/higiene|beleza/, "🧴"],
    ];
    function emojiDe(nome, categoria) {
        const n = semAcento(nome) + " ";
        const m = EMOJIS.find(([r]) => r.test(n));
        if (m) return m[1];
        const c = semAcento(categoria);
        const mc = EMOJI_CAT.find(([r]) => r.test(c));
        return mc ? mc[1] : "🛒";
    }

    // ---------- abas ----------
    const NOMES = ["categoria", "marca", "produto", "lista"];
    function abrirAba(nome) {
        if (!NOMES.includes(nome)) nome = "produto";
        document.querySelectorAll(".aba").forEach((a) => a.classList.toggle("ativa", a.dataset.painel === nome));
        document.querySelectorAll(".painel").forEach((p) => p.classList.toggle("ativo", p.id === "painel-" + nome));
        if (nome === "lista" && Date.now() - estado.carregadoEm > 5000) recarregarProdutos();
    }
    const abaDoHash = () => (location.hash || "").replace("#painel-", "").replace("#", "");
    function irPara(nome) {
        history.replaceState(null, "", "#painel-" + nome);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    document.querySelectorAll(".aba").forEach((a) => a.addEventListener("click", () => irPara(a.dataset.painel)));
    window.addEventListener("hashchange", () => abrirAba(abaDoHash()));

    // ---------- campos do formulário de produto (usados no cadastro e na edição) ----------
    function htmlCampos() {
        return `
        <label class="est-campo largo">Nome do produto *
            <input type="text" name="nome_produto" maxlength="150" required placeholder="Ex.: Arroz Branco Tipo 1 5kg" autocomplete="off">
        </label>
        <label class="est-campo">Marca *
            <span class="est-com-botao"><select name="marca_id" required></select>
            <button type="button" class="est-mais" data-nova="marca" title="Cadastrar nova marca" aria-label="Cadastrar nova marca">+</button></span>
        </label>
        <label class="est-campo">Categoria *
            <span class="est-com-botao"><select name="categoria_id" required></select>
            <button type="button" class="est-mais" data-nova="categoria" title="Cadastrar nova categoria" aria-label="Cadastrar nova categoria">+</button></span>
        </label>
        <label class="est-campo">Preço (R$) *
            <span class="est-preco"><span>R$</span><input type="text" name="preco" inputmode="decimal" required placeholder="0,00" autocomplete="off"></span>
        </label>
        <label class="est-campo">Quantidade em estoque *
            <span class="est-stepper">
                <button type="button" data-passo="-1" aria-label="Menos 1">−</button>
                <input type="number" name="quantidade" min="0" max="1000000" value="0" required>
                <button type="button" data-passo="1" aria-label="Mais 1">+</button>
            </span>
        </label>
        <label class="est-campo largo">Descrição
            <textarea name="descricao" maxlength="500" placeholder="Opcional: peso, sabor, detalhes que ajudam o cliente"></textarea>
        </label>
        <label class="est-campo largo est-switch"><input type="checkbox" name="ativo" checked> Ativo na loja (visível para o cliente)</label>`;
    }
    $("campos-novo").innerHTML = htmlCampos();
    $("campos-editar").innerHTML = htmlCampos();
    const formNovo = $("form-produto");
    const formEditar = $("formEditar");

    function preencherSelects() {
        const opM = (sel) => '<option value="">Selecione...</option>' + estado.marcas.map((m) => `<option value="${m.id_marca}">${esc(m.nome)}</option>`).join("");
        const opC = '<option value="">Selecione...</option>' + estado.categorias.map((c) => `<option value="${c.id_categoria}">${esc(c.nome)}</option>`).join("");
        [formNovo, formEditar].forEach((f) => {
            const m = f.elements.marca_id.value, c = f.elements.categoria_id.value;
            f.elements.marca_id.innerHTML = opM();
            f.elements.categoria_id.innerHTML = opC;
            f.elements.marca_id.value = m;
            f.elements.categoria_id.value = c;
        });
        const prim = (txt) => `<option value="">${txt}</option>`;
        const fc = $("fCategoria"), fm = $("fMarca");
        const vc = fc.value, vm = fm.value;
        fc.innerHTML = prim("Todas as categorias") + estado.categorias.map((c) => `<option value="${c.id_categoria}">${esc(c.nome)}</option>`).join("");
        fm.innerHTML = prim("Todas as marcas") + estado.marcas.map((m) => `<option value="${m.id_marca}">${esc(m.nome)}</option>`).join("");
        fc.value = vc; fm.value = vm;
    }

    // passos +/-
    document.addEventListener("click", (e) => {
        const b = e.target.closest(".est-stepper [data-passo]");
        if (!b) return;
        const input = b.parentElement.querySelector("input");
        const min = Number(input.min || 0), max = Number(input.max || 1000000);
        input.value = Math.min(max, Math.max(min, (parseInt(input.value, 10) || 0) + Number(b.dataset.passo)));
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // ---------- carregamento ----------
    async function carregarDados() {
        const j = await api("dados");
        estado.marcas = j.marcas;
        estado.categorias = j.categorias;
        estado.limite = j.limite_estoque;
        preencherSelects();
        desenharLista("marca");
        desenharLista("categoria");
        $("qtd-marca").textContent = estado.marcas.length;
        $("qtd-categoria").textContent = estado.categorias.length;
    }
    async function recarregarProdutos() {
        try {
            const j = await api("produtos");
            estado.produtos = j.produtos;
            estado.carregadoEm = Date.now();
            $("qtd-lista").textContent = estado.produtos.length;
            desenharResumo();
            desenharTabela();
            desenharRecentes();
        } catch (e) {
            $("corpoProdutos").innerHTML = `<tr><td colspan="7" class="est-vazio">${esc(e.message)}</td></tr>`;
        }
    }
    const recarregarTudo = () => Promise.all([carregarDados(), recarregarProdutos()]);

    // ---------- categorias e marcas ----------
    const CFG = {
        categoria: { artigo: "a", nome: "categoria", lista: () => estado.categorias, id: "id_categoria", salvar: "salvar_categoria", editar: "editar_categoria", excluir: "excluir_categoria", filtro: "fCategoria" },
        marca: { artigo: "a", nome: "marca", lista: () => estado.marcas, id: "id_marca", salvar: "salvar_marca", editar: "editar_marca", excluir: "excluir_marca", filtro: "fMarca" },
    };

    function desenharLista(tipo) {
        const cfg = CFG[tipo];
        const painel = $("painel-" + tipo);
        const termo = semAcento(painel.querySelector("[data-busca]").value.trim());
        const todos = cfg.lista();
        const lista = todos.filter((x) => !termo || semAcento(x.nome).includes(termo));
        painel.querySelector("[data-contagem]").textContent = `(${todos.length})`;
        const corpo = painel.querySelector("[data-corpo]");
        if (!lista.length) {
            corpo.innerHTML = `<tr><td colspan="3" class="est-vazio">${todos.length ? "Nada encontrado para essa busca." : "Nenhuma " + cfg.nome + " cadastrada ainda."}</td></tr>`;
            return;
        }
        corpo.innerHTML = lista.map((x) => {
            const n = Number(x.total_produtos);
            return `<tr>
                <td><strong>${esc(x.nome)}</strong></td>
                <td>${n ? `<button type="button" class="est-link" data-ver="${x[cfg.id]}">${n} produto${n > 1 ? "s" : ""}</button>` : '<span style="color:var(--text-muted)">nenhum</span>'}</td>
                <td><div class="acoes">
                    <button type="button" class="btn-mini" data-renomear="${x[cfg.id]}"><i class="fas fa-pen"></i> Renomear</button>
                    <button type="button" class="btn-mini perigo" data-excluir="${x[cfg.id]}"><i class="fas fa-trash"></i> Excluir</button>
                </div></td></tr>`;
        }).join("");
    }

    ["categoria", "marca"].forEach((tipo) => {
        const cfg = CFG[tipo];
        const painel = $("painel-" + tipo);
        const form = painel.querySelector("form");
        painel.querySelector("[data-busca]").addEventListener("input", () => desenharLista(tipo));

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nome = form.elements.nome.value.trim();
            if (!nome) { aviso("Digite o nome da " + cfg.nome + ".", "erro"); form.elements.nome.focus(); return; }
            await ocupado(form.querySelector("button[type=submit]"), async () => {
                try {
                    const j = await api(cfg.salvar, { nome });
                    aviso(j.mensagem);
                    form.reset();
                    form.elements.nome.focus();
                    await carregarDados();
                } catch (err) { aviso(err.message, "erro"); }
            });
        });

        painel.querySelector("[data-corpo]").addEventListener("click", async (e) => {
            const ver = e.target.closest("[data-ver]");
            const ren = e.target.closest("[data-renomear]");
            const exc = e.target.closest("[data-excluir]");
            if (ver) {
                limparFiltros();
                $(cfg.filtro).value = ver.dataset.ver;
                irPara("lista");
                desenharTabela();
            } else if (ren) {
                const item = cfg.lista().find((x) => String(x[cfg.id]) === ren.dataset.renomear);
                abrirModalNome(tipo, item);
            } else if (exc) {
                const item = cfg.lista().find((x) => String(x[cfg.id]) === exc.dataset.excluir);
                if (Number(item.total_produtos) > 0) {
                    aviso(`Não dá para excluir "${item.nome}": ${item.total_produtos} produto(s) usam ${cfg.artigo} ${cfg.nome}. Mude ou exclua esses produtos primeiro.`, "erro");
                    return;
                }
                if (!confirm(`Excluir ${cfg.artigo} ${cfg.nome} "${item.nome}"?`)) return;
                try {
                    const j = await api(cfg.excluir, { [cfg.id]: item[cfg.id] });
                    aviso(j.mensagem);
                    await carregarDados();
                } catch (err) { aviso(err.message, "erro"); }
            }
        });
    });

    // janela de nome (renomear)
    const modalNome = $("modalNome");
    let contextoNome = null;
    function abrirModalNome(tipo, item) {
        contextoNome = { tipo, item };
        $("modalNomeTitulo").textContent = "Renomear " + CFG[tipo].nome;
        $("modalNomeRotulo").textContent = "Novo nome";
        $("modalNomeMsg").textContent = "";
        $("formNome").elements.nome.value = item.nome;
        abrirModal(modalNome);
        $("formNome").elements.nome.select();
    }
    $("formNome").addEventListener("submit", async (e) => {
        e.preventDefault();
        const { tipo, item } = contextoNome;
        const cfg = CFG[tipo];
        const nome = $("formNome").elements.nome.value.trim();
        if (!nome) { $("modalNomeMsg").textContent = "Digite o nome."; return; }
        await ocupado($("modalNomeBotao"), async () => {
            try {
                const j = await api(cfg.editar, { [cfg.id]: item[cfg.id], nome });
                aviso(j.mensagem);
                fecharModal(modalNome);
                await recarregarTudo();
            } catch (err) { $("modalNomeMsg").textContent = err.message; }
        });
    });

    // "+" ao lado dos selects: cadastra marca/categoria sem sair do produto
    document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-nova]");
        if (!b) return;
        const tipo = b.dataset.nova;
        const nome = (prompt("Nome da nova " + CFG[tipo].nome + ":") || "").trim();
        if (!nome) return;
        const form = b.closest("form");
        (async () => {
            try {
                const j = await api(CFG[tipo].salvar, { nome });
                await carregarDados();
                form.elements[tipo + "_id"].value = String(j.id);
                form.elements[tipo + "_id"].dispatchEvent(new Event("change", { bubbles: true }));
                aviso(j.mensagem);
            } catch (err) { aviso(err.message, "erro"); }
        })();
    });

    // ---------- janelas ----------
    function abrirModal(m) { m.hidden = false; const i = m.querySelector("input:not([type=hidden]),select,textarea"); if (i) i.focus(); }
    function fecharModal(m) { m.hidden = true; }
    document.querySelectorAll(".modal-overlay").forEach((m) => {
        m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-fechar]")) fecharModal(m); });
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") document.querySelectorAll(".modal-overlay").forEach((m) => { m.hidden = true; });
    });

    // ---------- cadastro de produto ----------
    function lerForm(form) {
        const f = form.elements;
        return {
            nome_produto: f.nome_produto.value.trim(),
            descricao: f.descricao.value.trim(),
            marca_id: f.marca_id.value,
            categoria_id: f.categoria_id.value,
            preco: f.preco.value.trim(),
            quantidade: f.quantidade.value,
            ativo: f.ativo.checked ? "1" : "0",
        };
    }
    function validar(d, form) {
        form.querySelectorAll(".invalido").forEach((x) => x.classList.remove("invalido"));
        const preco = Number(String(d.preco).replace(",", "."));
        const qtd = Number(d.quantidade);
        let campo = null, msg = "";
        if (!d.nome_produto) { campo = "nome_produto"; msg = "Informe o nome do produto."; }
        else if (!d.marca_id) { campo = "marca_id"; msg = "Escolha a marca (ou cadastre uma com o botão +)."; }
        else if (!d.categoria_id) { campo = "categoria_id"; msg = "Escolha a categoria (ou cadastre uma com o botão +)."; }
        else if (!d.preco || !isFinite(preco) || preco <= 0) { campo = "preco"; msg = "Informe um preço maior que zero, ex.: 12,90."; }
        else if (!Number.isInteger(qtd) || qtd < 0) { campo = "quantidade"; msg = "A quantidade precisa ser um número inteiro (0 ou mais)."; }
        if (campo) { form.elements[campo].classList.add("invalido"); form.elements[campo].focus(); }
        return msg;
    }

    function desenharPrevia() {
        const d = lerForm(formNovo);
        const cat = estado.categorias.find((c) => String(c.id_categoria) === d.categoria_id);
        const mar = estado.marcas.find((m) => String(m.id_marca) === d.marca_id);
        const preco = Number(String(d.preco).replace(",", "."));
        const qtd = parseInt(d.quantidade, 10) || 0;
        let av = '<div class="aviso ok">Vai aparecer na loja.</div>';
        if (d.ativo !== "1") av = '<div class="aviso">Inativo: o cliente não verá este produto.</div>';
        else if (qtd <= 0) av = '<div class="aviso">Sem estoque: não aparece na loja até você repor.</div>';
        $("previa").innerHTML = `
            <div class="foto">${emojiDe(d.nome_produto, cat ? cat.nome : "")}</div>
            <div class="cat">${esc(cat ? cat.nome : "Categoria")}</div>
            <div class="nome">${esc(d.nome_produto || "Nome do produto")}</div>
            <div class="marca">${esc(mar ? mar.nome : "Marca")}</div>
            ${d.descricao ? `<div class="desc">${esc(d.descricao)}</div>` : ""}
            <div class="preco">${isFinite(preco) && preco > 0 ? reais(preco) : "R$ 0,00"}</div>${av}`;
    }
    formNovo.addEventListener("input", desenharPrevia);
    formNovo.addEventListener("change", desenharPrevia);

    function limparNovo() {
        const manter = $("manterSelecao").checked;
        const m = formNovo.elements.marca_id.value, c = formNovo.elements.categoria_id.value;
        formNovo.reset();
        formNovo.querySelectorAll(".invalido").forEach((x) => x.classList.remove("invalido"));
        if (manter) { formNovo.elements.marca_id.value = m; formNovo.elements.categoria_id.value = c; }
        formNovo.elements.nome_produto.focus();
        desenharPrevia();
    }
    $("btnLimpar").addEventListener("click", () => { $("manterSelecao").checked = false; limparNovo(); });

    formNovo.addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = lerForm(formNovo);
        const msg = validar(d, formNovo);
        if (msg) { aviso(msg, "erro"); return; }
        await ocupado(formNovo.querySelector("button[type=submit]"), async () => {
            try {
                const j = await api("salvar_produto", d);
                aviso(j.mensagem);
                limparNovo();
                await recarregarTudo();
            } catch (err) { aviso(err.message, "erro"); }
        });
    });

    function desenharRecentes() {
        const ul = $("recentes");
        const r = estado.produtos.slice(0, 5);
        ul.innerHTML = r.length ? r.map((p) => `<li><span class="foto">${emojiDe(p.nome_produto, p.categoria)}</span>
            <span><strong>${esc(p.nome_produto)}</strong><small>${esc(p.marca)} · ${reais(p.preco)} · ${p.quantidade} un.</small></span></li>`).join("")
            : '<li class="est-vazio">Nenhum produto cadastrado ainda.</li>';
    }

    // ---------- lista de produtos ----------
    const baixo = (p) => p.ativo === 1 && p.quantidade > 0 && p.quantidade <= estado.limite;

    function desenharResumo() {
        const ps = estado.produtos;
        const chip = (valor, rotulo, sit, cls) => `<button type="button" class="est-chip ${cls || ""} ${$("fSituacao").value === sit ? "ativo" : ""}" data-sit="${sit}"><strong>${valor}</strong><span>${rotulo}</span></button>`;
        $("resumo").innerHTML =
            chip(ps.length, "Produtos cadastrados", "") +
            chip(ps.filter((p) => p.ativo === 1).length, "Ativos na loja", "ativos") +
            chip(ps.filter(baixo).length, `Estoque baixo (até ${estado.limite})`, "baixo", "alerta") +
            chip(ps.filter((p) => p.quantidade === 0).length, "Sem estoque", "zerado", "critico");
    }
    $("resumo").addEventListener("click", (e) => {
        const c = e.target.closest("[data-sit]");
        if (!c) return;
        $("fSituacao").value = c.dataset.sit;
        estado.pagina = 1;
        desenharResumo();
        desenharTabela();
    });

    function filtrados() {
        const termo = semAcento($("fBusca").value.trim());
        const cat = $("fCategoria").value, mar = $("fMarca").value, sit = $("fSituacao").value, ord = $("fOrdem").value;
        let l = estado.produtos.filter((p) => {
            if (termo && !semAcento(p.nome_produto + " " + p.marca + " " + (p.descricao || "")).includes(termo)) return false;
            if (cat && String(p.categoria_id) !== cat) return false;
            if (mar && String(p.marca_id) !== mar) return false;
            if (sit === "ativos" && p.ativo !== 1) return false;
            if (sit === "inativos" && p.ativo === 1) return false;
            if (sit === "baixo" && !baixo(p)) return false;
            if (sit === "zerado" && p.quantidade !== 0) return false;
            return true;
        });
        const cmp = {
            recentes: (a, b) => b.id_estoque - a.id_estoque,
            nome: (a, b) => a.nome_produto.localeCompare(b.nome_produto, "pt-BR"),
            estoque_asc: (a, b) => a.quantidade - b.quantidade,
            estoque_desc: (a, b) => b.quantidade - a.quantidade,
            preco_asc: (a, b) => a.preco - b.preco,
            preco_desc: (a, b) => b.preco - a.preco,
        }[ord];
        return l.sort(cmp);
    }

    function desenharTabela() {
        const l = filtrados();
        const paginas = Math.max(1, Math.ceil(l.length / POR_PAGINA));
        if (estado.pagina > paginas) estado.pagina = paginas;
        const ini = (estado.pagina - 1) * POR_PAGINA;
        const fatia = l.slice(ini, ini + POR_PAGINA);
        const corpo = $("corpoProdutos");
        if (!fatia.length) {
            corpo.innerHTML = `<tr><td colspan="7" class="est-vazio">${estado.produtos.length ? "Nenhum produto com esses filtros." : "Nenhum produto cadastrado ainda."}</td></tr>`;
        } else {
            corpo.innerHTML = fatia.map((p) => {
                const clsQ = p.quantidade === 0 ? "est-qtd-zero" : (baixo(p) ? "est-qtd-baixo" : "");
                return `<tr class="${p.ativo === 1 ? "" : "est-linha-inativa"}">
                    <td><strong>${emojiDe(p.nome_produto, p.categoria)} ${esc(p.nome_produto)}</strong>${p.descricao ? `<small>${esc(p.descricao.length > 60 ? p.descricao.slice(0, 60) + "…" : p.descricao)}</small>` : ""}</td>
                    <td>${esc(p.marca)}</td>
                    <td>${esc(p.categoria)}</td>
                    <td class="num ${clsQ}">${p.quantidade}${p.quantidade === 0 ? " (esgotado)" : ""}</td>
                    <td class="num">${reais(p.preco)}</td>
                    <td><button type="button" class="est-toggle ${p.ativo === 1 ? "on" : ""}" data-alt="${p.id_estoque}" role="switch" aria-checked="${p.ativo === 1}" aria-label="${p.ativo === 1 ? "Desativar" : "Ativar"} ${esc(p.nome_produto)}" title="${p.ativo === 1 ? "Ativo na loja" : "Inativo"}"></button></td>
                    <td><div class="acoes">
                        <button type="button" class="btn-mini" data-repor="${p.id_estoque}"><i class="fas fa-plus"></i> Repor</button>
                        <button type="button" class="btn-mini" data-editar="${p.id_estoque}"><i class="fas fa-pen"></i> Editar</button>
                        <button type="button" class="btn-mini perigo" data-excluir="${p.id_estoque}"><i class="fas fa-trash"></i> Excluir</button>
                    </div></td></tr>`;
            }).join("");
        }
        $("paginacao").innerHTML = `<span>${l.length} produto(s)${l.length ? ` · página ${estado.pagina} de ${paginas}` : ""}</span>
            <div><button type="button" class="btn-secundario" data-pg="-1" ${estado.pagina <= 1 ? "disabled" : ""}>‹ Anterior</button>
            <button type="button" class="btn-secundario" data-pg="1" ${estado.pagina >= paginas ? "disabled" : ""}>Próxima ›</button></div>`;
    }

    function limparFiltros() {
        $("fBusca").value = ""; $("fCategoria").value = ""; $("fMarca").value = ""; $("fSituacao").value = ""; $("fOrdem").value = "recentes";
        estado.pagina = 1;
        desenharResumo();
    }
    ["fBusca", "fCategoria", "fMarca", "fSituacao", "fOrdem"].forEach((id) => $(id).addEventListener(id === "fBusca" ? "input" : "change", () => {
        estado.pagina = 1; desenharResumo(); desenharTabela();
    }));
    $("fLimpar").addEventListener("click", () => { limparFiltros(); desenharTabela(); });
    $("paginacao").addEventListener("click", (e) => {
        const b = e.target.closest("[data-pg]");
        if (!b) return;
        estado.pagina += Number(b.dataset.pg);
        desenharTabela();
    });

    const produtoPorId = (id) => estado.produtos.find((p) => String(p.id_estoque) === String(id));

    $("corpoProdutos").addEventListener("click", async (e) => {
        const alt = e.target.closest("[data-alt]");
        const rep = e.target.closest("[data-repor]");
        const edi = e.target.closest("[data-editar]");
        const exc = e.target.closest("[data-excluir]");
        if (alt) {
            alt.disabled = true;
            try {
                const j = await api("alternar_produto", { id_estoque: alt.dataset.alt });
                aviso(j.mensagem);
                await recarregarProdutos();
            } catch (err) { aviso(err.message, "erro"); alt.disabled = false; }
        } else if (rep) {
            abrirRepor(produtoPorId(rep.dataset.repor));
        } else if (edi) {
            abrirEditar(produtoPorId(edi.dataset.editar));
        } else if (exc) {
            const p = produtoPorId(exc.dataset.excluir);
            if (p.vendidos > 0) {
                aviso(`"${p.nome_produto}" já tem ${p.vendidos} unidade(s) vendida(s) e não pode ser excluído (isso apagaria o histórico). Desative-o para tirar da loja.`, "erro");
                return;
            }
            if (!confirm(`Excluir o produto "${p.nome_produto}"? Não dá para desfazer.`)) return;
            try {
                const j = await api("excluir_produto", { id_estoque: p.id_estoque });
                aviso(j.mensagem);
                await recarregarTudo();
            } catch (err) { aviso(err.message, "erro"); }
        }
    });

    // ---------- editar ----------
    const modalProduto = $("modalProduto");
    function abrirEditar(p) {
        const f = formEditar.elements;
        $("modalProdutoMsg").textContent = "";
        formEditar.querySelectorAll(".invalido").forEach((x) => x.classList.remove("invalido"));
        f.id_estoque.value = p.id_estoque;
        f.nome_produto.value = p.nome_produto;
        f.descricao.value = p.descricao || "";
        f.marca_id.value = String(p.marca_id);
        f.categoria_id.value = String(p.categoria_id);
        f.preco.value = String(p.preco.toFixed(2)).replace(".", ",");
        f.quantidade.value = p.quantidade;
        f.ativo.checked = p.ativo === 1;
        abrirModal(modalProduto);
    }
    formEditar.addEventListener("submit", async (e) => {
        e.preventDefault();
        const d = lerForm(formEditar);
        const msg = validar(d, formEditar);
        if (msg) { $("modalProdutoMsg").textContent = msg; return; }
        d.id_estoque = formEditar.elements.id_estoque.value;
        await ocupado(formEditar.querySelector("button[type=submit]"), async () => {
            try {
                const j = await api("editar_produto", d);
                aviso(j.mensagem);
                fecharModal(modalProduto);
                await recarregarTudo();
            } catch (err) { $("modalProdutoMsg").textContent = err.message; }
        });
    });

    // ---------- repor ----------
    const modalRepor = $("modalRepor");
    const formRepor = $("formRepor");
    let reporAtual = null;
    function atualizarResultadoRepor() {
        const q = parseInt(formRepor.elements.quantidade.value, 10) || 0;
        $("reporResultado").textContent = reporAtual ? `Estoque passa de ${reporAtual.quantidade} para ${reporAtual.quantidade + Math.max(0, q)} unidade(s).` : "";
    }
    function abrirRepor(p) {
        reporAtual = p;
        formRepor.reset();
        formRepor.elements.id_estoque.value = p.id_estoque;
        formRepor.elements.quantidade.value = 10;
        $("reporProduto").textContent = `${p.nome_produto} (${p.marca}) — hoje: ${p.quantidade} un.`;
        $("modalReporMsg").textContent = "";
        atualizarResultadoRepor();
        abrirModal(modalRepor);
        formRepor.elements.quantidade.select();
    }
    formRepor.addEventListener("input", atualizarResultadoRepor);
    formRepor.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = parseInt(formRepor.elements.quantidade.value, 10);
        if (!Number.isInteger(q) || q < 1 || q > 100000) { $("modalReporMsg").textContent = "Informe uma quantidade entre 1 e 100000."; return; }
        await ocupado(formRepor.querySelector("button[type=submit]"), async () => {
            try {
                const j = await api("repor_estoque", { id_estoque: reporAtual.id_estoque, quantidade: q, observacao: formRepor.elements.observacao.value.trim() });
                aviso(j.mensagem);
                fecharModal(modalRepor);
                await recarregarProdutos();
            } catch (err) { $("modalReporMsg").textContent = err.message; }
        });
    });

    // ---------- início ----------
    (async () => {
        desenharPrevia();
        try { await recarregarTudo(); } catch (e) { aviso(e.message, "erro"); }
        desenharPrevia();
        desenharResumo();
        abrirAba(abaDoHash());
    })();
});