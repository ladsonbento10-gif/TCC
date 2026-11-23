<?php
// Diz à Área do Cliente quem está logado (lê a sessão criada em recebedados_cliente.php)
    session_start();
    header("Content-Type: application/json; charset=utf-8");    
    header("Cache-Control: no-store, no-cache, must-revalidate");

    if (empty($_SESSION['id_cliente'])) {
        http_response_code(401);
        echo json_encode(['logado' => false]);
        exit();
    }

    include ("../conexao_tcc.php");

    try{
        $stmt = $conn->prepare("SELECT id_cliente, nome, cpf, email FROM usuario_cliente WHERE id_cliente = :id");
        $stmt->bindParam(':id', $_SESSION['id_cliente']);
        $stmt->execute();
        $c = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$c) { // conta apagada: encerra a sessão
            $_SESSION = [];
            session_destroy();
            http_response_code(401);
            echo json_encode(['logado' => false]);
            exit();
        }

// Primeiro telefone e primeiro endereço cadastrados (usados para preencher a entrega)
        $tel = $conn->prepare("SELECT dd_fone, numero_fone FROM telefone_cliente WHERE cliente_id = :id ORDER BY id_telefone LIMIT 1");
        $tel->execute([':id' => $c['id_cliente']]);
        $t = $tel->fetch(PDO::FETCH_ASSOC) ?: [];

        $end = $conn->prepare("SELECT e.rua, e.numero, e.complemento, e.cep, b.nome_bairro AS bairro, ci.nome_cidades AS cidade, es.uf
        FROM endereco_cliente e LEFT JOIN bairro b  ON b.id_bairro = e.bairro_id LEFT JOIN cidade ci ON ci.id_cidade = b.cidade_id
        LEFT JOIN estado es ON es.id_estado = ci.estado_id WHERE e.cliente_id = :id ORDER BY e.id_endereco LIMIT 1");
        
        $end->execute([':id' => $c['id_cliente']]);
        $e = $end->fetch(PDO::FETCH_ASSOC) ?: [];
        if (($e['uf'] ?? '') === 'XX') $e['uf'] = ''; // UF desconhecida: o cliente preenche na entrega

        echo json_encode([
            'logado'   => true,
            'id'       => (string) $c['id_cliente'],
            'nome'     => $c['nome'],
            'cpf'      => $c['cpf'] ?? '',
            'email'    => $c['email'] ?? '',
            'telefone' => trim(($t['dd_fone'] ?? '') . ' ' . ($t['numero_fone'] ?? '')),
            'endereco' => $e ?: null
        ], JSON_UNESCAPED_UNICODE);
    } catch(PDOException $e){
        error_log($e->getMessage());
        http_response_code(500);
        echo json_encode(['logado' => false, 'erro' => 'banco']);
    }
?>