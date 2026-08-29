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
                
                // Salva os dados na sessão usando as colunas exatas do seu banco de dados
                $_SESSION['id_cliente'] = $cliente['id_cliente']; 
                $_SESSION['nome'] = $cliente['nome'];
    
                // Redirecionamento (Ajuste o nome do arquivo .html/.php para a página correta do cliente)
                echo "
                <script>
                    localStorage.setItem('nomeCliente', '".$cliente['nome']."');
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