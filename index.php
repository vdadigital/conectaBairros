<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conecta Bairros - Empreendedores</title>
    <script src="https://cdn.tailwindcss.com"></script>
    
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
<style>
[hidden]{display:none!important}
.account-bar{display:flex;align-items:center;justify-content:space-between;gap:20px;background:linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);border:none;border-radius:14px;padding:24px;margin-bottom:28px;box-shadow:0 8px 16px rgba(0,0,0,0.15)}
.account-bar h2{font-size:22px;font-weight:700;color:#ffffff}
.account-bar p{font-size:14px;color:#e0e7ff}
.form-help{font-size:14px;color:#475569;margin-bottom:18px}
.account-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.account-actions button{white-space:nowrap;min-height:44px}
.account-actions #btn-logout{padding:10px 16px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;font-weight:600}
.filter-panel{display:flex;flex-direction:column;gap:10px;padding:20px;background:white;border:1px solid #dbe4f1;border-radius:14px;margin-bottom:12px}
.filter-panel label{font-size:14px;font-weight:600;color:#334155}
.filter-panel input[type=search],.filter-panel select{width:100%;min-height:44px;border:1px solid #94a3b8;border-radius:8px;padding:10px;background:#fff}
.search-field{display:grid;gap:8px}
.filter-panel button{min-height:44px}
.my-business{display:flex;gap:10px;align-items:center;padding:8px 0}
.my-business input{width:18px;height:18px}
#resultado-filtros{color:#475569;font-size:14px;margin:12px 0}
#sem-resultados{background:#eff6ff;padding:24px;border-radius:12px;margin-bottom:20px}
a[aria-disabled=true]{pointer-events:none;opacity:.5}
button:disabled{opacity:.65;cursor:wait}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
.comercio-card{min-width:0}
.comercio-nome,.comercio-descricao{overflow-wrap:anywhere}
@media(min-width:640px){.filter-panel{display:grid;grid-template-columns:auto 1fr}.search-field,.my-business{grid-column:1/-1}}
@media(max-width:640px){
    .account-bar{align-items:stretch;flex-direction:column;padding:18px}
    .account-actions{justify-content:space-between}
    header .max-w-6xl{flex-wrap:wrap;gap:12px}
    header .w-2/4{width:100%;order:3}
    header .w-1/4{width:45%}
    header h1{font-size:26px}
}
@media(max-width:640px){body header .max-w-6xl{display:flex!important;flex-wrap:wrap!important;gap:12px!important}body header .w-2\/4{width:100%!important;order:3!important}body header .w-1\/4{width:45%!important}body header h1{font-size:26px!important}}
</style>
</head>
<body class="bg-gray-100">

    <!-- Adicionado sticky, top-0 e z-50 para manter o cabeçalho fixo -->
    <header class="bg-blue-600 text-white p-6 shadow-md mb-8 sticky top-0 z-50">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            
            <div class="w-1/4">
                <img src="assets/img/logo-conecta.png" alt="Logo Conecta Bairros" class="h-16 object-contain" onerror="this.style.display='none'">
            </div>

            <div class="w-2/4 text-center">
                <h1 class="text-3xl font-bold">Conecta Bairros 🏠</h1>
                <p class="mt-2 text-blue-100">Conectando empreendedores locais e a comunidade</p>
            </div>

            <div class="w-1/4 flex justify-end">
                <img src="assets/img/logo-faspec.png" alt="Logo Faspec" class="h-16 object-contain" onerror="this.style.display='none'">
            </div>

        </div>
    </header>

    <main class="max-w-6xl mx-auto p-4">
        
        <div class="account-bar">
            <div>
                <h2>Área do empreendedor</h2>
                <p id="auth-status" role="status" aria-live="polite">Entre com Google para cadastrar e gerenciar seus negócios. A busca é livre.</p>
            </div>
            <div class="account-actions">
                <span id="auth-name" class="font-semibold text-white"></span>
                <button id="btn-logout" type="button" hidden onclick="fazerLogoutGoogle()">Sair da conta</button>
                
                <!-- Botão do Google redesenhado -->
                <button id="btn-login" type="button" onclick="fazerLoginGoogle()" class="bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-center gap-3 transition">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" class="w-5 h-5">
                    Entrar com o Google
                </button>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div class="lg:col-span-2">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">Encontre serviços perto de você</h2><p class="mb-4 text-gray-600">Busque por serviço, estado, cidade ou bairro. Para falar com um negócio, use o botão WhatsApp.</p>
                <div id="filtros" class="filter-panel"><div class="search-field"><label for="input-busca">O que você procura?</label><input id="input-busca" type="search" placeholder="Nome, categoria ou serviço" autocomplete="off"></div>
    <label for="filtro-estado">Estado</label>
    <select id="filtro-estado" class="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none flex-grow">
        <option value="Todos">Todos os Estados</option>
        <option value="AC">Acre</option>
        <!-- ... (estados omitidos para manter o seu código) ... -->
        <option value="SC">Santa Catarina</option>
        <option value="SP">São Paulo</option>
        <option value="SE">Sergipe</option>
        <option value="TO">Tocantins</option>
    </select>
    <label for="filtro-cidade">Cidade</label><input id="filtro-cidade" type="search" placeholder="Todas as cidades"><label for="filtro-bairro">Bairro</label><input id="filtro-bairro" type="search" placeholder="Todos os bairros"><label for="filtro-categoria">Categoria</label><select id="filtro-categoria"><option value="Todos">Todas as categorias</option><option value="Alimentação">Alimentação</option><option value="Serviços">Serviços</option><option value="Varejo">Varejo</option><option value="Saúde">Saúde e Beleza</option><option value="Tecnologia">Tecnologia</option><option value="Comunicação">Jornalismo</option><option value="Outros">Outros</option></select><label class="my-business"><input type="checkbox" id="filtro-meus" disabled> Somente meus negócios</label><button type="button" onclick="limparFiltros()">Limpar filtros</button><button type="button" onclick="filtrarCards()" class="bg-gray-800 text-white font-bold py-2 px-6 rounded hover:bg-gray-900 transition">
        🔍 Filtrar
    </button>
</div>
                <p id="resultado-filtros" role="status" aria-live="polite"></p><p id="sem-resultados" hidden>Nenhum negócio encontrado. Tente outro termo ou limpe os filtros.</p><div id="container-comercios" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-full flex justify-center py-10">
                        <p class="text-gray-500 animate-pulse">Procurando comércios cadastrados...</p>
                    </div>
                </div>
            </div>
<div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit">
                <h2 class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Cadastrar Negócio</h2>
                
                <p id="cadastro-ajuda" class="form-help">Entre com sua conta Google para publicar. Você pode preparar os dados abaixo.</p><form id="form-cadastro"><p class="form-help">O endereço informado será público na página do negócio. Informe o local de atendimento.</p><div class="mb-3"><label for="reg-rua" class="block text-sm font-semibold text-gray-700">Rua / avenida (opcional)</label><input id="reg-rua" maxlength="100" class="mt-1 w-full p-2 border rounded" autocomplete="address-line1"></div><div class="mb-3"><label for="reg-numero" class="block text-sm font-semibold text-gray-700">Número (opcional)</label><input id="reg-numero" maxlength="20" placeholder="Ex: 1904 ou s/n" class="mt-1 w-full p-2 border rounded"></div><div class="mb-3"><label for="reg-cidade" class="block text-sm font-semibold text-gray-700">Cidade (opcional)</label><input id="reg-cidade" maxlength="100" class="mt-1 w-full p-2 border rounded" autocomplete="address-level2"></div><div class="mb-3"><label for="reg-bairro" class="block text-sm font-semibold text-gray-700">Bairro (opcional)</label><input id="reg-bairro" maxlength="100" class="mt-1 w-full p-2 border rounded"></div>
                    <div class="mb-3">
                        <label for="reg-nome" class="block text-sm font-semibold text-gray-700">Nome do Negócio</label>
                        <input type="text" maxlength="150" id="reg-nome" required class="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    
                    <div class="mb-3">
                        <label for="reg-categoria" class="block text-sm font-semibold text-gray-700">Categoria</label>
                        <select id="reg-categoria" required class="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Selecione...</option>
                            <option value="Alimentação">Alimentação</option>
                            <option value="Serviços">Serviços</option>
                            <option value="Varejo">Varejo</option>
                            <option value="Saúde">Saúde e Beleza</option>
                            <option value="Tecnologia">Tecnologia</option>
                              <option value="Comunicação">Jornalismo</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label for="reg-estado" class="block text-sm font-semibold text-gray-700">Estado (UF)</label>
                        <input type="text" id="reg-estado" required maxlength="2" placeholder="Ex: SC" class="mt-1 w-full p-2 border rounded uppercase focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    
                    <div class="mb-3">
                        <label for="reg-whatsapp" class="block text-sm font-semibold text-gray-700">WhatsApp (Apenas números)</label>
                        <input type="text" inputmode="tel" id="reg-whatsapp" required placeholder="Ex: 5548999999999" class="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    
                    <div class="mb-3">
                        <label for="reg-descricao" class="block text-sm font-semibold text-gray-700">Descrição</label>
                        <textarea maxlength="5000" id="reg-descricao" required rows="3" class="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                    </div>

                    <div class="mb-5">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Foto ou Logo (Opcional)</label>
                        <input type="file" id="imagem-loja" accept="image/jpeg,image/png,image/webp" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px
