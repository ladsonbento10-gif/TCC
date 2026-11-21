<?php
    // relatorio.php - relatórios de vendas (somente administrador logado).
    //   GET  ?de=AAAA-MM-DD&ate=AAAA-MM-DD -> resumo, vendas por dia, formas de pagamento, mais vendidos, estoque baixo, pedidos
    //   GET  ?exportar=csv&de=...&ate=... -> baixa os pedidos do período em CSV
    //   POST acao=status (id_venda, status_venda, status_envio) -> atualiza o andamento de um pedido
    
    include("../conexao_tcc.php");
    include("../config_loja.php");
    include("../Administrador/controle_acesso.php");
    exigir_admin();

    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    const STATUS_VENDA = ['Aguardando pagamento', 'Pagar na entrega', 'Pago', 'Cancelado', 'Estornado'];
    const STATUS_ENVIO = ['A enviar', 'Preparando', 'Enviado', 'Em trânsito', 'Entregue', 'Problema no envio'];
    const SO_VALIDAS = "(v.status_venda IS NULL OR v.status_venda NOT IN ('Cancelado','Estornado'))";

    function responder(array $d, int $codigo = 200): void {
        http_response_code($codigo);
        header("Content-Type: application/json; charset=UTF-8");
        echo json_encode($d, JSON_UNESCAPED_UNICODE);
        exit();
    }
    function data_ok(string $d): bool {
        $x = DateTime::createFromFormat("Y-m-d", $d);
        return $x && $x->format("Y-m-d") === $d;
    }

    try{
    // ---------- atualizar andamento do pedido ----------
        if ($_SERVER["REQUEST_METHOD"] === "POST") {
            if (($_POST["acao"] ?? "") !== "status") responder(["sucesso" => false, "mensagem" => "Ação inválida."], 400);
            $id = (int) ($_POST["id_venda"] ?? 0);
            $sv = $_POST["status_venda"] ?? "";
            $se = $_POST["status_envio"] ?? "";
        
        if ($id <= 0) responder(["sucesso" => false, "mensagem" => "Pedido inválido."], 400);
        if ($sv !== "" && !in_array($sv, STATUS_VENDA, true)) responder(["sucesso" => false, "mensagem" => "Status do pedido inválido."], 400);
        if ($se !== "" && !in_array($se, STATUS_ENVIO, true)) responder(["sucesso" => false, "mensagem" => "Status da entrega inválido."], 400);

        $conn->beginTransaction();
        $atual = $conn->prepare("SELECT status_venda FROM venda WHERE id_vendas = :id");
        $atual->execute([":id" => $id]);
        $antes = $atual->fetchColumn();
        if ($antes === false) { $conn->rollBack(); responder(["sucesso" => false, "mensagem" => "Pedido não encontrado."], 404); }

        if ($sv !== "") {
            $conn->prepare("UPDATE venda SET status_venda = :s WHERE id_vendas = :id")->execute([":s" => $sv, ":id" => $id]);
            // Cancelou/estornou: o que estava reservado volta para o estoque (só na primeira vez).
            $eraValida = !in_array($antes, ['Cancelado', 'Estornado'], true);
            $viraInvalida = in_array($sv, ['Cancelado', 'Estornado'], true);
            if ($eraValida && $viraInvalida) {
                $conn->prepare("UPDATE estoque e INNER JOIN itens_venda i ON i.produto_id = e.id_estoque
                                SET e.quantidade = e.quantidade + i.quantidade WHERE i.venda_id = :id")->execute([":id" => $id]);
            }
        }
        if ($se !== "") {
            $upd = $conn->prepare("UPDATE envios SET status_envio = :s, data_envio = IF(:s2 IN ('Enviado','Em trânsito','Entregue') AND data_envio IS NULL, NOW(), data_envio),
                                   data_entrega = IF(:s3 = 'Entregue', NOW(), data_entrega) WHERE venda_id = :id");
            $upd->execute([":s" => $se, ":s2" => $se, ":s3" => $se, ":id" => $id]);
        }
        $conn->commit();
        responder(["sucesso" => true, "mensagem" => "Pedido atualizado."]);
    }

    // ---------- período ----------
        $hoje = date("Y-m-d");
        $de  = $_GET["de"]  ?? date("Y-m-01");
        $ate = $_GET["ate"] ?? $hoje;
        if (!data_ok($de) || !data_ok($ate)) responder(["sucesso" => false, "mensagem" => "Datas inválidas."], 400);
        if ($de > $ate) { [$de, $ate] = [$ate, $de]; }
        $p = [":de" => $de . " 00:00:00", ":ate" => $ate . " 23:59:59"];

    // ---------- CSV ----------
        if (($_GET["exportar"] ?? "") === "csv") {
            $st = $conn->prepare("SELECT v.id_vendas, v.data_venda, c.nome AS cliente, f.nome AS forma, v.status_venda, v.subtotal, v.desconto, v.frete, v.preco_total, e.status_envio, e.codigo_rastreio
                              FROM venda v LEFT JOIN usuario_cliente c ON c.id_cliente = v.cliente_id
                              LEFT JOIN forma_pagamento f ON f.id_forma_pagamento = v.forma_pagamento_id
                              LEFT JOIN envios e ON e.venda_id = v.id_vendas
                              WHERE v.data_venda BETWEEN :de AND :ate ORDER BY v.id_vendas DESC");
            $st->execute($p);
            header("Content-Type: text/csv; charset=UTF-8");
            header("Content-Disposition: attachment; filename=pedidos_{$de}_a_{$ate}.csv");
            $out = fopen("php://output", "w");
            fwrite($out, "\xEF\xBB\xBF"); // para o Excel abrir com acentos
            fputcsv($out, ["Pedido", "Data", "Cliente", "Pagamento", "Status", "Subtotal", "Desconto", "Frete", "Total", "Entrega", "Rastreio"], ";");
            while ($l = $st->fetch(PDO::FETCH_NUM)) {
                // evita que uma célula comece com = + - @ (fórmula no Excel)
                $l = array_map(fn($x) => is_string($x) && $x !== "" && strpos("=+-@", $x[0]) !== false ? "'" . $x : $x, $l);
                fputcsv($out, $l, ";");
            }
            fclose($out);
            exit();
    }

        // ---------- resumo ----------
        $st = $conn->prepare("SELECT COUNT(*) AS pedidos, COALESCE(SUM(v.preco_total),0) 
        AS faturamento FROM venda v WHERE v.data_venda BETWEEN :de AND :ate AND " . SO_VALIDAS);
    
        $st->execute($p);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        $st = $conn->prepare("SELECT COALESCE(SUM(i.quantidade),0) FROM itens_venda i INNER JOIN 
        venda v ON v.id_vendas = i.venda_id WHERE v.data_venda BETWEEN :de AND :ate AND " . SO_VALIDAS);
    
        $st->execute($p);
        $itens = (int) $st->fetchColumn();
        $pedidos = (int) $r["pedidos"];
        $fat = (float) $r["faturamento"];
        $resumo = ["pedidos" => $pedidos, "faturamento" => $fat, "ticket_medio" => $pedidos ? $fat / $pedidos : 0, "itens" => $itens];

    // ---------- por dia ----------
        $st = $conn->prepare("SELECT DATE(v.data_venda) AS dia, COUNT(*) AS pedidos, SUM(v.preco_total) AS total FROM venda v
                          WHERE v.data_venda BETWEEN :de AND :ate AND " . SO_VALIDAS . " GROUP BY DATE(v.data_venda) ORDER BY dia");
        $st->execute($p);
        $porDia = $st->fetchAll(PDO::FETCH_ASSOC);

    // ---------- por forma de pagamento ----------
        $st = $conn->prepare("SELECT COALESCE(f.nome,'Não informado') AS forma, COUNT(*) AS pedidos, SUM(v.preco_total) 
        AS total FROM venda v LEFT JOIN forma_pagamento f ON f.id_forma_pagamento = v.forma_pagamento_id
        WHERE v.data_venda BETWEEN :de AND :ate AND " . SO_VALIDAS . " GROUP BY forma ORDER BY total DESC");
    
        $st->execute($p);
        $porPagamento = $st->fetchAll(PDO::FETCH_ASSOC);

    // ---------- mais vendidos ----------
        $st = $conn->prepare("SELECT e.nome_produto AS produto, SUM(i.quantidade) AS quantidade, SUM(i.quantidade * i.preco_unitario) AS total
        FROM itens_venda i INNER JOIN venda v ON v.id_vendas = i.venda_id INNER JOIN estoque e ON e.id_estoque = i.produto_id
        WHERE v.data_venda BETWEEN :de AND :ate AND " . SO_VALIDAS . " GROUP BY e.id_estoque, e.nome_produto ORDER BY quantidade DESC LIMIT 10");
        $st->execute($p);

        $topProdutos = $st->fetchAll(PDO::FETCH_ASSOC);

    // ---------- estoque baixo ----------
        $limite = max(0, (int) carregar_config($conn)["estoque_baixo"]);
        $st = $conn->prepare("SELECT nome_produto AS produto, quantidade FROM estoque WHERE ativo = 1 AND quantidade <= :l ORDER BY quantidade ASC, nome_produto LIMIT 15");
        $st->execute([":l" => $limite]);
        $estoqueBaixo = $st->fetchAll(PDO::FETCH_ASSOC);

    // ---------- pedidos do período ----------
        $st = $conn->prepare("SELECT v.id_vendas AS id, v.data_venda, c.nome AS cliente, f.nome AS forma, v.preco_total, v.status_venda,
        e.status_envio, e.codigo_rastreio FROM venda v LEFT JOIN usuario_cliente c ON c.id_cliente = v.cliente_id
        LEFT JOIN forma_pagamento f ON f.id_forma_pagamento = v.forma_pagamento_id LEFT JOIN envios e ON e.venda_id = v.id_vendas
        WHERE v.data_venda BETWEEN :de AND :ate ORDER BY v.id_vendas DESC LIMIT 100");
    
        $st->execute($p);
        $listaPedidos = $st->fetchAll(PDO::FETCH_ASSOC);

        responder([
            "sucesso" => true, "de" => $de, "ate" => $ate, "resumo" => $resumo, "por_dia" => $porDia,
            "por_pagamento" => $porPagamento, "top_produtos" => $topProdutos, "estoque_baixo" => $estoqueBaixo,
            "limite_estoque" => $limite, "pedidos" => $listaPedidos,
            "status_venda" => STATUS_VENDA, "status_envio" => STATUS_ENVIO,
        ]);
} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
        error_log($e->getMessage());
        responder(["sucesso" => false, "mensagem" => "Erro ao gerar o relatório. Rode o arquivo 'Comando SQL - Atualizacao do banco.sql'."], 500);
}
