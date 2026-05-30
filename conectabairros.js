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

// --- VARIÁVEL GLOBAL PARA CONTROLE DE EDIÇÃO ---
var idLojaEmEdicao = null;

// 3. FUNÇÃO PARA CARREGAR DADOS (Com botões de Ação)
db.collection('comercios').onSnapshot((snapshot) => {
    const container = document.getElementById('container-comercios');
    if (!container) return; 
    
    container.innerHTML = ""; 

    snapshot.forEach((doc) => {
        const negocio = doc.data(); 
        const docId = doc.id; // O ID único gerado pelo Firebase!

        const fotoCard = negocio.imagem ? negocio.imagem : 'img/default-loja.png';

        container.innerHTML += `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col">
                <img src="${fotoCard}" alt="Logo de ${negocio.nome}" class="w-full h-48 object-cover">
                
                <div class="p-5 flex-grow">
                    <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ${negocio.categoria}
                    </span>
                    <h3 class="text-xl font-bold text-gray-800 mt-2">${negocio.nome}</h3>
                    <p class="text-gray-500 text-sm mt-1 mb-4 line-clamp-2">${negocio.descricao}</p>
                    
                    <div class="flex justify-between items-center border-t pt-3 mb-3">
                        <span class="text-xs font-semibold text-gray-400">📍 ${negocio.estado}</span>
                        <a href="https://wa.me/${negocio.whatsapp}" target="_blank" class="text-emerald-500 hover:text-emerald-600 text-sm font-bold flex items-center gap-1 transition">
                            💬 WhatsApp
                        </a>
                    </div>
                </div>

                <div class="bg-gray-50 p-3 flex justify-between border-t border-gray-100">
                    <button onclick="editarComercio('${docId}')" class="text-xs text-blue-600 font-bold hover:underline">
                        ✏️ Editar
                    </button>
                    <button onclick="deletarComercio('${docId}')" class="text-xs text-red-600 font-bold hover:underline">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    });
});

// --- FUNÇÃO PARA DELETAR ---
window.deletarComercio = async function(id) {
    if (confirm("Tem certeza que deseja excluir este comércio permanentemente?")) {
        try {
            await db.collection("comercios").doc(id).delete();
            alert("Comércio excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir. Verifique se você tem permissão (Login).");
        }
    }
};

// --- FUNÇÃO PARA EDITAR (Puxa os dados para o formulário) ---
window.editarComercio = async function(id) {
    try {
        // Puxa os dados específicos deste ID
        const doc = await db.collection("comercios").doc(id).get();
        if (doc.exists) {
            const negocio = doc.data();
            
            // Preenche os campos do formulário
            document.getElementById('reg-estado').value = negocio.estado;
            document.getElementById('reg-nome').value = negocio.nome;
            document.getElementById('reg-categoria').value = negocio.categoria;
            document.getElementById('reg-descricao').value = negocio.descricao;
            document.getElementById('reg-whatsapp').value = negocio.whatsapp;
            
            // Define que estamos em modo de edição e rola a tela para cima
            idLojaEmEdicao = id;
            document.querySelector('#form-cadastro button[type="submit"]').innerText = "Atualizar Dados";
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Erro ao carregar dados para edição:", error);
    }
};

// 4. FUNÇÃO PARA SALVAR (Criar Novo ou Atualizar Existente)
var form = document.getElementById('form-cadastro');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        var usuarioLogado = auth.currentUser;
        if (!usuarioLogado) {
            alert("Você precisa fazer login com o Google para alterar o sistema!");
            return;
        }

        const imagemInput = document.getElementById('imagem-loja'); 
        let imagemUrl = ""; 
        if (imagemInput && imagemInput.files.length > 0) {
            imagemUrl = await converterParaBase64(imagemInput.files[0]);
        }

        var dadosLoja = {
            estado: document.getElementById('reg-estado').value.toUpperCase(),
            nome: document.getElementById('reg-nome').value,
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value,
            whatsapp: document.getElementById('reg-whatsapp').value,
            uid_usuario: usuarioLogado.uid
        };

        // Só atualiza a imagem se o usuário tiver escolhido uma foto nova
        if (imagemUrl !== "") {
            dadosLoja.imagem = imagemUrl;
        } else if (!idLojaEmEdicao) {
            dadosLoja.criadoEm = new Date(); // Adiciona data apenas se for criação
        }

        try {
            if (idLojaEmEdicao) {
                // MODO ATUALIZAR
                await db.collection("comercios").doc(idLojaEmEdicao).update(dadosLoja);
                alert("Dados atualizados com sucesso!");
                // Reseta o estado do formulário
                idLojaEmEdicao = null;
                document.querySelector('#form-cadastro button[type="submit"]').innerText = "Cadastrar Negócio";
            } else {
                // MODO CRIAR NOVO
                await db.collection("comercios").add(dadosLoja);
                alert("Cadastrado com sucesso!");
            }
            form.reset();
        } catch (error) {
            console.error("Erro ao processar:", error);
            alert("Erro na operação! Verifique as permissões.");
        }
    });
}
