<?php
    // estoque.php - categorias, marcas e produtos (somente administrador logado).
    //  GET  acao=dados              marcas e categorias (com quantos produtos cada uma tem) + limite de estoque baixo
    //  GET  acao=produtos           lista de produtos
    //  POST acao=salvar_categoria | editar_categoria | excluir_categoria
    //  POST acao=salvar_marca     | editar_marca     | excluir_marca
    //  POST acao=salvar_produto   | editar_produto   | repor_estoque | alternar_produto | excluir_produto
    // ATENÇÃO: no banco, apagar marca/categoria/produto apaga em cascata (ON DELETE CASCADE) os produtos e as
    // vendas ligados a ele. Por isso a exclusão aqui é BLOQUEADA quando existe algo ligado (use "desativar").
    include("../conexao_tcc.php");
    include("../config_loja.php");
    include("../Administrador/controle_acesso.php");
    exigir_admin();

    header("Content-Type: application/json; charset=UTF-8");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    function responder(array $d, int $codigo = 200): void {
        http_response_code($codigo);
        echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        exit();
    }
    function erro(string $msg, int $codigo = 400): void { responder(["sucesso" => false, "mensagem" => $msg], $codigo); }

    function texto(string $campo, int $max): string {
        $v = trim((string) ($_POST[$campo] ?? ""));
        if (mb_strlen($v) > $max) erro("O campo \"$campo\" aceita no máximo $max caracteres.");
        return $v;
    }
    function inteiro(string $campo, int $min, int $max, string $rotulo): int {
        $v = $_POST[$campo] ?? "";
        if ($v === "" || !preg_match('/^-?\d+$/', trim((string) $v))) erro("$rotulo: informe um número inteiro.");
        $n = (int) $v;
        if ($n < $min || $n > $max) erro("$rotulo: use um valor entre $min e $max.");
        return $n;
    }
    function preco(): float {
        $v = str_replace(",", ".", trim((string) ($_POST["preco"] ?? "")));
        if ($v === "" || !is_numeric($v)) erro("Informe o preço (ex.: 12,90).");
        $n = round((float) $v, 2);
        if ($n < 0) erro("O preço não pode ser negativo.");
        if ($n > 999999.99) erro("O preço é alto demais.");
        return $n;
    }
    function existe(PDO $conn, string $sql, array $p): bool {
        $st = $conn->prepare($sql);
        $st->execute($p);
        return (int) $st->fetchColumn() > 0;
    }
    // Conta linhas em uma tabela ligada ao produto; se a tabela não existir, considera 0.
    function contar_ligacao(PDO $conn, string $tabela, int $idProduto): int {
        $colunas = ["itens_venda" => "produto_id", "compra_fornecedor" => "estoque_id", "avaliacao_produto" => "produto_id"];
        try{
            $st = $conn->prepare("SELECT COUNT(*) FROM $tabela WHERE {$colunas[$tabela]} = :id");
            $st->execute([":id" => $idProduto]);
            return (int) $st->fetchColumn();
        } catch(PDOException $e){
            return 0;
        }
    }
    function registrar_movimento(PDO $conn, int $idProduto, int $quantidade, string $tipo, string $obs): void {
        if ($quantidade <= 0) return;
    try{
        $conn->prepare("INSERT INTO movimentacao_estoque (estoque_id, quantidade, tipo, observacao) VALUES (:e, :q, :t, :o)")
             ->execute([":e" => $idProduto, ":q" => $quantidade, ":t" => $tipo, ":o" => $obs]);
        } catch(PDOException $e){
            error_log("movimentacao_estoque: " . $e->getMessage()); // o histórico é opcional: não derruba a operação
        }
    }

    $acao = $_REQUEST["acao"] ?? "";
    $metodoPost = $_SERVER["REQUEST_METHOD"] === "POST";

    try{
        // LEITURA 
        if ($acao === "dados") {
            $marcas = $conn->query("SELECT m.id_marca, m.nome, COUNT(e.id_estoque) AS total_produtos
            FROM marca m LEFT JOIN estoque e ON e.marca_id = m.id_marca GROUP BY m.id_marca, m.nome ORDER BY m.nome")->fetchAll(PDO::FETCH_ASSOC);
        
            $categorias = $conn->query("SELECT c.id_categoria, c.nome, COUNT(e.id_estoque) AS total_produtos
            FROM categoria c LEFT JOIN estoque e ON e.categoria_id = c.id_categoria GROUP BY c.id_categoria, c.nome ORDER BY c.nome")->fetchAll(PDO::FETCH_ASSOC);
            
            responder(["sucesso" => true, "marcas" => $marcas, "categorias" => $categorias,
            "limite_estoque" => max(0, (int) carregar_config($conn)["estoque_baixo"])]);
        }

        if ($acao === "produtos") {
            $produtos = $conn->query(
                "SELECT e.id_estoque, e.nome_produto, e.descricao, e.quantidade, e.preco, e.ativo, e.data_cadastro,
                 e.marca_id, e.categoria_id, c.nome AS categoria, m.nome AS marca, (SELECT COALESCE(SUM(i.quantidade), 0) FROM itens_venda i WHERE i.produto_id = e.id_estoque) AS vendidos
                 FROM estoque e INNER JOIN categoria c ON e.categoria_id = c.id_categoria INNER JOIN marca m ON e.marca_id = m.id_marca ORDER BY e.id_estoque DESC"
        )->fetchAll(PDO::FETCH_ASSOC);
        
            foreach ($produtos as &$p) {
                $p["id_estoque"] = (int) $p["id_estoque"];
                $p["quantidade"] = (int) $p["quantidade"];
                $p["preco"] = (float) $p["preco"];
                $p["ativo"] = (int) $p["ativo"];
                $p["marca_id"] = (int) $p["marca_id"];
                $p["categoria_id"] = (int) $p["categoria_id"];
                $p["vendidos"] = (int) $p["vendidos"];
            }
            unset($p);
            responder(["sucesso" => true, "produtos" => $produtos]);
        }

        if (!$metodoPost) erro("Ação inválida.");

    // Salvar Categoria 
        if ($acao === "salvar_categoria") {
            $nome = texto("nome", 100);
            if ($nome === "") erro("Digite o nome da categoria.");
            if (existe($conn, "SELECT COUNT(*) FROM categoria WHERE LOWER(nome) = LOWER(:n)", [":n" => $nome])) erro("Já existe uma categoria com esse nome.", 409);
            $conn->prepare("INSERT INTO categoria (nome) VALUES (:n)")->execute([":n" => $nome]);
            responder(["sucesso" => true, "mensagem" => "Categoria cadastrada com sucesso!", "id" => (int) $conn->lastInsertId()]);
        }
    // Editar Categoria
        if ($acao === "editar_categoria") {
            $id = inteiro("id_categoria", 1, PHP_INT_MAX, "Categoria");
            $nome = texto("nome", 100);
            if ($nome === "") erro("Informe o novo nome da categoria.");
            if (existe($conn, "SELECT COUNT(*) FROM categoria WHERE LOWER(nome) = LOWER(:n) AND id_categoria <> :id", [":n" => $nome, ":id" => $id])) erro("Já existe uma categoria com esse nome.", 409);
            $conn->prepare("UPDATE categoria SET nome = :n WHERE id_categoria = :id")->execute([":n" => $nome, ":id" => $id]);
            responder(["sucesso" => true, "mensagem" => "Categoria atualizada com sucesso!"]);
        }
    // Excluir Categoria
        if ($acao === "excluir_categoria") {
            $id = inteiro("id_categoria", 1, PHP_INT_MAX, "Categoria");
            $qtd = (int) $conn->query("SELECT COUNT(*) FROM estoque WHERE categoria_id = " . $id)->fetchColumn();
            if ($qtd > 0) erro("Não é possível excluir: $qtd produto(s) usam esta categoria. Mude a categoria deles antes.", 409);
            $conn->prepare("DELETE FROM categoria WHERE id_categoria = :id")->execute([":id" => $id]);
            responder(["sucesso" => true, "mensagem" => "Categoria excluída com sucesso!"]);
        }

    // Salvar Marca 
        if ($acao === "salvar_marca") {
            $nome = texto("nome", 100);
            if ($nome === "") erro("Digite o nome da marca.");
            if (existe($conn, "SELECT COUNT(*) FROM marca WHERE LOWER(nome) = LOWER(:n)", [":n" => $nome])) erro("Já existe uma marca com esse nome.", 409);
            $conn->prepare("INSERT INTO marca (nome) VALUES (:n)")->execute([":n" => $nome]);
            responder(["sucesso" => true, "mensagem" => "Marca cadastrada com sucesso!", "id" => (int) $conn->lastInsertId()]);
        }
        if ($acao === "editar_marca") {
            $id = inteiro("id_marca", 1, PHP_INT_MAX, "Marca");
            $nome = texto("nome", 100);
            if ($nome === "") erro("Informe o novo nome da marca.");
            if (existe($conn, "SELECT COUNT(*) FROM marca WHERE LOWER(nome) = LOWER(:n) AND id_marca <> :id", [":n" => $nome, ":id" => $id])) erro("Já existe uma marca com esse nome.", 409);
            $conn->prepare("UPDATE marca SET nome = :n WHERE id_marca = :id")->execute([":n" => $nome, ":id" => $id]);
            responder(["sucesso" => true, "mensagem" => "Marca atualizada com sucesso!"]);
        }
        if ($acao === "excluir_marca") {
            $id = inteiro("id_marca", 1, PHP_INT_MAX, "Marca");
            $qtd = (int) $conn->query("SELECT COUNT(*) FROM estoque WHERE marca_id = " . $id)->fetchColumn();
            if ($qtd > 0) erro("Não é possível excluir: $qtd produto(s) usam esta marca. Mude a marca deles antes.", 409);
            $conn->prepare("DELETE FROM marca WHERE id_marca = :id")->execute([":id" => $id]);
            responder(["sucesso" => true, "mensagem" => "Marca excluída com sucesso!"]);
        }
    // Salvar Produto 
        if ($acao === "salvar_produto" || $acao === "editar_produto") {
            $editando = $acao === "editar_produto";
            $id = $editando ? inteiro("id_estoque", 1, PHP_INT_MAX, "Produto") : 0;
            $nome = texto("nome_produto", 150);
            $descricao = texto("descricao", 500);
            $marcaId = inteiro("marca_id", 1, PHP_INT_MAX, "Marca");
            $categoriaId = inteiro("categoria_id", 1, PHP_INT_MAX, "Categoria");
            $quantidade = inteiro("quantidade", 0, 1000000, "Quantidade");
            $valor = preco();
            $ativo = ($_POST["ativo"] ?? "1") === "0" ? 0 : 1;

            if ($nome === "") erro("Digite o nome do produto.");
            if (!existe($conn, "SELECT COUNT(*) FROM marca WHERE id_marca = :i", [":i" => $marcaId])) erro("Essa marca não existe mais. Atualize a página.");
            if (!existe($conn, "SELECT COUNT(*) FROM categoria WHERE id_categoria = :i", [":i" => $categoriaId])) erro("Essa categoria não existe mais. Atualize a página.");
            if (existe($conn, "SELECT COUNT(*) FROM estoque WHERE LOWER(nome_produto) = LOWER(:n) AND marca_id = :m AND id_estoque <> :id",
                   [":n" => $nome, ":m" => $marcaId, ":id" => $id])) {
                erro("Esse produto já está cadastrado para essa marca. Use \"Repor estoque\" na Lista de Produtos.", 409);
            }

            if (!$editando) {
                $conn->prepare("INSERT INTO estoque (nome_produto, descricao, marca_id, quantidade, preco, categoria_id, ativo, data_cadastro, ultima_atualizacao)
                VALUES (:n, :d, :m, :q, :p, :c, :a, NOW(), NOW())")
                ->execute([":n" => $nome, ":d" => $descricao, ":m" => $marcaId, ":q" => $quantidade, ":p" => $valor, ":c" => $categoriaId, ":a" => $ativo]);
                $novo = (int) $conn->lastInsertId();
                registrar_movimento($conn, $novo, $quantidade, "entrada", "Estoque inicial (cadastro do produto)");
                responder(["sucesso" => true, "mensagem" => "Produto cadastrado com sucesso!", "id" => $novo]);
            }

            $conn->beginTransaction();
            $st = $conn->prepare("SELECT quantidade FROM estoque WHERE id_estoque = :id" . ($conn->getAttribute(PDO::ATTR_DRIVER_NAME) === "mysql" ? " FOR UPDATE" : ""));
            $st->execute([":id" => $id]);
            $antes = $st->fetchColumn();
            if ($antes === false) { $conn->rollBack(); erro("Produto não encontrado.", 404); }
            $conn->prepare("UPDATE estoque SET nome_produto = :n, descricao = :d, marca_id = :m, quantidade = :q, preco = :p,
                        categoria_id = :c, ativo = :a, ultima_atualizacao = NOW() WHERE id_estoque = :id")
                ->execute([":n" => $nome, ":d" => $descricao, ":m" => $marcaId, ":q" => $quantidade, ":p" => $valor, ":c" => $categoriaId, ":a" => $ativo, ":id" => $id]);
            $dif = $quantidade - (int) $antes;
            if ($dif !== 0) registrar_movimento($conn, $id, abs($dif), $dif > 0 ? "entrada" : "saida", "Ajuste manual pelo administrador (de $antes para $quantidade)");
            $conn->commit();
            responder(["sucesso" => true, "mensagem" => "Produto atualizado com sucesso!"]);
        }
    // Repor Estoque
        if ($acao === "repor_estoque") {
            $id = inteiro("id_estoque", 1, PHP_INT_MAX, "Produto");
            $q = inteiro("quantidade", 1, 100000, "Quantidade a repor");
            $obs = texto("observacao", 200);
            $conn->beginTransaction();
            // soma direto no banco (não sobrescreve se um cliente comprar ao mesmo tempo)
            $up = $conn->prepare("UPDATE estoque SET quantidade = quantidade + :q, ultima_atualizacao = NOW() WHERE id_estoque = :id");
            $up->execute([":q" => $q, ":id" => $id]);
            if ($up->rowCount() === 0) { $conn->rollBack(); erro("Produto não encontrado.", 404); }
            registrar_movimento($conn, $id, $q, "entrada", $obs !== "" ? "Reposição: $obs" : "Reposição de estoque pelo administrador");
            $novo = $conn->prepare("SELECT quantidade FROM estoque WHERE id_estoque = :id");
            $novo->execute([":id" => $id]);
            $total = (int) $novo->fetchColumn();
            $conn->commit();
            responder(["sucesso" => true, "mensagem" => "Estoque reposto! Agora são $total unidade(s).", "quantidade" => $total]);
        }
    // Altera Produto
        if ($acao === "alternar_produto") {
            $id = inteiro("id_estoque", 1, PHP_INT_MAX, "Produto");
            $st = $conn->prepare("SELECT ativo FROM estoque WHERE id_estoque = :id");
            $st->execute([":id" => $id]);
            $atual = $st->fetchColumn();
            if ($atual === false) erro("Produto não encontrado.", 404);
            $novo = (int) $atual === 1 ? 0 : 1;
            $conn->prepare("UPDATE estoque SET ativo = :a, ultima_atualizacao = NOW() WHERE id_estoque = :id")->execute([":a" => $novo, ":id" => $id]);
            responder(["sucesso" => true, "ativo" => $novo, "mensagem" => $novo ? "Produto ativado: já aparece na loja." : "Produto desativado: saiu da loja."]);
        }
    // Excluir Produto
        if ($acao === "excluir_produto") {
            $id = inteiro("id_estoque", 1, PHP_INT_MAX, "Produto");
            if (contar_ligacao($conn, "itens_venda", $id) > 0) {
                erro("Esse produto já foi vendido; excluir apagaria o histórico de vendas e os relatórios. Desative o produto em vez de excluir.", 409);
            }
            if (contar_ligacao($conn, "compra_fornecedor", $id) > 0) {
                erro("Esse produto tem compras de fornecedor registradas. Desative o produto em vez de excluir.", 409);
            }
            $del = $conn->prepare("DELETE FROM estoque WHERE id_estoque = :id");
            $del->execute([":id" => $id]);
            if ($del->rowCount() === 0) erro("Produto não encontrado.", 404);
            responder(["sucesso" => true, "mensagem" => "Produto excluído."]);
        }

        erro("Ação inválida.");
    } catch(PDOException $e){
        if ($conn->inTransaction()) $conn->rollBack();
        error_log("estoque.php: " . $e->getMessage());
        responder(["sucesso" => false, "mensagem" => "Erro no banco de dados. Tente novamente."], 500);
    }
?>