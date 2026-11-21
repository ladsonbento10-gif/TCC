/* cliente.js - TODO o JavaScript da loja do cliente (Area_do_Cliente.html não tem script no meio do HTML).
   Dados vêm do banco pelos arquivos PHP desta pasta:
   sessao_cliente.php, catalogo_cliente.php, finalizar_pedido.php, pedidos_cliente.php, conta_cliente.php */
(() => {
    "use strict";

    // ======================= utilidades =======================
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const reais = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const arred = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
    const dataBR = (s) => { if (!s) return "—"; const [d, h] = String(s).split(" "); return d.split("-").reverse().join("/") + (h ? " " + h.slice(0, 5) : ""); };

    const estado = {
        usuario: null,
        cat: { config: {}, categorias: [], produtos: [], formas_pagamento: [] },
        assinatura: "",
        carrinho: [],          // [{id, qtd}]
        cupom: null,           // {codigo, percentual}
        ultimoEmail: null,     // {pedido, status, destino} do pedido recém-criado
        timers: [],
        token: 0,
        ordem: "nome",
    };

    const main = () => $("#conteudo");

    function toast(texto, erro = false) {
        const t = $("#toast");
        t.textContent = texto;
        t.className = "toast on" + (erro ? " erro" : "");
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { t.className = "toast"; }, 3200);
    }

    async function api(url, opcoes = {}) {
        const cfg = { credentials: "same-origin", cache: "no-store", ...opcoes };
        if (cfg.body && typeof cfg.body !== "string") cfg.body = JSON.stringify(cfg.body);
        if (cfg.body) cfg.headers = { "Content-Type": "application/json" };
        const resp = await fetch(url, cfg);
        if (resp.status === 401) { window.location.replace("Pagina_de_Login_Cliente.html"); throw new Error("Sessão expirada."); }
        let json = null;
        try { json = await resp.json(); } catch (e) { /* resposta sem JSON */ }
        if (!resp.ok || !json || json.sucesso === false) {
            const err = new Error((json && json.mensagem) || "Algo deu errado. Tente novamente.");
            err.dados = json;
            throw err;
        }
        return json;
    }

    // ======================= emojis (as fotos dos produtos) =======================
    const EMOJIS = [
        [/morango/, "🍓"], [/\buva\b/, "🍇"], [/banana/, "🍌"], [/\bmaca\b/, "🍎"], [/laranja|tangerina/, "🍊"], [/limao/, "🍋"], [/mamao|manga/, "🥭"],
        [/melancia/, "🍉"], [/abacaxi/, "🍍"], [/tomate|extrato|molho de tomate|sugo|ketchup/, "🍅"], [/cebola/, "🧅"], [/\balho\b/, "🧄"],
        [/chips|ruffles|cheetos|salgadinho/, "🥨"], [/batata palito|batata congelada/, "🍟"], [/batata/, "🥔"], [/cenoura/, "🥕"],
        [/alface/, "🥬"], [/brocolis/, "🥦"], [/pepino|abobrinha/, "🥒"], [/milho verde|ervilha/, "🌽"], [/pipoca/, "🍿"],
        [/frango|coxa|nuggets/, "🍗"], [/linguica/, "🌭"], [/hamburguer/, "🍔"], [/pizza/, "🍕"], [/lasanha|massa para lasanha/, "🍝"],
        [/acem|contrafile|alcatra|patinho|costela|bisteca|carne/, "🥩"], [/camarao/, "🦐"], [/salmao|tilapia|merluza|atum|sardinha|peixe/, "🐟"],
        [/\bovos\b/, "🥚"], [/leite condensado|doce de leite|goiabada/, "🍮"], [/leite|iogurte/, "🥛"], [/queijo|requeijao/, "🧀"],
        [/presunto/, "🥓"], [/manteiga|margarina/, "🧈"], [/creme de leite/, "🥛"], [/croissant/, "🥐"], [/pao de queijo/, "🧀"],
        [/\bpao\b|torrada|rosca/, "🍞"], [/bolo/, "🍰"], [/sonho/, "🍩"], [/sorvete/, "🍨"], [/chocolate|bombom|achocolatado|wafer|paçoca|pacoca/, "🍫"],
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
    function emojiCat(nome) { const n = semAcento(nome); const m = EMOJI_CAT.find(([r]) => r.test(n)); return m ? m[1] : "🛒"; }
    function emojiDe(p) {
        const n = semAcento(p.nome) + " ";
        const m = EMOJIS.find(([r]) => r.test(n));
        return m ? m[1] : emojiCat(p.categoria);
    }

    // ======================= carrinho =======================
    const chaveCarrinho = () => "carrinhoKLP_" + estado.usuario.id;
    const produtoPorId = (id) => estado.cat.produtos.find((p) => p.id === id);
    const qtdNoCarrinho = (id) => { const i = estado.carrinho.find((x) => x.id === id); return i ? i.qtd : 0; };

    function lerCarrinho() {
        try {
            const j = JSON.parse(localStorage.getItem(chaveCarrinho()) || "[]");
            return Array.isArray(j) ? j.filter((i) => i && Number.isInteger(i.id) && Number.isInteger(i.qtd) && i.qtd > 0) : [];
        } catch (e) { return []; }
    }
    function gravarCarrinho() {
        try { localStorage.setItem(chaveCarrinho(), JSON.stringify(estado.carrinho)); } catch (e) { /* sem storage */ }
        atualizarCabecalho();
        if (!$("#gaveta").hidden) renderGaveta();
    }
    // tira o que saiu de linha e limita à quantidade em estoque; devolve true se mudou algo
    function ajustarCarrinho() {
        let mudou = false;
        estado.carrinho = estado.carrinho.filter((i) => {
            const p = produtoPorId(i.id);
            if (!p) { mudou = true; return false; }
            if (i.qtd > p.estoque) { i.qtd = p.estoque; mudou = true; }
            return true;
        });
        return mudou;
    }
    function mudarQtd(id, delta) {
        const p = produtoPorId(id);
        if (!p) return;
        const nova = qtdNoCarrinho(id) + delta;
        if (nova > p.estoque) { toast(`Só temos ${p.estoque} unidade(s) de ${p.nome}.`, true); return; }
        const item = estado.carrinho.find((x) => x.id === id);
        if (nova <= 0) estado.carrinho = estado.carrinho.filter((x) => x.id !== id);
        else if (item) item.qtd = nova;
        else estado.carrinho.push({ id, qtd: nova });
        gravarCarrinho();
        $$(`.prod[data-id="${id}"]`).forEach((el) => { el.outerHTML = cardProduto(p); });
    }
    function itensDetalhados() {
        return estado.carrinho.map((i) => ({ p: produtoPorId(i.id), qtd: i.qtd })).filter((i) => i.p);
    }
    function totais() {
        const cfg = estado.cat.config;
        const itens = itensDetalhados();
        const subtotal = arred(itens.reduce((s, i) => s + i.p.preco * i.qtd, 0));
        const desconto = estado.cupom ? arred(subtotal * estado.cupom.percentual / 100) : 0;
        const gratis = Number(cfg.frete_gratis_acima || 0);
        const frete = !itens.length ? 0 : (gratis <= 0 || subtotal >= gratis ? 0 : arred(cfg.frete_valor));
        return { itens, subtotal, desconto, frete, total: arred(subtotal - desconto + frete), qtd: itens.reduce((s, i) => s + i.qtd, 0) };
    }
    function aplicarCupom(codigo) {
        const cfg = estado.cat.config;
        const c = String(codigo || "").trim().toUpperCase();
        if (!c) return false;
        if (cfg.cupom_ativo && c === String(cfg.cupom_codigo).toUpperCase()) {
            estado.cupom = { codigo: c, percentual: Number(cfg.cupom_percentual) };
            toast(`Cupom ${c} aplicado: ${estado.cupom.percentual}% de desconto!`);
            return true;
        }
        toast("Cupom inválido.", true);
        return false;
    }

    // ======================= cabeçalho / menus =======================
    function atualizarCabecalho() {
        const t = totais();
        $("#qtdCarrinho").textContent = t.qtd;
        $("#totalCab").textContent = reais(t.subtotal);
    }

    function montarMenusEFaixa() {
        const c = estado.cat.config;
        const partes = [];
        if (Number(c.frete_gratis_acima) > 0) partes.push(`🚚 Frete grátis acima de <strong>${reais(c.frete_gratis_acima)}</strong>`);
        else partes.push("🚚 <strong>Frete grátis</strong> em todas as compras");
        partes.push(`Entrega em até <strong>${Number(c.prazo_entrega_dias || 0)} dia(s)</strong>`);
        if (c.cupom_ativo) partes.push(`Cupom <strong>${esc(c.cupom_codigo)}</strong>: ${Number(c.cupom_percentual)}% OFF`);
        $("#faixaTopo").innerHTML = partes.join(" &nbsp;•&nbsp; ");

        const links = estado.cat.categorias.map((k) => `<a href="#categoria/${k.id}" data-cat="${k.id}">${esc(k.nome)}</a>`).join("");
        $("#navCats").innerHTML = links;
        $("#listaDeps").innerHTML = estado.cat.categorias.map((k) =>
            `<a href="#categoria/${k.id}"><span aria-hidden="true">${emojiCat(k.nome)}</span> ${esc(k.nome)} <small style="margin-left:auto;color:#718078">${k.total}</small></a>`).join("")
            || '<p style="padding:10px">Sem departamentos.</p>';
        $("#rodapeLoja").textContent = c.nome_loja || "Mercado KLP.NUNES";
        $("#rodapeContato").textContent = c.telefone_loja ? "Telefone: " + c.telefone_loja : "";
        $("#nomeCliente").textContent = (estado.usuario.nome || "").split(" ")[0];
    }

    function marcarCategoriaAtiva(id) {
        $$("#navCats a").forEach((a) => a.classList.toggle("ativa", String(id) === a.dataset.cat));
    }

    function alternarMenu(botao, caixa) {
        const abrir = caixa.hidden;
        fecharMenus();
        caixa.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
    }
    function fecharMenus() {
        [["#btnConta", "#menuConta"], ["#btnDeps", "#listaDeps"]].forEach(([b, c]) => { $(c).hidden = true; $(b).setAttribute("aria-expanded", "false"); });
    }

    // ======================= produtos =======================
    function cardProduto(p) {
        const q = qtdNoCarrinho(p.id);
        const controle = q
            ? `<div class="qtd" role="group" aria-label="Quantidade de ${esc(p.nome)}">
                   <button type="button" data-acao="menos" data-id="${p.id}" aria-label="Diminuir">−</button><span>${q}</span>
                   <button type="button" data-acao="mais" data-id="${p.id}" aria-label="Aumentar">+</button></div>`
            : `<button type="button" class="btn-add" data-acao="mais" data-id="${p.id}"><i class="fas fa-cart-plus"></i> Adicionar</button>`;
        return `<article class="prod" data-id="${p.id}">
            <div class="prod-img"><span aria-hidden="true">${emojiDe(p)}</span>${p.estoque <= 5 ? `<em class="tag">Últimas ${p.estoque} un.</em>` : ""}</div>
            <small class="prod-marca">${esc(p.marca)}</small>
            <h3 class="prod-nome">${esc(p.nome)}</h3>
            <p class="prod-preco">${reais(p.preco)}</p>${controle}</article>`;
    }

    function ordenar(lista) {
        const l = lista.slice();
        if (estado.ordem === "menor") l.sort((a, b) => a.preco - b.preco);
        else if (estado.ordem === "maior") l.sort((a, b) => b.preco - a.preco);
        else l.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        return l;
    }

    const vazio = (txt) => `<p class="vazio">${txt}</p>`;

    // ======================= telas =======================
    function bannerSlides() {
        const c = estado.cat.config;
        const cats = estado.cat.categorias;
        const achar = (re) => { const k = cats.find((x) => re.test(semAcento(x.nome))); return k ? "#categoria/" + k.id : (cats[0] ? "#categoria/" + cats[0].id : "#inicio"); };
        const s = [{ k: "Fresquinho todo dia", t: "Hortifruti, açougue e padaria", p: "Frutas, legumes e carnes selecionadas para a sua semana.", e: "🥬", cta: "Ver hortifruti", href: achar(/hortifruti/) }];
        s.push(Number(c.frete_gratis_acima) > 0
            ? { k: "Entrega", t: `Frete grátis acima de ${reais(c.frete_gratis_acima)}`, p: `Receba em até ${Number(c.prazo_entrega_dias || 0)} dia(s), com código de rastreio.`, e: "🚚", cta: "Começar a comprar", href: achar(/mercearia/) }
            : { k: "Entrega", t: "Frete grátis em todas as compras", p: "Receba em casa, com código de rastreio.", e: "🚚", cta: "Começar a comprar", href: achar(/mercearia/) });
        s.push(c.cupom_ativo
            ? { k: "Cupom", t: `${c.cupom_codigo}: ${Number(c.cupom_percentual)}% de desconto`, p: "Aplique no carrinho e economize na sua compra.", e: "🎟️", cta: "Abrir carrinho", acao: "abrir-carrinho" }
            : { k: "Pagamento", t: "Pague do seu jeito", p: "PIX, cartões, boleto, dinheiro na entrega e vale-alimentação.", e: "💳", cta: "Ver bebidas", href: achar(/bebida/) });
        return s;
    }

    function viewInicio() {
        const { categorias, produtos } = estado.cat;
        if (!produtos.length) { main().innerHTML = vazio("Ainda não há produtos disponíveis. Volte em instantes!"); return; }
        const slides = bannerSlides();
        const banner = `<section class="banner" aria-roledescription="carrossel" aria-label="Destaques">
            ${slides.map((s, i) => `<div class="slide${i === 0 ? " ativo" : ""}"><div class="slide-txt"><small>${esc(s.k)}</small><h2>${esc(s.t)}</h2><p>${esc(s.p)}</p>
            ${s.acao ? `<button type="button" class="btn-claro" data-acao="${s.acao}">${esc(s.cta)}</button>` : `<a class="btn-claro" href="${s.href}">${esc(s.cta)}</a>`}</div>
            <div class="slide-emoji" aria-hidden="true">${s.e}</div></div>`).join("")}
            <div class="pontos">${slides.map((_, i) => `<button type="button" data-acao="slide" data-i="${i}" class="${i === 0 ? "ativo" : ""}" aria-label="Destaque ${i + 1}"></button>`).join("")}</div></section>`;
        const atalhos = `<h2 class="titulo-secao">Compre por departamento</h2><div class="atalhos">${categorias.map((k) =>
            `<a class="atalho" href="#categoria/${k.id}"><span aria-hidden="true">${emojiCat(k.nome)}</span>${esc(k.nome)}</a>`).join("")}</div>`;
        const prateleiras = categorias.map((k) => {
            const lista = produtos.filter((p) => p.categoria_id === k.id).slice(0, 12);
            return `<section class="prateleira"><div class="prat-topo"><h2 class="titulo-secao">${emojiCat(k.nome)} ${esc(k.nome)}</h2>
                <a href="#categoria/${k.id}">Ver todos (${k.total})</a></div><div class="trilho">${lista.map(cardProduto).join("")}</div></section>`;
        }).join("");
        const c = estado.cat.config;
        const beneficios = `<div class="beneficios">
            <div class="beneficio"><i class="fas fa-truck"></i><div><strong>Entrega com rastreio</strong>Acompanhe em Meus pedidos</div></div>
            <div class="beneficio"><i class="fas fa-credit-card"></i><div><strong>Todas as formas de pagamento</strong>PIX, cartões, boleto e mais</div></div>
            <div class="beneficio"><i class="fas fa-envelope-open-text"></i><div><strong>Comprovante por e-mail</strong>Enviado logo após a compra</div></div>
            <div class="beneficio"><i class="fas fa-leaf"></i><div><strong>Produtos frescos</strong>${esc(c.nome_loja || "")}</div></div></div>`;
        main().innerHTML = banner + atalhos + prateleiras + beneficios;
        iniciarBanner();
    }

    let slideAtual = 0;
    function mostrarSlide(i) {
        const s = $$(".slide"), p = $$(".pontos button");
        if (!s.length) return;
        slideAtual = (i + s.length) % s.length;
        s.forEach((el, k) => el.classList.toggle("ativo", k === slideAtual));
        p.forEach((el, k) => el.classList.toggle("ativo", k === slideAtual));
    }
    function iniciarBanner() {
        slideAtual = 0;
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        estado.timers.push(setInterval(() => { if (!document.hidden) mostrarSlide(slideAtual + 1); }, 6000));
    }

    function viewLista(titulo, migalha, produtos, vazioTxt) {
        const sel = (v, t) => `<option value="${v}"${estado.ordem === v ? " selected" : ""}>${t}</option>`;
        main().innerHTML = `<p class="migalhas"><a href="#inicio">Início</a> › ${migalha}</p>
            <div class="barra-lista"><div><h1 class="titulo-secao" style="margin:0">${titulo}</h1><small style="color:#718078" id="contagem"></small></div>
            <label>Ordenar por <select id="ordem" aria-label="Ordenar produtos">${sel("nome", "Nome (A–Z)")}${sel("menor", "Menor preço")}${sel("maior", "Maior preço")}</select></label></div>
            <div class="grade" id="grade"></div>`;
        const desenhar = () => {
            $("#contagem").textContent = produtos.length + " produto(s)";
            $("#grade").innerHTML = produtos.length ? ordenar(produtos).map(cardProduto).join("") : vazio(vazioTxt);
        };
        desenhar();
        $("#ordem").addEventListener("change", (e) => { estado.ordem = e.target.value; desenhar(); });
    }

    function viewCategoria(id) {
        const k = estado.cat.categorias.find((c) => String(c.id) === String(id));
        marcarCategoriaAtiva(id);
        if (!k) { viewLista("Departamento", "Departamento", [], "Esse departamento não tem produtos no momento."); return; }
        viewLista(`${emojiCat(k.nome)} ${esc(k.nome)}`, esc(k.nome), estado.cat.produtos.filter((p) => p.categoria_id === k.id), "Sem produtos neste departamento.");
    }

    function viewBusca(termo) {
        const t = semAcento(termo).trim();
        const partes = t.split(/\s+/).filter(Boolean);
        const lista = estado.cat.produtos.filter((p) => {
            const alvo = semAcento([p.nome, p.marca, p.categoria, p.descricao].join(" "));
            return partes.every((x) => alvo.includes(x));
        });
        $("#campoBusca").value = termo;
        viewLista(`Resultados para “${esc(termo)}”`, "Busca", lista, "Nenhum produto encontrado. Tente outra palavra ou veja os departamentos.");
    }

    // ----------------------- gaveta do carrinho -----------------------
    function cupomFormHtml() {
        const c = estado.cat.config;
        if (!c.cupom_ativo) return "";
        if (estado.cupom) return `<div class="aviso" style="margin:0 0 10px">🎟️ Cupom <strong>${esc(estado.cupom.codigo)}</strong> aplicado (${estado.cupom.percentual}% OFF) <button type="button" class="btn-link" data-acao="remover-cupom">remover</button></div>`;
        return `<form class="cupom-form" data-form="cupom"><input type="text" name="codigo" placeholder="Cupom de desconto" aria-label="Cupom de desconto" maxlength="30" autocomplete="off"><button class="btn-sec" type="submit">Aplicar</button></form>`;
    }
    function totaisHtml(t) {
        return `<div class="linha-tot"><span>Subtotal (${t.qtd} item(ns))</span><span>${reais(t.subtotal)}</span></div>
            ${t.desconto ? `<div class="linha-tot desc"><span>Desconto</span><span>− ${reais(t.desconto)}</span></div>` : ""}
            <div class="linha-tot"><span>Frete</span><span>${t.frete ? reais(t.frete) : "Grátis"}</span></div>
            <div class="linha-tot total"><span>Total</span><span>${reais(t.total)}</span></div>`;
    }
    function freteBarraHtml(t) {
        const g = Number(estado.cat.config.frete_gratis_acima || 0);
        if (g <= 0 || !t.itens.length) return "";
        if (t.subtotal >= g) return `<div class="frete-barra">🎉 Você ganhou <strong>frete grátis</strong>!</div>`;
        const pct = Math.min(100, Math.round(t.subtotal / g * 100));
        return `<div class="frete-barra">Faltam <strong>${reais(g - t.subtotal)}</strong> para o frete grátis<div class="trilha"><i style="width:${pct}%"></i></div></div>`;
    }
    function renderGaveta() {
        const t = totais();
        const g = $("#gaveta");
        const itens = t.itens.map(({ p, qtd }) => `<div class="item-car"><div class="mini" aria-hidden="true">${emojiDe(p)}</div>
            <div><h4>${esc(p.nome)}</h4><small>${reais(p.preco)} cada</small>
            <div class="qtd"><button type="button" data-acao="menos" data-id="${p.id}" aria-label="Diminuir">−</button><span>${qtd}</span>
            <button type="button" data-acao="mais" data-id="${p.id}" aria-label="Aumentar">+</button></div></div>
            <div><div class="preco-linha">${reais(p.preco * qtd)}</div><button type="button" class="remover" data-acao="remover" data-id="${p.id}">Remover</button></div></div>`).join("");
        g.innerHTML = `<div class="gav-topo"><h2><i class="fas fa-shopping-basket"></i> Meu carrinho (${t.qtd})</h2>
            <button type="button" class="gav-fechar" data-acao="fechar-carrinho" aria-label="Fechar carrinho"><i class="fas fa-times"></i></button></div>
            <div class="gav-corpo">${t.itens.length ? freteBarraHtml(t) + itens : vazio("Seu carrinho está vazio.<br>Escolha produtos para começar.")}</div>
            ${t.itens.length ? `<div class="gav-rodape">${cupomFormHtml()}${totaisHtml(t)}
            <button type="button" class="btn-pri" data-acao="ir-checkout">Finalizar compra</button></div>` : ""}`;
    }
    function abrirGaveta() {
        renderGaveta();
        $("#fundoGaveta").hidden = false;
        $("#gaveta").hidden = false;
        document.body.classList.add("sem-rolagem");
        const f = $(".gav-fechar", $("#gaveta")); if (f) f.focus();
    }
    function fecharGaveta() {
        $("#fundoGaveta").hidden = true;
        $("#gaveta").hidden = true;
        document.body.classList.remove("sem-rolagem");
    }

    // ----------------------- formas de pagamento -----------------------
    function tipoDe(nome) {
        const n = semAcento(nome);
        if (n.includes("credito")) return "credito";
        if (n.includes("debito")) return "debito";
        if (n.includes("pix")) return "pix";
        if (n.includes("boleto")) return "boleto";
        if (n.includes("dinheiro")) return "dinheiro";
        if (n.includes("vale")) return "vale";
        return null;
    }
    const ICONE = { credito: "fa-credit-card", debito: "fa-credit-card", pix: "fa-qrcode", boleto: "fa-barcode", dinheiro: "fa-money-bill-wave", vale: "fa-utensils" };
    const SUBTITULO = { credito: "em até 12x", debito: "à vista", pix: "aprovação na hora", boleto: "vence em 3 dias", dinheiro: "pague ao receber", vale: "Alelo, Sodexo, VR, Ticket" };

    function luhn(n) {
        let soma = 0, alt = false;
        for (let i = n.length - 1; i >= 0; i--) {
            let d = +n[i];
            if (alt) { d *= 2; if (d > 9) d -= 9; }
            soma += d; alt = !alt;
        }
        return n.length > 0 && soma % 10 === 0;
    }
    function bandeiraDe(n) {
        n = n.replace(/\D/g, "");
        if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return "Elo";
        if (/^4/.test(n)) return "Visa";
        if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "Mastercard";
        if (/^3[47]/.test(n)) return "American Express";
        if (/^(606282|3841)/.test(n)) return "Hipercard";
        return "";
    }

    function camposCartao(tipo) {
        const vale = tipo === "vale"
            ? `<label class="campo c6">Bandeira do vale<select name="bandeira_vale"><option>Alelo</option><option>Sodexo</option><option>VR</option><option>Ticket</option><option>Outra</option></select></label>` : "";
        const parcelas = tipo === "credito" ? `<label class="campo c6">Parcelas<select name="parcelas" id="selParcelas"></select></label>` : "";
        return `<div class="campos">${vale}
            <label class="campo c4">Número do cartão <input type="text" name="cartao_numero" inputmode="numeric" autocomplete="cc-number" data-mask="cartao" maxlength="23" placeholder="0000 0000 0000 0000"><small class="bandeira-lida" data-bandeira></small></label>
            <label class="campo c2">Validade <input type="text" name="validade" inputmode="numeric" autocomplete="cc-exp" data-mask="validade" maxlength="5" placeholder="MM/AA"></label>
            <label class="campo c4">Nome impresso no cartão <input type="text" name="titular" autocomplete="cc-name" maxlength="60"></label>
            <label class="campo c2">CVV <input type="text" name="cvv" inputmode="numeric" autocomplete="cc-csc" maxlength="4" data-mask="num" placeholder="123"></label>
            ${parcelas}</div>`;
    }

    function corpoForma(tipo) {
        switch (tipo) {
            case "credito": case "debito": case "vale": return camposCartao(tipo);
            case "pix": return `<p>Ao confirmar, mostramos o <strong>QR Code</strong> e o código <strong>PIX copia e cola</strong>. O pedido é liberado assim que o pagamento é confirmado.</p>`;
            case "boleto": return `<p>Ao confirmar, mostramos a linha digitável do boleto. Vence em 3 dias e o pedido é liberado após a compensação (1 a 2 dias úteis).</p>`;
            case "dinheiro": return `<p>Pague ao receber. Se precisar de troco, informe abaixo (opcional).</p>
                <div class="campos"><label class="campo">Troco para (R$)<input type="number" name="troco" min="0" step="0.01" placeholder="Ex.: 100,00"></label></div>`;
            default: return "";
        }
    }

    function atualizarParcelas() {
        const sel = $("#selParcelas");
        if (!sel) return;
        const t = totais();
        const max = Number(estado.cat.config.parcelas_max || 1);
        const atual = sel.value || "1";
        sel.innerHTML = Array.from({ length: max }, (_, i) => i + 1).map((n) =>
            `<option value="${n}"${String(n) === atual ? " selected" : ""}>${n}x de ${reais(t.total / n)} sem juros</option>`).join("");
    }

    // ----------------------- checkout -----------------------
    function viewCheckout() {
        const t = totais();
        if (!t.itens.length) { main().innerHTML = vazio('Seu carrinho está vazio. <br><a class="btn-sec" href="#inicio" style="margin-top:14px">Ver produtos</a>'); return; }
        const e = estado.usuario.endereco || {};
        const formas = estado.cat.formas_pagamento.map((f) => ({ ...f, tipo: tipoDe(f.nome) })).filter((f) => f.tipo);
        const campo = (nome, rotulo, valor, cls, extra = "") => `<label class="campo ${cls}">${rotulo}<input type="text" name="${nome}" value="${esc(valor || "")}" ${extra}></label>`;
        main().innerHTML = `<h1 class="titulo-secao">Finalizar compra</h1>
            <div class="checkout">
              <form id="formCheckout" data-form="checkout" novalidate>
                <section class="caixa"><h2><span class="num">1</span> Endereço de entrega</h2>
                  <div class="campos">
                    ${campo("cep", "CEP", e.cep, "c2", 'data-mask="cep" inputmode="numeric" maxlength="9" autocomplete="postal-code" required')}
                    ${campo("rua", "Rua", e.rua, "c4", 'autocomplete="address-line1" maxlength="100" required')}
                    ${campo("numero", "Número", e.numero, "c2", 'maxlength="10" required')}
                    ${campo("complemento", "Complemento", e.complemento, "c4", 'maxlength="100" placeholder="Apto, bloco... (opcional)"')}
                    ${campo("bairro", "Bairro", e.bairro, "c2", 'maxlength="100" required')}
                    ${campo("cidade", "Cidade", e.cidade, "c4", 'maxlength="100" required')}
                    ${campo("uf", "UF", e.uf, "c2", 'maxlength="2" style="text-transform:uppercase" placeholder="SC" required')}
                  </div>
                  <div class="info-entrega">🚚 Entrega em até <strong>${Number(estado.cat.config.prazo_entrega_dias || 0)} dia(s)</strong>, com código de rastreio e acompanhamento em <strong>Meus pedidos</strong>.</div>
                </section>
                <section class="caixa"><h2><span class="num">2</span> Forma de pagamento</h2>
                  <div class="formas" role="radiogroup" aria-label="Forma de pagamento">
                    ${formas.map((f, i) => `<div class="forma${i === 0 ? " sel" : ""}" data-tipo="${f.tipo}">
                        <label><input type="radio" name="forma" value="${f.id}" data-tipo="${f.tipo}"${i === 0 ? " checked" : ""}>
                        <i class="fas ${ICONE[f.tipo]}"></i> ${esc(f.nome)} <small>${SUBTITULO[f.tipo]}</small></label>
                        <div class="forma-corpo"${i === 0 ? "" : " hidden"}>${corpoForma(f.tipo)}</div></div>`).join("") || vazio("Nenhuma forma de pagamento cadastrada.")}
                  </div>
                  <p class="aviso atencao" style="margin-bottom:0">Ambiente de demonstração: nenhum cartão ou boleto é cobrado de verdade. Os dados do cartão não são salvos (guardamos só os 4 últimos dígitos).</p>
                </section>
              </form>
              <aside class="resumo"><section class="caixa"><h2>Resumo do pedido</h2><div id="resumoCheckout"></div>
                <p class="msg-form erro" id="msgCheckout" role="alert"></p>
                <button type="submit" form="formCheckout" class="btn-pri" id="btnConfirmar">Confirmar pedido</button>
                <a class="btn-link" href="#inicio" style="display:block;text-align:center;margin-top:10px">Continuar comprando</a></section></aside>
            </div>`;
        renderResumoCheckout();
    }
    function renderResumoCheckout() {
        const box = $("#resumoCheckout");
        if (!box) return;
        const t = totais();
        box.innerHTML = t.itens.map(({ p, qtd }) => `<div class="res-item"><span>${qtd}× ${esc(p.nome)}</span><span>${reais(p.preco * qtd)}</span></div>`).join("")
            + `<div style="margin-top:12px">${cupomFormHtml()}</div>` + totaisHtml(t);
        atualizarParcelas();
    }

    function marcarInvalido(el, msg) {
        el.classList.add("invalido");
        el.focus();
        $("#msgCheckout").textContent = msg;
    }

    function validarCartao(corpo, tipo) {
        const num = corpo.elements.numero.value.replace(/\D/g, "");
        const val = corpo.elements.validade.value;
        const cvv = corpo.elements.cvv.value;
        if (tipo !== "vale" && (num.length < 13 || !luhn(num))) return { el: corpo.elements.numero, msg: "Número de cartão inválido." };
        if (tipo === "vale" && (num.length < 13 || num.length > 19)) return { el: corpo.elements.numero, msg: "Número do cartão inválido." };
        const m = /^(\d{2})\/(\d{2})$/.exec(val);
        const hoje = new Date();
        if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < hoje.getFullYear() * 12 + hoje.getMonth() + 1)
            return { el: corpo.elements.validade, msg: "Validade inválida ou vencida." };
        if (corpo.elements.titular.value.trim().length < 3) return { el: corpo.elements.titular, msg: "Informe o nome impresso no cartão." };
        if (!/^\d{3,4}$/.test(cvv)) return { el: corpo.elements.cvv, msg: "CVV inválido." };
        const band = tipo === "vale" ? corpo.elements.bandeira_vale.value : (bandeiraDe(num) || "Outra");
        return { final: num.slice(-4), bandeira: band };
    }

    async function enviarCheckout(form) {
        $$(".invalido", form).forEach((x) => x.classList.remove("invalido"));
        $("#msgCheckout").textContent = "";
        const t = totais();
        if (!t.itens.length) { $("#msgCheckout").textContent = "Seu carrinho está vazio."; return; }

        const el = form.elements;
        const cep = el.cep.value.replace(/\D/g, "");
        if (cep.length !== 8) return marcarInvalido(el.cep, "Informe o CEP com 8 números.");
        for (const [n, msg] of [["rua", "Informe a rua."], ["numero", "Informe o número."], ["bairro", "Informe o bairro."], ["cidade", "Informe a cidade."]]) {
            if (!el[n].value.trim()) return marcarInvalido(el[n], msg);
        }
        if (!/^[A-Za-z]{2}$/.test(el.uf.value.trim())) return marcarInvalido(el.uf, "Informe a UF com 2 letras.");

        const radio = form.querySelector('input[name="forma"]:checked');
        if (!radio) { $("#msgCheckout").textContent = "Escolha a forma de pagamento."; return; }
        const tipo = radio.dataset.tipo;
        const corpo = radio.closest(".forma").querySelector(".forma-corpo");
        const dados = {
            itens: estado.carrinho.map((i) => ({ id: i.id, qtd: i.qtd })),
            cupom: estado.cupom ? estado.cupom.codigo : "",
            forma_pagamento_id: Number(radio.value),
            endereco: { cep, rua: el.rua.value.trim(), numero: el.numero.value.trim(), complemento: el.complemento.value.trim(),
                        bairro: el.bairro.value.trim(), cidade: el.cidade.value.trim(), uf: el.uf.value.trim().toUpperCase() },
        };
        if (["credito", "debito", "vale"].includes(tipo)) {
            const r = validarCartao({ elements: {
                numero: $("[name=cartao_numero]", corpo), validade: $("[name=validade]", corpo), titular: $("[name=titular]", corpo), cvv: $("[name=cvv]", corpo),
                bandeira_vale: $("[name=bandeira_vale]", corpo) } }, tipo);
            if (r.msg) return marcarInvalido(r.el, r.msg);
            dados.cartao_final = r.final;
            dados.bandeira = r.bandeira;
            if (tipo === "credito") dados.parcelas = Number($("[name=parcelas]", corpo).value || 1);
        }
        if (tipo === "dinheiro") {
            const troco = $("[name=troco]", corpo).value;
            if (troco !== "") {
                if (Number(troco) < t.total) return marcarInvalido($("[name=troco]", corpo), "O troco deve ser para um valor maior ou igual ao total (" + reais(t.total) + ").");
                dados.troco_para = Number(troco);
            }
        }

        const btn = $("#btnConfirmar");
        btn.disabled = true;
        btn.textContent = "Enviando pedido...";
        try {
            const r = await api("finalizar_pedido.php", { method: "POST", body: dados });
            estado.carrinho = [];
            estado.cupom = null;
            gravarCarrinho();
            estado.ultimoEmail = { id: r.pedido.id, status: r.email, destino: r.email_destino };
            location.hash = "#pedido/" + r.pedido.id;
            carregarCatalogo(true).catch(() => {}); // estoque mudou
        } catch (err) {
            $("#msgCheckout").textContent = err.message;
            btn.disabled = false;
            btn.textContent = "Confirmar pedido";
            if (err.dados && err.dados.codigo) { await carregarCatalogo(true).catch(() => {}); ajustarCarrinho(); gravarCarrinho(); renderResumoCheckout(); }
        }
    }

    // ----------------------- PIX e boleto -----------------------
    function campoEmv(id, valor) { return id + String(valor.length).padStart(2, "0") + valor; }
    function crc16(texto) {
        let crc = 0xFFFF;
        for (let i = 0; i < texto.length; i++) {
            crc ^= texto.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
        return crc.toString(16).toUpperCase().padStart(4, "0");
    }
    function gerarPix(valor, pedidoId) {
        const c = estado.cat.config;
        const limpa = (s, n) => semAcento(s).toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, n) || "NAO INFORMADO";
        const chave = c.pix_chave || "demonstracao@klpnunes.com.br";
        const conta = campoEmv("00", "br.gov.bcb.pix") + campoEmv("01", chave);
        const base = campoEmv("00", "01") + campoEmv("01", "12") + campoEmv("26", conta) + campoEmv("52", "0000") + campoEmv("53", "986")
            + campoEmv("54", valor.toFixed(2)) + campoEmv("58", "BR") + campoEmv("59", limpa(c.pix_nome, 25)) + campoEmv("60", limpa(c.pix_cidade, 15))
            + campoEmv("62", campoEmv("05", "KLP" + pedidoId)) + "6304";
        return { codigo: base + crc16(base), demonstracao: !c.pix_chave };
    }
    function linhaBoleto(p) {
        const pad = (n, t) => String(n).padStart(t, "0");
        const venc = Date.now() + 3 * 864e5;
        const fator = Math.floor((venc - Date.UTC(1997, 9, 7)) / 864e5) % 10000;
        const c1 = "0019000009", c2 = "0" + pad(p.id, 9) + "7", c3 = pad((p.id * 7919) % 1e10, 10) + "5";
        const e = pad(fator, 4) + pad(Math.round(p.total * 100), 10);
        return `${c1.slice(0, 5)}.${c1.slice(5)} ${c2.slice(0, 5)}.${c2.slice(5)} ${c3.slice(0, 5)}.${c3.slice(5)} 1 ${e}`;
    }

    function pagamentoPendenteHtml(p) {
        const tipo = tipoDe(p.forma_nome || "");
        if (p.status_venda === "Aguardando pagamento" && tipo === "pix") {
            const pix = gerarPix(p.total, p.id);
            return `<div class="caixa"><h2><i class="fas fa-qrcode"></i> Pague com PIX — ${reais(p.total)}</h2>
                ${pix.demonstracao ? '<p class="aviso atencao">A loja ainda não cadastrou a chave PIX (Configurações). Este código é só de demonstração.</p>' : ""}
                <div class="pix-box"><div class="qr" id="qr-${p.id}" data-qr="${esc(pix.codigo)}"></div>
                <div><label for="cod-${p.id}"><strong>PIX copia e cola</strong></label><textarea class="codigo" id="cod-${p.id}" readonly>${esc(pix.codigo)}</textarea>
                <button type="button" class="btn-peq" data-acao="copiar" data-alvo="cod-${p.id}"><i class="far fa-copy"></i> Copiar código</button></div></div></div>`;
        }
        if (p.status_venda === "Aguardando pagamento" && tipo === "boleto") {
            return `<div class="caixa"><h2><i class="fas fa-barcode"></i> Boleto — ${reais(p.total)}</h2>
                <p class="aviso atencao">Boleto de demonstração (sem registro bancário). Vencimento em 3 dias.</p>
                <textarea class="codigo" id="cod-${p.id}" readonly style="min-height:48px">${esc(linhaBoleto(p))}</textarea>
                <button type="button" class="btn-peq" data-acao="copiar" data-alvo="cod-${p.id}"><i class="far fa-copy"></i> Copiar linha digitável</button></div>`;
        }
        if (p.status_venda === "Pagar na entrega") {
            return `<div class="aviso">💵 Pagamento em dinheiro na entrega${p.troco_para ? ` — troco para <strong>${reais(p.troco_para)}</strong>` : ""}.</div>`;
        }
        return "";
    }
    function desenharQrCodes() {
        $$("[data-qr]").forEach((el) => {
            if (el.dataset.pronto) return;
            el.dataset.pronto = "1";
            if (window.QRCode) { try { new QRCode(el, { text: el.dataset.qr, width: 170, height: 170 }); return; } catch (e) { /* cai no texto */ } }
            el.innerHTML = '<small style="text-align:center;color:#718078">QR Code indisponível.<br>Use o código ao lado.</small>';
        });
    }

    // ----------------------- pedidos -----------------------
    function chipStatus(s) {
        const cls = ["Cancelado", "Estornado"].includes(s) ? "ruim" : (["Aguardando pagamento", "Pagar na entrega"].includes(s) ? "espera" : "");
        return `<span class="chip ${cls}">${esc(s)}</span>`;
    }
    function etapas(p) {
        const envio = p.status_envio || "A enviar";
        const pago = p.status_venda === "Pago";
        const naEntrega = p.status_venda === "Pagar na entrega";
        const enviado = ["Enviado", "Em trânsito", "Entregue"].includes(envio);
        const entregue = envio === "Entregue";
        return [
            { t: "Pedido realizado", e: "ok" },
            { t: naEntrega ? "Pagamento na entrega" : "Pagamento", e: pago ? "ok" : (naEntrega ? "ok" : "atual") },
            { t: envio === "Em trânsito" ? "Em trânsito" : (enviado ? "Enviado" : "Preparando"), e: enviado ? "ok" : ((pago || naEntrega) ? "atual" : "") },
            { t: "Entregue", e: entregue ? "ok" : (enviado ? "atual" : "") },
        ];
    }
    function linhaTempoHtml(p) {
        if (["Cancelado", "Estornado"].includes(p.status_venda)) return "";
        return `<div class="linha-tempo" aria-label="Andamento do pedido">${etapas(p).map((e) => `<div class="etapa ${e.e}">${esc(e.t)}</div>`).join("")}</div>`;
    }
    function itensTabela(p) {
        return `<table class="tab-itens"><thead><tr><th>Produto</th><th class="d">Qtd.</th><th class="d">Unit.</th><th class="d">Total</th></tr></thead><tbody>
            ${p.itens.map((i) => `<tr><td>${esc(i.nome)}</td><td class="d">${i.qtd}</td><td class="d">${reais(i.preco)}</td><td class="d">${reais(i.preco * i.qtd)}</td></tr>`).join("")}</tbody></table>
            <div style="max-width:300px;margin-left:auto">
            <div class="linha-tot"><span>Subtotal</span><span>${reais(p.subtotal)}</span></div>
            ${p.desconto ? `<div class="linha-tot desc"><span>Desconto${p.cupom ? " (" + esc(p.cupom) + ")" : ""}</span><span>− ${reais(p.desconto)}</span></div>` : ""}
            <div class="linha-tot"><span>Frete</span><span>${p.frete ? reais(p.frete) : "Grátis"}</span></div>
            <div class="linha-tot total"><span>Total</span><span>${reais(p.total)}</span></div></div>`;
    }
    function entregaHtml(p) {
        return `<p style="font-size:.86rem;margin-top:10px"><strong>Pagamento:</strong> ${esc(p.pagamento_detalhe || p.forma_nome || "—")}<br>
            <strong>Entrega em:</strong> ${esc(p.endereco_entrega || "—")}<br>
            <strong>Previsão:</strong> ${p.previsao_entrega ? dataBR(p.previsao_entrega) : "a combinar"} · <strong>Status:</strong> ${esc(p.status_envio || "A enviar")}<br>
            <strong>Código de rastreio:</strong> <span class="rastreio">${esc(p.codigo_rastreio || "—")}</span></p>`;
    }

    async function buscarPedidos() { return (await api("pedidos_cliente.php")).pedidos; }

    async function viewPedidos(token) {
        main().innerHTML = '<p class="carregando">Carregando seus pedidos...</p>';
        const lista = await buscarPedidos();
        if (token !== estado.token) return;
        main().innerHTML = `<h1 class="titulo-secao">Meus pedidos</h1>` + (lista.length ? lista.map((p) => `<article class="pedido-card">
            <div class="ped-topo"><div><h3>Pedido #${p.id}</h3><small>${dataBR(p.data_venda)} · ${p.itens.reduce((s, i) => s + i.qtd, 0)} item(ns) · <strong>${reais(p.total)}</strong></small></div>${chipStatus(p.status_venda)}</div>
            ${linhaTempoHtml(p)}
            ${pagamentoPendenteHtml(p)}
            <details class="det"><summary>Ver detalhes, entrega e comprovante</summary>${itensTabela(p)}${entregaHtml(p)}
            <div class="acoes-linha"><button type="button" class="btn-sec" data-acao="reenviar" data-id="${p.id}"><i class="far fa-envelope"></i> Reenviar comprovante por e-mail</button></div></details></article>`).join("")
            : vazio('Você ainda não fez nenhum pedido.<br><a class="btn-sec" href="#inicio" style="margin-top:14px">Começar a comprar</a>'));
        desenharQrCodes();
    }

    async function viewPedido(id, token) {
        main().innerHTML = '<p class="carregando">Carregando pedido...</p>';
        const lista = await buscarPedidos();
        if (token !== estado.token) return;
        const p = lista.find((x) => String(x.id) === String(id));
        if (!p) { main().innerHTML = vazio('Pedido não encontrado. <br><a class="btn-sec" href="#pedidos" style="margin-top:14px">Ver meus pedidos</a>'); return; }
        const em = estado.ultimoEmail && String(estado.ultimoEmail.id) === String(p.id) ? estado.ultimoEmail : null;
        let aviso = "";
        if (em) {
            aviso = em.status === "enviado" ? `<div class="aviso">✉️ Enviamos o comprovante e os dados de entrega para <strong>${esc(em.destino)}</strong>.</div>`
                : em.status === "simulado" ? `<div class="aviso atencao">✉️ O servidor de e-mail ainda não está configurado, então o e-mail não saiu. Uma cópia do comprovante foi guardada em <code>logs_email</code> no servidor e o comprovante completo está abaixo. Veja <code>config_email.php</code>.</div>`
                : `<div class="aviso atencao">✉️ Não conseguimos enviar o e-mail agora. O comprovante completo está abaixo e em <strong>Meus pedidos</strong>.</div>`;
        }
        main().innerHTML = `<section class="sucesso"><h1>✅ Pedido #${p.id} realizado!</h1>
            <p>${p.status_venda === "Pago" ? "Pagamento aprovado. Já estamos separando seus produtos." : p.status_venda === "Pagar na entrega" ? "Pague em dinheiro ao receber." : "Falta só o pagamento para liberarmos o pedido."}</p></section>
            ${aviso}${pagamentoPendenteHtml(p)}
            <section class="caixa"><h2>Comprovante da compra ${chipStatus(p.status_venda)}</h2>${linhaTempoHtml(p)}${itensTabela(p)}${entregaHtml(p)}
            <div class="acoes-linha"><a class="btn-pri" style="width:auto;padding:11px 24px;margin:0" href="#inicio">Continuar comprando</a>
            <a class="btn-sec" href="#pedidos">Meus pedidos</a>
            <button type="button" class="btn-sec" data-acao="imprimir"><i class="fas fa-print"></i> Imprimir comprovante</button></div></section>`;
        desenharQrCodes();
    }

    // ----------------------- conta e senha -----------------------
    function viewConta() {
        const u = estado.usuario, e = u.endereco;
        main().innerHTML = `<h1 class="titulo-secao">Meus dados</h1><div class="conta-grid">
            <section class="caixa"><h2>Dados pessoais</h2>
              <form data-form="dados" novalidate><div class="campos">
                <label class="campo c6">Nome <input type="text" name="nome" value="${esc(u.nome)}" maxlength="100" required></label>
                <label class="campo c6">E-mail <input type="email" name="email" value="${esc(u.email)}" maxlength="100" required></label>
                <label class="campo c3">CPF <input type="text" value="${esc(u.cpf)}" disabled></label>
                <label class="campo c3">Telefone <input type="text" value="${esc(u.telefone || "")}" disabled></label></div>
                <p class="msg-form" id="msgDados" role="alert"></p><button class="btn-pri" type="submit" style="width:auto;padding:11px 28px">Salvar dados</button></form></section>
            <section class="caixa"><h2>Endereço cadastrado</h2>
              ${e ? `<dl class="lista-dados"><dt>Rua</dt><dd>${esc(e.rua || "—")}, ${esc(e.numero || "s/n")}</dd><dt>Complemento</dt><dd>${esc(e.complemento || "—")}</dd>
                <dt>Bairro</dt><dd>${esc(e.bairro || "—")}</dd><dt>Cidade</dt><dd>${esc(e.cidade || "—")}${e.uf ? "/" + esc(e.uf) : ""}</dd><dt>CEP</dt><dd>${esc(e.cep || "—")}</dd></dl>` : "<p>Nenhum endereço cadastrado. Você pode informar o endereço na hora de finalizar a compra.</p>"}
              <p style="margin-top:14px"><a class="btn-sec" href="#senha">Alterar senha</a></p></section></div>`;
    }
    function viewSenha() {
        main().innerHTML = `<h1 class="titulo-secao">Alterar senha</h1><section class="caixa" style="max-width:520px">
            <form data-form="senha" novalidate><div class="campos">
              <label class="campo c6">Senha atual <input type="password" name="atual" autocomplete="current-password" required></label>
              <label class="campo c6">Nova senha <input type="password" name="nova" autocomplete="new-password" minlength="8" required><small>Mínimo de 8 caracteres.</small></label>
              <label class="campo c6">Repita a nova senha <input type="password" name="repete" autocomplete="new-password" required></label></div>
              <p class="msg-form" id="msgSenha" role="alert"></p><button class="btn-pri" type="submit" style="width:auto;padding:11px 28px">Alterar senha</button></form></section>`;
    }
    const aviso = (id, txt, ok) => { const el = $(id); el.textContent = txt; el.className = "msg-form " + (ok ? "ok" : "erro"); };

    // ======================= rotas =======================
    async function rota() {
        const token = ++estado.token;
        estado.timers.forEach(clearInterval); estado.timers = [];
        fecharMenus(); fecharGaveta();
        const partes = location.hash.replace(/^#\/?/, "").split("/");
        const nome = partes[0] || "inicio";
        const arg = decodeURIComponent(partes.slice(1).join("/"));
        marcarCategoriaAtiva(nome === "categoria" ? arg : "");
        if (nome !== "busca") $("#campoBusca").value = "";
        try {
            switch (nome) {
                case "categoria": viewCategoria(arg); break;
                case "busca": viewBusca(arg); break;
                case "checkout": viewCheckout(); break;
                case "pedido": await viewPedido(arg, token); break;
                case "pedidos": await viewPedidos(token); break;
                case "conta": viewConta(); break;
                case "senha": viewSenha(); break;
                default: viewInicio();
            }
        } catch (e) {
            main().innerHTML = `<div class="erro-caixa">${esc(e.message)} <button type="button" class="btn-sec" data-acao="recarregar">Tentar de novo</button></div>`;
        }
        if (token === estado.token) { window.scrollTo(0, 0); main().focus({ preventScroll: true }); }
    }

    // ======================= catálogo (tempo real) =======================
    async function carregarCatalogo(forcar) {
        const j = await api("catalogo_cliente.php");
        const assinatura = JSON.stringify([j.config, j.produtos, j.categorias, j.formas_pagamento]);
        if (!forcar && assinatura === estado.assinatura) return false;
        estado.assinatura = assinatura;
        estado.cat = { config: j.config, categorias: j.categorias, produtos: j.produtos, formas_pagamento: j.formas_pagamento };
        return true;
    }
    async function atualizarSilencioso() {
        if (document.hidden) return;
        try {
            if (!(await carregarCatalogo(false))) return;
            const mudou = ajustarCarrinho();
            if (mudou) { toast("Alguns itens do carrinho foram atualizados (estoque ou preço)."); gravarCarrinho(); } else atualizarCabecalho();
            montarMenusEFaixa();
            const nome = location.hash.replace(/^#\/?/, "").split("/")[0] || "inicio";
            if (["inicio", "categoria", "busca"].includes(nome)) {
                const rolagem = window.scrollY;
                rota().then(() => window.scrollTo(0, rolagem));
            } else if (nome === "checkout") renderResumoCheckout();
            if (!$("#gaveta").hidden) renderGaveta();
        } catch (e) { /* tenta de novo no próximo ciclo */ }
    }

    // ======================= eventos =======================
    function copiar(texto) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
        return new Promise((ok, falha) => {
            const t = document.createElement("textarea");
            t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
            document.body.appendChild(t); t.select();
            try { document.execCommand("copy") ? ok() : falha(); } catch (e) { falha(e); } finally { t.remove(); }
        });
    }

    document.addEventListener("click", async (e) => {
        const alvo = e.target.closest("[data-acao]");
        if (!alvo) {
            if (!e.target.closest(".menu-conta") && !e.target.closest(".deps-menu")) fecharMenus();
            if (e.target.id === "fundoGaveta") fecharGaveta();
            return;
        }
        const id = Number(alvo.dataset.id);
        switch (alvo.dataset.acao) {
            case "mais": mudarQtd(id, 1); break;
            case "menos": mudarQtd(id, -1); break;
            case "remover": mudarQtd(id, -qtdNoCarrinho(id)); break;
            case "abrir-carrinho": abrirGaveta(); break;
            case "fechar-carrinho": fecharGaveta(); break;
            case "ir-checkout": fecharGaveta(); location.hash = "#checkout"; break;
            case "remover-cupom": estado.cupom = null; if (!$("#gaveta").hidden) renderGaveta(); renderResumoCheckout(); break;
            case "slide": mostrarSlide(Number(alvo.dataset.i)); break;
            case "imprimir": window.print(); break;
            case "recarregar": rota(); break;
            case "recarregar-pagina": location.reload(); break;
            case "copiar": {
                const ta = document.getElementById(alvo.dataset.alvo);
                try { await copiar(ta.value); toast("Código copiado!"); } catch (err) { ta.select(); toast("Selecione e copie o código manualmente.", true); }
                break;
            }
            case "reenviar": {
                alvo.disabled = true;
                try {
                    const r = await api("pedidos_cliente.php", { method: "POST", body: { acao: "reenviar", id } });
                    toast(r.email === "enviado" ? "Comprovante enviado para o seu e-mail!" : r.email === "simulado" ? "E-mail não configurado no servidor: cópia salva em logs_email." : "Não foi possível enviar agora.", r.email === "falhou");
                } catch (err) { toast(err.message, true); }
                alvo.disabled = false;
                break;
            }
        }
    });

    document.addEventListener("submit", async (e) => {
        const f = e.target;
        if (f.id === "formBusca") {
            e.preventDefault();
            const t = $("#campoBusca").value.trim();
            if (t) location.hash = "#busca/" + encodeURIComponent(t);
            return;
        }
        const tipo = f.dataset.form;
        if (!tipo) return;
        e.preventDefault();
        if (tipo === "cupom") {
            if (aplicarCupom(f.elements.codigo.value)) { if (!$("#gaveta").hidden) renderGaveta(); renderResumoCheckout(); }
        } else if (tipo === "checkout") {
            enviarCheckout(f);
        } else if (tipo === "dados") {
            try {
                const r = await api("conta_cliente.php", { method: "POST", body: { acao: "dados", nome: f.elements.nome.value, email: f.elements.email.value } });
                estado.usuario.nome = r.nome; estado.usuario.email = r.email;
                $("#nomeCliente").textContent = r.nome.split(" ")[0];
                try { localStorage.setItem("nomeCliente", r.nome); } catch (x) { /* sem storage */ }
                aviso("#msgDados", r.mensagem, true);
            } catch (err) { aviso("#msgDados", err.message, false); }
        } else if (tipo === "senha") {
            if (f.elements.nova.value !== f.elements.repete.value) return aviso("#msgSenha", "As senhas novas não coincidem.", false);
            try {
                const r = await api("conta_cliente.php", { method: "POST", body: { acao: "senha", atual: f.elements.atual.value, nova: f.elements.nova.value } });
                f.reset();
                aviso("#msgSenha", r.mensagem, true);
            } catch (err) { aviso("#msgSenha", err.message, false); }
        }
    });

    // trocar forma de pagamento
    document.addEventListener("change", (e) => {
        if (e.target.matches('input[name="forma"]')) {
            $$(".forma").forEach((b) => {
                const sel = b.contains(e.target);
                b.classList.toggle("sel", sel);
                $(".forma-corpo", b).hidden = !sel;
            });
            atualizarParcelas();
        }
    });

    // máscaras
    document.addEventListener("input", (e) => {
        const m = e.target.dataset && e.target.dataset.mask;
        if (!m) return;
        let v = e.target.value.replace(/\D/g, "");
        if (m === "cep") v = v.slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
        else if (m === "cartao") {
            const band = bandeiraDe(v);
            v = v.slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
            const rot = e.target.parentElement.querySelector("[data-bandeira]");
            if (rot) rot.textContent = band;
        } else if (m === "validade") v = v.slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
        else if (m === "num") v = v.slice(0, 4);
        e.target.value = v;
    });

    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { fecharGaveta(); fecharMenus(); } });
    window.addEventListener("hashchange", rota);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizarSilencioso(); });

    // ======================= início =======================
    async function iniciar() {
        try {
            const resp = await fetch("sessao_cliente.php", { credentials: "same-origin", cache: "no-store" });
            if (!resp.ok) { window.location.replace("Pagina_de_Login_Cliente.html"); return; }
            estado.usuario = await resp.json();
            if (!estado.usuario.logado) { window.location.replace("Pagina_de_Login_Cliente.html"); return; }
        } catch (e) {
            main().innerHTML = `<div class="erro-caixa">Não foi possível falar com o servidor. Verifique se o Apache e o MySQL do XAMPP estão ligados. <button type="button" class="btn-sec" data-acao="recarregar-pagina">Tentar de novo</button></div>`;
            return;
        }
        $("#btnConta").addEventListener("click", () => alternarMenu($("#btnConta"), $("#menuConta")));
        $("#btnDeps").addEventListener("click", () => alternarMenu($("#btnDeps"), $("#listaDeps")));
        $("#btnCarrinho").addEventListener("click", abrirGaveta);
        $("#nomeCliente").textContent = (estado.usuario.nome || "").split(" ")[0];
        try {
            await carregarCatalogo(true);
        } catch (e) {
            main().innerHTML = `<div class="erro-caixa">${esc(e.message)} Confira se rodou os arquivos SQL (veja o LEIAME). <button type="button" class="btn-sec" data-acao="recarregar-pagina">Tentar de novo</button></div>`;
            return;
        }
        estado.carrinho = lerCarrinho();
        if (ajustarCarrinho()) gravarCarrinho();
        montarMenusEFaixa();
        atualizarCabecalho();
        rota();
        setInterval(atualizarSilencioso, 30000); // atualiza preços e estoque sem recarregar a página
    }

    document.addEventListener("DOMContentLoaded", iniciar);
})();