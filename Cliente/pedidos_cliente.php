<?php
// pedidos_cliente.php - pedidos do cliente logado.
//   GET                          -> lista (mais recentes primeiro)
//   POST {acao:"reenviar", id}   -> envia o comprovante por e-mail de novo
    include("cliente_comum.php");
    include("pedido_helper.php");
    $idCliente = exigir_cliente();

    try{
        if ($_SERVER["REQUEST_METHOD"] === "POST") {
            $j = ler_json();
            if (($j["acao"] ?? "") !== "reenviar") responder(["sucesso" => false, "mensagem" => "Ação inválida."], 400);
            $id = (int) ($j["id"] ?? 0);
            if (!buscar_pedido($conn, $id, $idCliente)) responder(["sucesso" => false, "mensagem" => "Pedido não encontrado."], 404);
            $status = enviar_comprovante($conn, $id, $idCliente);
            responder(["sucesso" => true, "email" => $status]);
        }

        $ids = $conn->prepare("SELECT id_vendas FROM venda WHERE cliente_id = :c ORDER BY id_vendas DESC LIMIT 50");
        $ids->execute([":c" => $idCliente]);
        $pedidos = [];
        foreach ($ids->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $pedidos[] = buscar_pedido($conn, (int) $id, $idCliente);
        }
        responder(["sucesso" => true, "pedidos" => $pedidos]);
    }catch(PDOException $e){
        error_log($e->getMessage());
        responder(["sucesso" => false, "mensagem" => "Não foi possível carregar os pedidos."], 500);
    }
?>