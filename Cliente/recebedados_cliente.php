<?php
    session_start(); 
    include ("../conexao_tcc.php");
    
    $login = $_POST["cpf_gmail"] ?? '';
    $senha = $_POST["senha"] ?? '';

    if (empty($login) || empty($senha)) {
        echo "<script>alert('⚠️ Preencha todos os campos!');history.back();</script>";
        exit();
    }

    try {
        $sql = "SELECT * FROM usuario_cliente WHERE cpf = :login OR email = :login";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':login', $login);
        $stmt->execute();
    
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
    
        if ($cliente) {
            
            // Verifica a senha descriptografada
            if (password_verify($senha, $cliente['senha'])) {
                
                session_regenerate_id(true);
                $_SESSION['id_cliente'] = $cliente['id_cliente']; 
                $_SESSION['nome'] = $cliente['nome'];

                // json_encode protege contra aspas/tags no nome (antes quebrava ou abria brecha de XSS)
                $f = JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE;
                $nomeJs = json_encode($cliente['nome'], $f);
                $idJs   = json_encode((string) $cliente['id_cliente'], $f);

                echo "
                <script>
                    localStorage.setItem('nomeCliente', $nomeJs);
                    localStorage.setItem('idCliente', $idJs);
                    alert('✅ Login efetuado com sucesso!');
                    window.location.href='Area_do_Cliente.html'; 
                </script>";
                exit();
            }else{
                echo "<script>alert('❌ Senha incorreta!');history.back();</script>";
                exit();
            }
        }else{
            echo "<script>alert('❌ Usuário não encontrado!');history.back();</script>";
            exit();
        }
    }catch(PDOException $e) {
        echo "Erro ao consultar o banco: " . $e->getMessage();
    }
?>