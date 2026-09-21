<?php

include("../conexao_tcc.php");

header("Content-Type: application/json; charset=UTF-8");

$acao = $_REQUEST["acao"] ?? "";
// CARREGAR MARCAS E CATEGORIAS
if ($acao === "dados") {
    try {
        $sqlMarcas = "SELECT id_marca, nome FROM marca ORDER BY nome";

        $stmtMarcas = $conn->prepare($sqlMarcas);
        $stmtMarcas->execute();
        $marcas = $stmtMarcas->fetchAll(PDO::FETCH_ASSOC);

        $sqlCategorias = "SELECT id_categoria, nome FROM categoria ORDER BY nome";

        $stmtCategorias = $conn->prepare($sqlCategorias);
        $stmtCategorias->execute();
        $categorias = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(["sucesso" => true, "marcas" => $marcas,"categorias" => $categorias]);
        exit();

    }catch(PDOException $e){
        echo json_encode(["sucesso" => false, "mensagem" => "Erro ao carregar dados: ".$e->getMessage()]);
        exit();
    }
}
// Salvar Marcar
if ($acao === "salvar_marca"){
    $nome = trim($_POST["nome"] ?? "");

    if($nome === ""){
        echo json_encode(["sucesso" => false, "mensagem" => "Digite o nome da marca."]);
        exit();
    }
    try{
        $sql = "INSERT INTO marca (nome) VALUES (:nome)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":nome",$nome);
        $stmt->execute();

        echo json_encode(["sucesso" => true, "mensagem" => "Marca cadastrada com sucesso!"]);
        exit();
    }catch(PDOException $e){
        echo json_encode(["sucesso" => false, "mensagem" => "Erro ao cadastrar marca: " .$e->getMessage()]);
        exit();
    }
}
if($acao === "salvar_categoria"){

    $nome = trim($_POST["nome"] ?? "");
    if($nome === ""){

        echo json_encode(["sucesso" => false, "mensagem" => "Digite o nome da categoria."]);
        exit();
    }
    try{

        $sql = "INSERT INTO categoria (nome) VALUES (:nome)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":nome",$nome);
        $stmt->execute();

        echo json_encode(["sucesso" => true, "mensagem" => "Categoria cadastrada com sucesso!"]);
        exit();


    }catch(PDOException $e){
        echo json_encode(["sucesso" => false, "mensagem" => "Erro ao cadastrar categoria: ".$e->getMessage()]);
        exit();
    }
}
// SALVAR PRODUTO
if($acao === "salvar_produto"){

    $nomeProduto = trim($_POST["nome_produto"] ?? "");
    $descricao = trim($_POST["descricao"] ?? "");
    $marcaId = (int)($_POST["marca_id"] ?? 0);
    $categoriaId = (int)($_POST["categoria_id"] ?? 0);
    $quantidade = (int)($_POST["quantidade"] ?? 0);
    $preco = (float)($_POST["preco"] ?? 0);
    $ativo = isset($_POST["ativo"]) ? (int)$_POST["ativo"]: 1;

    // VALIDAÇÃO
    if ($nomeProduto === ""){
        echo json_encode(["sucesso" => false, "mensagem" => "Digite o nome do produto."]);
        exit();
    }
    if($marcaId <= 0){
        echo json_encode(["sucesso" => false, "mensagem" => "Selecione uma marca."]);
        exit();
    }
    if($categoriaId <= 0){
        echo json_encode(["sucesso" => false, "mensagem" => "Selecione uma categoria."]);
        exit();
    }
    if ($quantidade < 0){
        echo json_encode(["sucesso" => false, "mensagem" => "A quantidade não pode ser negativa."]);
        exit();
    }
    if($preco < 0){
        echo json_encode(["sucesso" => false, "mensagem" => "O preço não pode ser negativo."]);
        exit();
    }
    try{
        $sql = "INSERT INTO estoque(nome_produto, descricao, marca_id, quantidade, preco, categoria_id, ativo,
        data_cadastro,ultima_atualizacao) VALUES (:nome_produto, :descricao, :marca_id, :quantidade, :preco, 
        :categoria_id, :ativo, NOW(), NOW() )";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":nome_produto", $nomeProduto);
        $stmt->bindParam(":descricao",$descricao);
        $stmt->bindParam(":marca_id", $marcaId, PDO::PARAM_INT);
        $stmt->bindParam(":quantidade",$quantidade, PDO::PARAM_INT);
        $stmt->bindParam(":preco",$preco);
        $stmt->bindParam(":categoria_id",$categoriaId,PDO::PARAM_INT);
        $stmt->bindParam(":ativo",$ativo, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(["sucesso" => true,"mensagem" => "Produto cadastrado com sucesso!"]);
        exit();
    }catch(PDOException $e){
        echo json_encode(["sucesso" => false,"mensagem" => "Erro ao cadastrar produto: " . $e->getMessage()]);
        exit();
    }
}
// LISTAR PRODUTOS
if ($acao === "produtos"){
    try{
        $sql = "SELECT e.id_estoque, e.nome_produto, e.descricao,e.quantidade, e.preco, e.ativo, e.data_cadastro,
            c.nome AS categoria, m.nome AS marca FROM estoque e INNER JOIN categoria c ON e.categoria_id = c.id_categoria
            INNER JOIN marca m ON e.marca_id = m.id_marca ORDER BY e.id_estoque DESC";
            
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["sucesso" => true, "produtos" => $produtos]);

        exit();
    }catch(PDOException $e){

        echo json_encode(["sucesso" => false, "mensagem" => "Erro ao listar produtos: " .$e->getMessage()]);
        exit();
    }
}
// AÇÃO INVÁLIDA
echo json_encode([ "sucesso" => false, "mensagem" => "Ação inválida."]);
?>