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

// 2.1 INICIALIZAÇÃO DA AUTENTICAÇÃO
var auth = firebase.auth();
var provider = new firebase.auth.GoogleAuthProvider();

// Função para o botão de Login
window.fazerLoginGoogle = function() {
    auth.signInWithPopup(provider)
        .then((result) => {
            var user = result.user;
            alert("Bem-vindo(a), " + user.displayName + "!");
            console.log("Usuário logado:", user);
        }).catch((error) => {
            console.error("Erro no login:", error);
            alert("Erro ao fazer login. Tente novamente.");
        });
};

// --- FUNÇÃO AUXILIAR PARA A IMAGEM (NOVO) ---
function converterParaBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 3. FUNÇÃO PARA CARREGAR DADOS (Leitura Pública em Tempo Real)
db.collection('comercios').onSnapshot((snapshot) => {
    const container = document.getElementById('container-comercios');
    
    // Trava de segurança: só tenta desenhar se a div existir na página
    if (!container) return; 
    
    container.innerHTML = ""; // Limpa antes de renderizar

    snapshot.forEach((doc) => {
        const negocio = doc.data(); // CORRIGIDO: Removido o to_dict() do Python

        // VALIDAÇÃO DA IMAGEM
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

// 4. FUNÇÃO PARA SALVAR (Com proteção de Login e Upload de Imagem)
var form = document.getElementById('form-cadastro');
if (form) {
    // CORRIGIDO: Adicionado o "async" na função para permitir o upload da imagem
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // VERIFICAÇÃO: O usuário está logado?
        var usuarioLogado = auth.currentUser;
        if (!usuarioLogado) {
            alert("Você precisa fazer login com o Google para cadastrar uma loja!");
            return;
        }

        // CAPTURA E CONVERSÃO DA IMAGEM
        const imagemInput = document.getElementById('imagem-loja'); // Certifique-se que o input type="file" no HTML tem id="imagem-loja"
        let imagemUrl = ""; 
        if (imagemInput && imagemInput.files.length > 0) {
            imagemUrl = await converterParaBase64(imagemInput.files[0]);
        }

        // MONTAGEM DO OBJETO PARA O BANCO DE DADOS
        var novaLoja = {
            estado: document.getElementById('reg-estado').value.toUpperCase(),
            nome: document.getElementById('reg-nome').value,
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value,
            whatsapp: document.getElementById('reg-whatsapp').value,
            imagem: imagemUrl, // A foto salva em texto base64
            criadoEm: new Date(),
            uid_usuario: usuarioLogado.uid
        };

        // CORRIGIDO: Nome da coleção alterado de 'comerciantes' para 'comercios'
        db.collection("comercios").add(novaLoja).then(function() {
            alert("Cadastrado com sucesso!");
            form.reset();
        }).catch(function(error) {
            console.error("Erro ao salvar:", error);
            if (error.code === 'permission-denied') {
                alert("Erro: Permissão negada. Verifique as regras do Firebase.");
            } else {
                alert("Erro ao salvar! Tente novamente.");
            }
        });
    });
}
