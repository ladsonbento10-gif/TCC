<?php 
    include("../conexao_tcc.php");

    if($_SERVER['REQUEST_METHOD'] == 'POST'){ 

        $tipo = $_POST['tipo_usuario'] ?? null;
        try{
            $conn->beginTransaction();
        // ADMINISTRADOR
            if ($tipo === "administrador"){
        // Dados
                $nome = trim($_POST['nome']);
                $email = trim($_POST['email']);
                $cargo_id = (int) ($_POST['cargo_id'] ?? 0);

                $senha = $_POST['senha'];
                $senha_confirmacao = $_POST['senha_confirmacao'];
        // Validações
                if(empty($nome) || empty($email) || empty($cargo_id)){
                    echo "Preencha todos os campos!";
                    exit;
                }
                if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
                    echo "Email inválido!";
                    exit;
                }
                if(strlen($senha) < 8){
                    echo "A senha deve ter no mínimo 8 caracteres!";
                    exit;
                }
                if($senha !== $senha_confirmacao){
                    echo "As senhas não coincidem!";
                    exit;
                }
        // Verifica Email
                $sql = "SELECT id_admin FROM usuario_admin WHERE email = :email";

                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":email", $email);
                $stmt->execute();

                if($stmt->fetch()){
                    echo "Email já cadastrado!";
                    exit;
                } 
        // Hash senha
                $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
        // Garante Departamento
                $departamento_id = 1;

                $sql = "SELECT id_departamento FROM departamento WHERE id_departamento = :id";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":id", $departamento_id, PDO::PARAM_INT);
                $stmt->execute();

                if(!$stmt->fetchColumn()){
                    $sql = "INSERT INTO departamento (id_departamento, nome) VALUES (1, 'Administrativo')";
                    $conn->exec($sql);
                }
        // Verifica Cargo
                $sql = "SELECT id_cargo FROM cargo WHERE id_cargo = :id";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":id", $cargo_id, PDO::PARAM_INT);
                $stmt->execute();

                if(!$stmt->fetchColumn()){

                    $cargos = [1 => "Administrador", 2 => "Gerente", 3 => "Funcionário"];

                    if(!isset($cargos[$cargo_id])){
                        echo "Cargo inválido!";
                        exit;
                    }

                    $sql = "INSERT INTO cargo (id_cargo, nome, departamento_id) VALUES (:id, :nome, :departamento)";
                    $stmt = $conn->prepare($sql);
                    $stmt->bindParam(":id", $cargo_id, PDO::PARAM_INT);
                    $stmt->bindParam(":nome", $cargos[$cargo_id]);
                    $stmt->bindParam(":departamento", $departamento_id, PDO::PARAM_INT);
                    $stmt->execute();
                }
        // Insere Admin 
                $sql = "INSERT INTO usuario_admin (nome, email, cargo_id, senha) VALUES (:nome, :email, :cargo_id, :senha)";

                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":nome", $nome);
                $stmt->bindParam(":email", $email);
                $stmt->bindParam(":cargo_id", $cargo_id, PDO::PARAM_INT);
                $stmt->bindParam(":senha", $senha_hash);
                $stmt->execute();
                $conn->commit();
                header("Location: ../Administrador/Pagina_de_login_Administrador.html");
                exit;
            }
        // Cliente
            else if($tipo === "cliente"){
        // Dados
                $nome = trim($_POST['nome']);
                $cpf = preg_replace('/[^0-9]/', '', $_POST['cpf']);
                $email = trim($_POST['email']);
                $telefone = trim($_POST['telefone']);
                $data_nascimento = $_POST['data_nascimento'];

                $estado_nome = trim($_POST['estado']);
                $cidade_nome = trim($_POST['cidade']);
                $bairro_nome = trim($_POST['bairro']);

                $rua = trim($_POST['endereco'] ?? '');
                $numero = trim($_POST['numero_casa'] ?? '');    
                $complemento = trim($_POST['complemento'] ?? '');
                $cep = trim($_POST['cep'] ?? '');

                $senha = $_POST['senha'];
                $senha_confirmacao = $_POST['senha_confirmacao'];

        // Validações

                if( empty($nome) || empty($cpf) ||empty($email) || empty($estado_nome) 
                    || empty($cidade_nome) || empty($bairro_nome) 
                ){
                    echo "Preencha todos os campos obrigatórios!";
                    exit;
                }
                if(strlen($cpf) != 11){
                    echo "CPF inválido!";
                    exit;
                }
                if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
                    echo "Email inválido!";
                    exit;
                }
                if(strlen($senha) < 8){
                    echo "A senha deve ter no mínimo 8 caracteres!";
                    exit;
                }
                if($senha !== $senha_confirmacao){
                    echo "As senhas não coincidem!";
                    exit;
                }
        // Verifica CPF
                $sql = "SELECT id_cliente FROM usuario_cliente WHERE cpf = :cpf";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":cpf", $cpf);
                $stmt->execute();

                if($stmt->fetch()){
                    echo "CPF já cadastrado!";
                    exit;
                }
        // Verifica Email
                $sql = "SELECT id_cliente FROM usuario_cliente WHERE email = :email";

                $stmt = $conn->prepare($sql);

                $stmt->bindParam(":email", $email);

                $stmt->execute();

                if($stmt->fetch()){
                    echo "Email já cadastrado!";
                    exit;
                }
        // Hash senha
                $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
                $pais_id = 1;

        // Estado
                $sql = "SELECT id_estado FROM estado WHERE nome_estados = :nome";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":nome", $estado_nome);
                $stmt->execute();
                $estado_id = $stmt->fetchColumn();

                if(!$estado_id){

                    $sql = "INSERT INTO estado (nome_estados, uf, pais_id) VALUES (:nome, 'XX', :pais)";
                    $stmt = $conn->prepare($sql);
                    $stmt->bindParam(":nome", $estado_nome);
                    $stmt->bindParam(":pais", $pais_id, PDO::PARAM_INT);
                    $stmt->execute();
                    $estado_id = $conn->lastInsertId();
                }
        // Cidade
                $sql = "SELECT id_cidade FROM cidade WHERE nome_cidades = :nome AND estado_id = :estado";

                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":nome", $cidade_nome);
                $stmt->bindParam(":estado", $estado_id, PDO::PARAM_INT);
                $stmt->execute();
                $cidade_id = $stmt->fetchColumn();

                if(!$cidade_id){

                    $sql = "INSERT INTO cidade (nome_cidades, estado_id, ibge_code) VALUES (:nome, :estado, 0)";
                    $stmt = $conn->prepare($sql);
                    $stmt->bindParam(":nome", $cidade_nome);
                    $stmt->bindParam(":estado", $estado_id, PDO::PARAM_INT);
                    $stmt->execute();
                    $cidade_id = $conn->lastInsertId();
                }
        // Bairro
                $sql = "SELECT id_bairro FROM bairro WHERE nome_bairro = :nome AND cidade_id = :cidade";
                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":nome", $bairro_nome);
                $stmt->bindParam(":cidade", $cidade_id, PDO::PARAM_INT);
                $stmt->execute();
                $bairro_id = $stmt->fetchColumn();

                if(!$bairro_id){

                    $sql = "INSERT INTO bairro (nome_bairro, cidade_id) VALUES (:nome, :cidade)";
                    $stmt = $conn->prepare($sql);
                    $stmt->bindParam(":nome", $bairro_nome);
                    $stmt->bindParam(":cidade", $cidade_id, PDO::PARAM_INT);
                    $stmt->execute();
                    $bairro_id = $conn->lastInsertId();
                }
        // Insere Cliente
                $sql = "INSERT INTO usuario_cliente (nome, cpf, email, data_nascimento, senha) VALUES (:nome, :cpf, :email, :data_nascimento, :senha)";

                $stmt = $conn->prepare($sql);
                $stmt->bindParam(":nome", $nome);
                $stmt->bindParam(":cpf", $cpf);
                $stmt->bindParam(":email", $email);
                $stmt->bindParam(":data_nascimento", $data_nascimento);
                $stmt->bindParam(":senha", $senha_hash);
                $stmt->execute();

                $cliente_id = $conn->lastInsertId();
        
        // Insere Telefone do CLiente

            if (!empty($telefone)) {
                $telefone_limpo = preg_replace('/[^0-9]/', '', $telefone);
            
            if (strlen($telefone_limpo) >= 10) {

                $dd_fone = substr($telefone_limpo, 0, 2);
                $numero_fone = substr($telefone_limpo, 2);
         
                $sql = "INSERT INTO telefone_cliente (cliente_id, dd_fone, numero_fone) VALUES (:cliente_id, :dd_fone, :numero_fone)";
                $stmt = $conn->prepare($sql);

                $stmt->execute([":cliente_id" => $cliente_id, ":dd_fone" => $dd_fone, ":numero_fone" => $numero_fone ]);
                }
            }

        // Insere Endereço
                $sql = "INSERT INTO endereco_cliente (rua, numero, complemento, cep, bairro_id, cliente_id) VALUES (:rua, :numero, :complemento, :cep, :bairro, :cliente)";

                $stmt = $conn->prepare($sql);

                $stmt->execute([ ":rua" => $rua, ":numero" => $numero, ":complemento" => $complemento, ":cep" => $cep, ":bairro" => $bairro_id, ":cliente" => $cliente_id ]);

                $conn->commit();
                header("Location: ../Cliente/Pagina_de_Login_Cliente.html");
                exit();
            }else{
                echo "Tipo de usuário inválido!";
                exit;
            }
        }catch (PDOException $e){
            if($conn->inTransaction()){
                $conn->rollBack();
            }
            echo "Erro: " . $e->getMessage();
        }
    }
?>