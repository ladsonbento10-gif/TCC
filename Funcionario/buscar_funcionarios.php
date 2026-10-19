<?php
    header('Content-Type: application/json; charset=utf-8');

    include("../conexao_tcc.php");

    try {
        $sql = "SELECT funcionario.nome, funcionario.cpf, funcionario.email, funcionario.telefone, 
                   funcionario.data_nascimento, funcionario.data_admissao, funcionario.salario,
                   funcionario.ativo, cargo.nome AS nome_cargo
                FROM funcionario 
                INNER JOIN cargo ON funcionario.cargo_id = cargo.id_cargo 
                ORDER BY funcionario.id_funcionario DESC";
    
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $funcionarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Transforma os dados em JSON e entrega para o HTML
        echo json_encode($funcionarios);

    }catch (PDOException $e) {
        echo json_encode(["erro" => $e->getMessage()]);
    }
?>
