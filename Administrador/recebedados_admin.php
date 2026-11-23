<?php
// recebedados_admin.php
    session_start();
    INCLUDE ("../conexao_tcc.php");

    $usuario = $_POST['usuario'];
    $senha = $_POST['senha'];

    $sql = "SELECT * FROM usuario_admin WHERE nome = :nome";

    $stmt = $conn->prepare($sql);
    $stmt->bindParam(':nome', $usuario);
    $stmt->execute();

    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($admin) {

        if (password_verify($senha, $admin['senha'])) {

            $_SESSION['id_admin'] = $admin['id_admin'];
            $_SESSION['nome'] = $admin['nome'];

           echo "<script>
                    localStorage.setItem('nomeAdmin', " . json_encode($admin['nome'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ");
                    alert('Login efetuado com sucesso!');
                    window.location.href='Area_do_Admin.html';
                </script>";
            exit();
        }else{
            echo "<script>alert('Senha incorreta!');history.back();</script>";
        }
    }else{
        echo "<script>alert('Usuário não encontrado!');history.back();</script>";
    }
?>