document.addEventListener("DOMContentLoaded", function () {
    const abas = document.querySelectorAll(".aba");

    abas.forEach(function (aba) {
        aba.addEventListener("click", function () {
            const painel = this.dataset.painel;
        document.querySelectorAll(".aba") .forEach(function (item) {
            item.classList.remove("ativa");
        });
        document.querySelectorAll(".painel") .forEach(function (item) {
            item.classList.remove("ativo");
        });
            this.classList.add("ativa");
        document.getElementById("painel-" + painel) .classList.add("ativo");
            if (painel === "lista"){
                carregarProdutos();
            }
        });
    });

    const toggle = document.getElementById("toggle-ativo");
    const ativo = document.getElementById("ativo");
    const statusTexto = document.getElementById("status-texto");

    toggle.addEventListener("change", function () {
        ativo.value = this.checked ? "1" : "0";
        statusTexto.textContent = this.checked ? "Ativo" : "Inativo";
    });

    carregarDados();

    // Abre automaticamente a aba indicada pelo menu do administrador.
    const hash = window.location.hash.replace("#painel-", "");
    if (hash) {
        const abaInicial = document.querySelector('.aba[data-painel="' + hash + '"]');
        if (abaInicial) {
            abaInicial.click();
        }
    }

    document.getElementById("form-produto").addEventListener("submit", function (event) {
            event.preventDefault();
            enviarFormulario( this, "mensagem-produto");
    });
    document.getElementById("form-marca").addEventListener("submit", function (event) {
            event.preventDefault();
            enviarFormulario(this,"mensagem-marca");
    });
    document.getElementById("form-categoria").addEventListener("submit", function (event) {
            event.preventDefault();
            enviarFormulario(this,"mensagem-categoria");
    });
});
//Carregar Dados
function carregarDados(){
    fetch("estoque.php?acao=dados").then(function (resposta){
            return resposta.json();
    })
    .then(function (dados){
        if(!dados.sucesso){
            throw new Error(dados.mensagem);
        }
        preencherMarcas(dados.marcas);
        preencherCategorias(dados.categorias);
        mostrarMarcas(dados.marcas);
        mostrarCategorias(dados.categorias);
    })
    .catch(function (erro){
        console.error(erro);
            mostrarMensagem("mensagem-produto", "Não foi possível carregar marcas e categorias.", "erro");
        });
}
// Preencher Marcas
function preencherMarcas(marcas){

    const select = document.getElementById("marca_id");
    select.innerHTML = '<option value="">Selecione...</option>';
    
    marcas.forEach(function (marca) {
        const option = document.createElement("option");
        option.value = marca.id_marca;
        option.textContent = marca.nome;
        select.appendChild(option);
    });
}
// Preencher Categoria
function preencherCategorias(categorias) {

    const select = document.getElementById("categoria_id");
    select.innerHTML = '<option value="">Selecione...</option>';

    categorias.forEach(function (categoria) {
        const option = document.createElement("option");
        option.value = categoria.id_categoria;
        option.textContent = categoria.nome;
        select.appendChild(option);
    });
}
// Mostrar Marcas
function mostrarMarcas(marcas) {

    const lista = document.getElementById("lista-marcas");
    lista.innerHTML = "";

    if (marcas.length === 0){
        lista.innerHTML = '<span class="tag-vazia">Nenhuma marca cadastrada.</span>';
        return;
    }

    marcas.forEach(function (marca){

        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = marca.nome;
        lista.appendChild(span);
    });
}
//Mostrar Categorias
function mostrarCategorias(categorias){

    const lista = document.getElementById("lista-categorias");
    lista.innerHTML = "";

    if (categorias.length === 0){
        lista.innerHTML = '<span class="tag-vazia">Nenhuma categoria cadastrada.</span>';
        return;
    }
    categorias.forEach(function (categoria){
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = categoria.nome;
        lista.appendChild(span);
    });
}
//Enviar Formulário
function enviarFormulario(formulario, elementoMensagem){

    const dados = new FormData(formulario);

    fetch("estoque.php",{ 
        method: "POST",
        body: dados
    })
    .then(function (resposta){
        return resposta.json();
    })
    .then(function (dados){

        if(!dados.sucesso){
            throw new Error(dados.mensagem);
        }
        mostrarMensagem(elementoMensagem, dados.mensagem, "sucesso");
        formulario.reset();

        if( formulario.id === "form-produto"){

            document.getElementById("ativo").value = "1";
            document.getElementById("toggle-ativo").checked = true;
            document.getElementById("status-texto").textContent = "Ativo";
        }
        carregarDados();
    })
    .catch(function (erro){
        mostrarMensagem(elementoMensagem, erro.message,"erro"); 
    });
}
//Mostar Mensagem
function mostrarMensagem( elemento, mensagem, tipo){

    const div = document.getElementById(elemento);
    div.innerHTML = `<div class="${tipo}">${mensagem}</div>`;

    setTimeout(function (){ div.innerHTML = ""; }, 4000);
}
// Carregar Produtos
function carregarProdutos(){

    const lista = document.getElementById("lista-produtos");
    lista.innerHTML = "<p>Carregando produtos...</p>";

    fetch("estoque.php?acao=produtos")
        .then(function (resposta){
            return resposta.json();
        })
        .then(function (dados){
            if(!dados.sucesso){
                throw new Error(dados.mensagem);
            }
            if(dados.produtos.length === 0){
                lista.innerHTML = '<div class="erro">Nenhum produto cadastrado.</div>';
                return;
            }
            let html = ` <div class="tabela-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Produto</th>
                            <th>Descrição</th>
                            <th>Marca</th>
                            <th>Categoria</th>
                            <th>Quantidade</th>
                            <th>Preço</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                <tbody>`;
            dados.produtos.forEach(function (produto){
                html += `
                    <tr>
                        <td>
                            ${produto.id_estoque}
                        </td>
                        <td>
                            ${escapeHtml(produto.nome_produto)}
                        </td>
                        <td>
                            ${escapeHtml(produto.descricao || "")}
                        </td>
                        <td>
                            ${escapeHtml(produto.marca)}
                        </td>
                        <td>
                            ${escapeHtml(produto.categoria)}
                        </td>
                        <td>
                            ${produto.quantidade}
                        </td>
                        <td class="preco">
                            R$ ${Number(produto.preco).toFixed(2) .replace(".", ",")}
                        </td>
                        <td>
                            ${ Number(produto.ativo) === 1 ? '<span class="ativo">Ativo</span>' : '<span class="inativo">Inativo</span>'}
                        </td> </tr> `;
            });

            html += ` </tbody> </table></div>`;
            lista.innerHTML = html;
        })
        .catch(function (erro) {
            lista.innerHTML = `<div class="erro">${erro.message}</div>`;
        });
}
function escapeHtml(texto){
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}