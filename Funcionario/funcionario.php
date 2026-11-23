<?php
    // funcionario.php - funcionários do mercado (somente administrador logado).
    //   GET  ?acao=listar              -> funcionários + cargos
    //   POST acao=salvar  (id opcional) -> cadastra ou altera
    //   POST acao=alternar id=...      -> ativa/desativa (não apaga, para manter o histórico)
    include("../conexao_tcc.php");
    include("../Administrador/controle_acesso.php");
    exigir_admin();

    header("Content-Type: application/json; charset=UTF-8");
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    function responder(array $d, int $codigo = 200): void {
        http_response_code($codigo);
        echo json_encode($d, JSON_UNESCAPED_UNICODE);
        exit();
    }

    function data_valida(?string $d): bool {
        if ($d === null || $d === "") return false;
        $x = DateTime::createFromFormat("Y-m-d", $d);
        return $x && $x->format("Y-m-d") === $d;
    }

    $acao = $_REQUEST["acao"] ?? "listar";

    try {
        if ($acao === "listar") {
            $funcionarios = $conn->query(
                "SELECT f.id_funcionario, f.nome, f.cpf, f.email, f.telefone, f.data_nascimento, f.data_admissao,
                f.salario, f.cargo_id, f.ativo, c.nome AS nome_cargo FROM funcionario f INNER JOIN cargo c 
                ON f.cargo_id = c.id_cargo ORDER BY f.ativo DESC, f.nome ASC"
        )->fetchAll(PDO::FETCH_ASSOC);
        $cargos = $conn->query("SELECT id_cargo, nome FROM cargo ORDER BY nome")->fetchAll(PDO::FETCH_ASSOC);
        responder(["sucesso" => true, "funcionarios" => $funcionarios, "cargos" => $cargos]);
        }

        if ($_SERVER["REQUEST_METHOD"] !== "POST") { responder(["sucesso" => false, "mensagem" => "Método inválido."], 405); }

        if ($acao === "alternar") {
            $id = (int) ($_POST["id"] ?? 0);
            if ($id <= 0) responder(["sucesso" => false, "mensagem" => "Funcionário inválido."], 400);
            $stmt = $conn->prepare("UPDATE funcionario SET ativo = IF(ativo = 1, 0, 1) WHERE id_funcionario = :id");
            $stmt->execute([":id" => $id]);
            responder(["sucesso" => true, "mensagem" => "Situação do funcionário atualizada."]);
        }   

        if ($acao === "salvar") {
            $id         = (int) ($_POST["id"] ?? 0);
            $nome       = trim($_POST["nome"] ?? "");
            $cpfNum     = preg_replace("/\D/", "", $_POST["cpf"] ?? "");
            $email      = trim($_POST["email"] ?? "");
            $telefone   = trim($_POST["telefone"] ?? "");
            $nascimento = trim($_POST["data_nascimento"] ?? "");
            $admissao   = trim($_POST["data_admissao"] ?? "");
            $salario    = str_replace(",", ".", trim($_POST["salario"] ?? ""));
            $cargoId    = (int) ($_POST["cargo_id"] ?? 0);
            $ativo      = ($_POST["ativo"] ?? "1") === "0" ? 0 : 1;

            if ($nome === "" || mb_strlen($nome) > 100) responder(["sucesso" => false, "mensagem" => "Informe o nome (até 100 letras)."], 400);
            if (strlen($cpfNum) !== 11) responder(["sucesso" => false, "mensagem" => "O CPF precisa ter 11 números."], 400);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) responder(["sucesso" => false, "mensagem" => "E-mail inválido."], 400);
            if ($nascimento !== "" && !data_valida($nascimento)) responder(["sucesso" => false, "mensagem" => "Data de nascimento inválida."], 400);
            if (!data_valida($admissao)) responder(["sucesso" => false, "mensagem" => "Informe a data de admissão."], 400);
            if ($salario !== "" && (!is_numeric($salario) || (float) $salario < 0)) responder(["sucesso" => false, "mensagem" => "Salário inválido."], 400);
            if ($cargoId <= 0) responder(["sucesso" => false, "mensagem" => "Escolha o cargo."], 400);

            $cargoOk = $conn->prepare("SELECT COUNT(*) FROM cargo WHERE id_cargo = :c");
            $cargoOk->execute([":c" => $cargoId]);
            if (!(int) $cargoOk->fetchColumn()) responder(["sucesso" => false, "mensagem" => "Cargo inválido."], 400);

            // CPF guardado no formato 000.000.000-00 (igual aos dados que já existem)
            $cpf = substr($cpfNum, 0, 3) . "." . substr($cpfNum, 3, 3) . "." . substr($cpfNum, 6, 3) . "-" . substr($cpfNum, 9, 2);

            $dup = $conn->prepare("SELECT COUNT(*) FROM funcionario WHERE (cpf = :cpf OR email = :email) AND id_funcionario <> :id");
            $dup->execute([":cpf" => $cpf, ":email" => $email, ":id" => $id]);
            if ((int) $dup->fetchColumn() > 0) responder(["sucesso" => false, "mensagem" => "Já existe funcionário com esse CPF ou e-mail."], 409);

            $dados = [
                ":nome" => $nome, ":cpf" => $cpf, ":email" => $email,
                ":telefone" => $telefone !== "" ? $telefone : null,
                ":nasc" => $nascimento !== "" ? $nascimento : null,
                ":adm" => $admissao,
                ":sal" => $salario !== "" ? (float) $salario : null,
                ":cargo" => $cargoId, ":ativo" => $ativo,
            ];
            if ($id > 0) {
                $dados[":id"] = $id;
                $conn->prepare("UPDATE funcionario SET nome=:nome, cpf=:cpf, email=:email, telefone=:telefone, data_nascimento=:nasc,
                data_admissao=:adm, salario=:sal, cargo_id=:cargo, ativo=:ativo WHERE id_funcionario=:id")->execute($dados);
                responder(["sucesso" => true, "mensagem" => "Funcionário atualizado com sucesso!"]);
            }
            $conn->prepare("INSERT INTO funcionario (nome, cpf, email, telefone, data_nascimento, data_admissao, salario, cargo_id, ativo)
            VALUES (:nome, :cpf, :email, :telefone, :nasc, :adm, :sal, :cargo, :ativo)")->execute($dados);
            responder(["sucesso" => true, "mensagem" => "Funcionário cadastrado com sucesso!"]);
            }

        responder(["sucesso" => false, "mensagem" => "Ação inválida."], 400);
    } catch (PDOException $e){
        error_log($e->getMessage());
        responder(["sucesso" => false, "mensagem" => "Erro no banco de dados. Tente novamente."], 500);
    }
?>