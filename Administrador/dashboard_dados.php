<?php
// dashboard_dados.php - devolve em JSON os dados do painel principal (somente administrador logado).
// O painel (admin_painel.js) consulta este arquivo a cada poucos segundos para atualizar em tempo real.
session_start();
include("../conexao_tcc.php");

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store");

if (!isset($_SESSION['id_admin'])) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Acesso negado. Faça login como administrador."]);
    exit();
}

// Quantidade igual ou abaixo da qual o produto é considerado com estoque baixo.
const LIMITE_ESTOQUE_BAIXO = 10;

try {
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ---- Cartões ----
    $produtos = (int) $conn->query("SELECT COUNT(*) FROM estoque WHERE ativo = 1")->fetchColumn();
    $clientes = (int) $conn->query("SELECT COUNT(*) FROM usuario_cliente")->fetchColumn();
    $pedidos  = (int) $conn->query("SELECT COUNT(*) FROM vendas
                                    WHERE YEAR(data_venda) = YEAR(CURDATE()) AND MONTH(data_venda) = MONTH(CURDATE())")->fetchColumn();
    $stmt = $conn->prepare("SELECT COUNT(*) FROM estoque WHERE ativo = 1 AND quantidade <= :lim");
    $stmt->execute([":lim" => LIMITE_ESTOQUE_BAIXO]);
    $estoqueBaixo = (int) $stmt->fetchColumn();

    // ---- Vendas dos últimos 6 meses (ignora vendas canceladas/estornadas se a coluna existir) ----
    $temStatus = (int) $conn->query("SELECT COUNT(*) FROM information_schema.COLUMNS
                                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendas'
                                       AND COLUMN_NAME = 'status_venda'")->fetchColumn() > 0;
    $filtroStatus = $temStatus ? "AND (status_venda IS NULL OR status_venda NOT IN ('Cancelado','Estornado'))" : "";

    $inicio = date("Y-m-01", strtotime("-5 months"));
    $stmt = $conn->prepare("SELECT DATE_FORMAT(data_venda, '%Y-%m') AS mes, SUM(preco_total) AS total
                            FROM vendas
                            WHERE data_venda >= :inicio $filtroStatus
                            GROUP BY mes");
    $stmt->execute([":inicio" => $inicio]);
    $porMes = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $nomesMes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    $labels = [];
    $valores = [];
    for ($i = 5; $i >= 0; $i--) {
        $ts = strtotime("first day of -$i months");
        $labels[]  = $nomesMes[(int) date("n", $ts) - 1];
        $valores[] = (float) ($porMes[date("Y-m", $ts)] ?? 0);
    }

    // ---- Produtos recentes ----
    $produtosRecentes = $conn->query(
        "SELECT e.id_estoque AS id, e.nome_produto AS produto, m.nome AS marca, c.nome AS categoria, e.quantidade AS estoque
         FROM estoque e
         LEFT JOIN marca m     ON m.id_marca = e.marca_id
         LEFT JOIN categoria c ON c.id_categoria = e.categoria_id
         WHERE e.ativo = 1
         ORDER BY e.id_estoque DESC
         LIMIT 5"
    )->fetchAll(PDO::FETCH_ASSOC);

    // ---- Atividades recentes e notificações ----
    $atividades = [];

    $rows = $conn->query("SELECT nome_produto, data_cadastro FROM estoque ORDER BY id_estoque DESC LIMIT 4")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        $atividades[] = ["tipo" => "produto", "texto" => "Novo produto cadastrado: " . $r["nome_produto"], "data" => $r["data_cadastro"]];
    }

    $rows = $conn->query("SELECT v.id_vendas, v.data_venda, v.preco_total, c.nome
                          FROM vendas v LEFT JOIN usuario_cliente c ON c.id_cliente = v.cliente_id
                          ORDER BY v.id_vendas DESC LIMIT 4")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        $atividades[] = [
            "tipo"  => "pedido",
            "texto" => "Pedido #" . $r["id_vendas"] . " realizado por " . ($r["nome"] ?? "cliente"),
            "data"  => $r["data_venda"],
            "extra" => "R$ " . number_format((float) $r["preco_total"], 2, ",", ".")
        ];
    }

    $stmt = $conn->prepare("SELECT id_estoque, nome_produto, quantidade, ultima_atualizacao FROM estoque
                            WHERE ativo = 1 AND quantidade <= :lim ORDER BY quantidade ASC, id_estoque DESC LIMIT 6");
    $stmt->execute([":lim" => LIMITE_ESTOQUE_BAIXO]);
    $baixos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($baixos as $r) {
        $atividades[] = ["tipo" => "estoque", "texto" => "Estoque baixo: " . $r["nome_produto"], "data" => $r["ultima_atualizacao"]];
    }

    $clientesNovos = $conn->query("SELECT id_cliente, nome FROM usuario_cliente ORDER BY id_cliente DESC LIMIT 3")->fetchAll(PDO::FETCH_ASSOC);

    usort($atividades, fn($a, $b) => strcmp($b["data"] ?? "", $a["data"] ?? ""));
    $atividades = array_slice($atividades, 0, 5);

    // Notificações (sininho): cada uma tem um tipo, um título e a descrição do que aconteceu.
    $notificacoes = [];
    foreach ($baixos as $r) {
        $qtd = (int) $r["quantidade"];
        $notificacoes[] = [
            "chave"     => "est-" . $r["id_estoque"] . "-" . $qtd,
            "tipo"      => $qtd === 0 ? "esgotado" : "estoque_baixo",
            "titulo"    => $qtd === 0 ? "Produto esgotado" : "Estoque baixo",
            "descricao" => $qtd === 0
                ? $r["nome_produto"] . " está sem unidades em estoque."
                : $r["nome_produto"] . ": restam apenas " . $qtd . " unidade(s).",
            "data"      => $r["ultima_atualizacao"]
        ];
    }
    $rows = $conn->query("SELECT v.id_vendas, v.data_venda, v.preco_total, c.nome
                          FROM vendas v LEFT JOIN usuario_cliente c ON c.id_cliente = v.cliente_id
                          WHERE v.data_venda >= (NOW() - INTERVAL 7 DAY)
                          ORDER BY v.id_vendas DESC LIMIT 4")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) {
        $notificacoes[] = [
            "chave"     => "ped-" . $r["id_vendas"],
            "tipo"      => "novo_pedido",
            "titulo"    => "Novo pedido",
            "descricao" => "Pedido #" . $r["id_vendas"] . " de " . ($r["nome"] ?? "cliente") . " no valor de R$ " . number_format((float) $r["preco_total"], 2, ",", "."),
            "data"      => $r["data_venda"]
        ];
    }
    foreach ($clientesNovos as $r) {
        $notificacoes[] = [
            "chave"     => "cli-" . $r["id_cliente"],
            "tipo"      => "novo_cliente",
            "titulo"    => "Novo cliente",
            "descricao" => $r["nome"] . " se cadastrou no sistema.",
            "data"      => null
        ];
    }
    usort($notificacoes, fn($a, $b) => strcmp($b["data"] ?? "", $a["data"] ?? ""));
    $notificacoes = array_slice($notificacoes, 0, 10);

    echo json_encode([
        "sucesso"           => true,
        "gerado_em"         => date("Y-m-d H:i:s"),
        "limite_baixo"      => LIMITE_ESTOQUE_BAIXO,
        "cartoes"           => ["produtos" => $produtos, "clientes" => $clientes, "pedidos" => $pedidos, "estoque_baixo" => $estoqueBaixo],
        "vendas"            => ["labels" => $labels, "valores" => $valores],
        "produtos_recentes" => $produtosRecentes,
        "atividades"        => $atividades,
        "notificacoes"      => $notificacoes
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao carregar o painel: " . $e->getMessage()]);
}
?>
