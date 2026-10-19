<?php
// listar_clientes.php - devolve em JSON a lista de clientes (apenas para administrador logado)
session_start();
include("../conexao_tcc.php");

header("Content-Type: application/json; charset=UTF-8");

if (!isset($_SESSION['id_admin'])) {
    http_response_code(401);
    echo json_encode(["sucesso" => false, "mensagem" => "Acesso negado. Faça login como administrador."]);
    exit();
}

// Quantidade por página: só aceita 10 ou 20
$porPagina = (int) ($_GET['por_pagina'] ?? 10);
if (!in_array($porPagina, [10, 20], true)) {
    $porPagina = 10;
}

$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$busca  = trim($_GET['busca'] ?? "");

try {
    $where  = "";
    $params = [];
    if ($busca !== "") {
        $where = "WHERE c.nome LIKE :busca OR c.cpf LIKE :busca OR c.email LIKE :busca";
        $params[":busca"] = "%" . $busca . "%";
    }

    // Total de clientes (para a paginação)
    $stmt = $conn->prepare("SELECT COUNT(*) FROM usuario_cliente c $where");
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();

    $totalPaginas = max(1, (int) ceil($total / $porPagina));
    if ($pagina > $totalPaginas) {
        $pagina = $totalPaginas;
    }
    $offset = ($pagina - 1) * $porPagina;

    // Dados pessoais, telefone e endereço (a senha NUNCA é enviada)
    $sql = "SELECT c.id_cliente, c.nome, c.cpf, c.email, c.data_nascimento,
                   t.dd_fone, t.numero_fone,
                   e.rua, e.numero, e.complemento, e.cep,
                   b.nome_bairro, ci.nome_cidades, es.nome_estados
            FROM usuario_cliente c
            LEFT JOIN telefone_cliente t ON t.id_telefone = (
                SELECT MIN(t2.id_telefone) FROM telefone_cliente t2 WHERE t2.cliente_id = c.id_cliente)
            LEFT JOIN endereco_cliente e ON e.id_endereco = (
                SELECT MIN(e2.id_endereco) FROM endereco_cliente e2 WHERE e2.cliente_id = c.id_cliente)
            LEFT JOIN bairro b   ON b.id_bairro  = e.bairro_id
            LEFT JOIN cidade ci  ON ci.id_cidade = b.cidade_id
            LEFT JOIN estado es  ON es.id_estado = ci.estado_id
            $where
            ORDER BY c.id_cliente DESC
            LIMIT :limite OFFSET :offset";

    $stmt = $conn->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(":limite", $porPagina, PDO::PARAM_INT);
    $stmt->bindValue(":offset", $offset, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        "sucesso"       => true,
        "clientes"      => $stmt->fetchAll(PDO::FETCH_ASSOC),
        "total"         => $total,
        "pagina"        => $pagina,
        "por_pagina"    => $porPagina,
        "total_paginas" => $totalPaginas
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["sucesso" => false, "mensagem" => "Erro ao listar clientes: " . $e->getMessage()]);
}
?>