// 1. Configuração do Firebase
var firebaseConfig = {
    apiKey: "AIzaSyBAlXgCQ10YLWYfFi47cXelUKMYAF3DW-Q",
    authDomain: "conectabairros-dea35.firebaseapp.com",
    projectId: "conectabairros-dea35",
    storageBucket: "conectabairros-dea35.firebasestorage.app",
    messagingSenderId: "215834992578",
    appId: "1:215834992578:web:625ef084714b032fcfc05b"
};

// 2. Inicialização
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
var db = firebase.firestore();

// 2.1 INICIALIZAÇÃO DA AUTENTICAÇÃO (NOVO)
var auth = firebase.auth();
var provider = new firebase.auth.GoogleAuthProvider();

// Função para o botão de Login (Chame isso no onclick do seu botão HTML)
window.fazerLoginGoogle = function() {
    auth.signInWithPopup(provider)
        .then((result) => {
            var user = result.user;
            alert("Bem-vindo(a), " + user.displayName + "!");
            console.log("Usuário logado:", user);
            // Aqui você pode mudar o texto do botão ou esconder a tela de login
        }).catch((error) => {
            console.error("Erro no login:", error);
            alert("Erro ao fazer login. Tente novamente.");
        });
};

// 3. FUNÇÃO PARA CARREGAR DADOS (Leitura pública)
// Dentro do seu loop de leitura do Firebase (ex: querySnapshot.forEach)
db.collection('comercios').onSnapshot((snapshot) => {
    const container = document.getElementById('container-comercios');
    container.innerHTML = ""; // Limpa antes de renderizar

    snapshot.forEach((doc) => {
        const negocio = doc.to_dict ? doc.to_dict() : doc.data();

        // VALIDAÇÃO DA IMAGEM: Se existir negócio.imagem usa ela, senão usa uma padrão da sua pasta img
        const fotoCard = negocio.imagem ? negocio.imagem : 'img/default-loja.png';

        // Montagem do card em Tailwind
        container.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100">
                <img src="${fotoCard}" alt="Logo de ${negocio.nome}" class="w-full h-48 object-cover">
                
                <div class="p-5">
                    <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ${negocio.categoria}
                    </span>
                    <h3 class="text-xl font-bold text-gray-800 mt-2">${negocio.nome}</h3>
                    <p class="text-gray-500 text-sm mt-1 mb-4 line-clamp-2">${negocio.descricao}</p>
                    
                    <div class="flex justify-between items-center border-t pt-3">
                        <span class="text-xs font-semibold text-gray-400">📍 Estado: ${negocio.estado}</span>
                        <a href="https://wa.me/${negocio.whatsapp}" target="_blank" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-1.5 px-3 rounded-lg inline-flex items-center gap-1 transition">
                            💬 WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
});
// 4. FUNÇÃO PARA SALVAR (Com proteção de Login)
var form = document.getElementById('form-cadastro');
if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // VERIFICAÇÃO: O usuário está logado? (NOVO)
        var usuarioLogado = auth.currentUser;
        if (!usuarioLogado) {
            alert("Você precisa fazer login com o Google para cadastrar uma loja!");
            // Opcional: chamar a função de login automaticamente
            // window.fazerLoginGoogle(); 
            return;
        }

        var novaLoja = {
            estado: document.getElementById('reg-estado').value.toUpperCase(),
            cidade: document.getElementById('reg-cidade').value,
            nome: document.getElementById('reg-nome').value,
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value,
            whatsapp: document.getElementById('reg-whatsapp').value,
            criadoEm: new Date(),
            uid_usuario: usuarioLogado.uid // Salva quem criou (útil para regras futuras)
        };

        db.collection("comerciantes").add(novaLoja).then(function() {
            alert("Cadastrado com sucesso!");
            form.reset();
            window.carregarDadosFiltrados();
        }).catch(function(error) {
            console.error("Erro ao salvar:", error);
            // Se o erro for de permissão (regras do firebase), avisa o usuário
            if (error.code === 'permission-denied') {
                alert("Erro: Permissão negada. Verifique se você está logado.");
            } else {
                alert("Erro ao salvar! Tente novamente.");
            }
        });
    });
}

// 5. Inicializa a lista ao abrir a página
window.carregarDadosFiltrados();
