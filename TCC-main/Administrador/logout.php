<?php
    session_start();
    $_SESSION = [];
    session_destroy();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Saindo...</title>
</head>
<body>
    <script>
        localStorage.removeItem("nomeAdmin");
        window.location.replace("../Cliente/Pagina_de_Login_Cliente.html");
    </script>
</body>
</html>
