<?php
// catalogo_cliente.php - categorias e produtos ativos com estoque, direto do banco (cliente logado).
include("cliente_comum.php");
exigir_cliente();

try {
    $cfg = carregar_config($conn);

    $produtos = $conn->query(
        "SELECT e.id_estoque AS id, e.nome_produto AS nome, e.descricao, e.preco, e.quantidade AS estoque,
                e.categoria_id, c.nome AS categoria, m.nome AS marca
         FROM estoque e
         INNER JOIN categoria c ON c.id_categoria = e.categoria_id
         INNER JOIN marca m ON m.id_marca = e.marca_id
         WHERE e.ativo = 1 AND e.quantidade > 0
         ORDER BY c.nome, e.nome_produto"
    )->fetchAll(PDO::FETCH_ASSOC);

    $contagem = [];
    foreach ($produtos as &$p) {
        $p["id"] = (int) $p["id"];
        $p["preco"] = (float) $p["preco"];
        $p["estoque"] = (int) $p["estoque"];
        $p["categoria_id"] = (int) $p["categoria_id"];
        $contagem[$p["categoria_id"]] = ($contagem[$p["categoria_id"]] ?? 0) + 1;
    }
    unset($p);

    $categorias = [];
    foreach ($conn->query("SELECT id_categoria AS id, nome FROM categoria ORDER BY nome")->fetchAll(PDO::FETCH_ASSOC) as $c) {
        $id = (int) $c["id"];
        if (!empty($contagem[$id])) $categorias[] = ["id" => $id, "nome" => $c["nome"], "total" => $contagem[$id]];
    }

    $formas = $conn->query("SELECT id_forma_pagamento AS id, nome FROM forma_pagamento ORDER BY id_forma_pagamento")->fetchAll(PDO::FETCH_ASSOC);

    responder(["sucesso" => true, "config" => config_publica($cfg), "categorias" => $categorias, "produtos" => $produtos, "formas_pagamento" => $formas]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    responder(["sucesso" => false, "mensagem" => "Não foi possível carregar os produtos."], 500);
}
