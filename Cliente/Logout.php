<?php
session_start();
$_SESSION = [];
session_destroy();
header("Location: Pagina_de_Login_Cliente.html");
exit();