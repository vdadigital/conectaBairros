// ==========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBAlXgCQ10YLWYfFi47cXelUKMYAF3DW-Q",
    authDomain: "conectabairros-dea35.firebaseapp.com",
    projectId: "conectabairros-dea35",
    messagingSenderId: "215834992578",
    appId: "1:215834992578:web:625ef084714b032fcfc05b"
};

// Inicializa Firebase apenas uma vez
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ==========================================
// VARIÁVEIS GLOBAIS E CONSTANTES
// ==========================================

const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const ADMIN_EMAILS = [
    "vdadigital@gmail.com"
];

const NOME_COLECAO = "comerciantes";
const TAMANHO_MAXIMO_IMAGEM = 2 * 1024 * 1024; // 2MB
const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const IMAGEM_PADRAO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Crect x='50' y='80' width='300' height='140' rx='8' fill='%23e5e7eb'/%3E%3Cpath d='M200 120 L200 180 M160 140 L240 140' stroke='%239ca3af' stroke-width='4' stroke-linecap='round'/%3E%3Ccircle cx='200' cy='160' r='25' fill='none' stroke='%239ca3af' stroke-width='3'/%3E%3Cpath d='M190 155 L200 165 L215 148' fill='none' stroke='%239ca3af' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ctext x='200' y='220' font-family='Arial' font-size='14' fill='%236b7280' text-anchor='middle'%3ESem imagem%3C/text%3E%3C/svg%3E";

let idLojaEmEdicao = null;
let unsubscribeComercios = null; // Controla listener do Firestore
let usuarioAtual = null; // Armazena dados do usuário logado

// ==========================================
// AUTENTICAÇÃO - LOGIN E LOGOUT
// ==========================================

/**
 * Realiza login com conta Google
 * Exibe indicador de carregamento durante o processo
 * Cria/verifica documento do usuário na coleção 'usuarios'
 */
window.fazerLoginGoogle = async function() {
    const btnLogin = document.querySelector('button[onclick="fazerLoginGoogle()"]');
    
    try {
        console.log("[1] Iniciando login");
        
        // Mostra loading
        if (btnLogin) {
            btnLogin.innerHTML = `
                <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
            `;
            btnLogin.disabled = true;
        }

        const result = await auth.signInWithPopup(provider);
        const usuario = result.user;
        
        console.log("[2] Login Google realizado", usuario);
        console.log("[3] UID:", usuario.uid);
        console.log("[4] Email:", usuario.email);
        
        // Verifica se usuário existe na coleção 'usuarios'
        const docRef = db.collection("usuarios").doc(usuario.uid);
        const doc = await docRef.get();
        
        console.log("[5] Buscando documento usuarios");
        console.log("[6] doc.exists =", doc.exists);
        
        if (!doc.exists) {
            console.log("[7] Entrou no if (!doc.exists)");
            
            // Primeiro login - cria documento
            const ehAdmin = ADMIN_EMAILS.includes(usuario.email);
            
            console.log("[8] Vai executar docRef.set()");
            console.log("[8.1] ehAdmin =", ehAdmin);
            
            await docRef.set({
                uid: usuario.uid,
                nome: usuario.displayName,
                email: usuario.email,
                foto: usuario.photoURL || "",
                tipo: ehAdmin ? "admin" : "empreendedor",
                ativo: true,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("[9] Documento criado");
        } else {
            console.log("[7] Entrou no else (doc.exists)");
        }
        
        // Carrega dados completos do usuário
        const docAtualizado = await docRef.get();
        usuarioAtual = docAtualizado.data();
        
        console.log("[10] usuarioAtual =", usuarioAtual);
        console.log("[11] Login concluído com sucesso");
        mostrarSucesso(`Bem-vindo, ${usuario.displayName}!`);
        
    } catch (error) {
        console.error(error);
        console.error(error.code);
        console.error(error.message);
        mostrarErro(error.message);
        
        // Restaura botão
        if (btnLogin) {
            btnLogin.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                Login do Empreendedor
            `;
            btnLogin.disabled = false;
        }
    }
};

/**
 * Realiza logout da conta Google
 */
window.fazerLogoutGoogle = async function() {
    try {
        await auth.signOut();
        usuarioAtual = null; // Limpa variável global
        console.log("Logout realizado com sucesso");
        mostrarAviso("Você saiu da conta.");
    } catch (error) {
        console.error("Erro no logout:", error);
        mostrarErro("Erro ao sair da conta. Tente novamente.");
    }
};

/**
 * Monitora mudanças no estado de autenticação
 * Atualiza interface quando usuário faz login/logout
 */
auth.onAuthStateChanged(async (usuario) => {
    const btnLogin = document.querySelector('button[onclick="fazerLoginGoogle()"], button[onclick="fazerLogoutGoogle()"]');
    
    if (usuario) {
        // Usuário logado - carrega dados da coleção 'usuarios'
        try {
            const docRef = db.collection("usuarios").doc(usuario.uid);
            const doc = await docRef.get();
            
            if (doc.exists) {
                usuarioAtual = doc.data();
            }
        } catch (error) {
            console.error("Erro ao carregar dados do usuário:", error);
        }
        
        // Atualiza interface com nome, tipo e botão sair
        if (btnLogin) {
            const tipoUsuario = usuarioAtual && usuarioAtual.tipo === "admin" ? "Administrador" : "Empreendedor";
            btnLogin.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                👤 ${usuario.displayName}<br>${tipoUsuario}<br><span class="text-red-600 font-bold">[Sair]</span>
            `;
            btnLogin.onclick = fazerLogoutGoogle;
        }
    } else {
        // Usuário deslogado - restaura interface e limpa variável
        usuarioAtual = null;
        
        if (btnLogin) {
            btnLogin.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.23 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                Login do Empreendedor
            `;
            btnLogin.onclick = fazerLoginGoogle;
        }
        
        // Limpa edição e reseta formulário
        resetarModoEdicao();
    }
});

// ==========================================
// UPLOAD DE IMAGENS (BASE64)
// ==========================================

/**
 * Valida arquivo de imagem
 * @param {File} arquivo - Arquivo a ser validado
 * @returns {Object} { valido: boolean, erro: string }
 */
function validarImagem(arquivo) {
    if (!arquivo) {
        return { valido: true, erro: null };
    }

    // Verifica tipo de arquivo
    if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.type)) {
        return {
            valido: false,
            erro: "Tipo de arquivo inválido. Apenas JPG, JPEG, PNG e WEBP são permitidos."
        };
    }

    // Verifica tamanho (2MB)
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
        const tamanhoMB = (arquivo.size / (1024 * 1024)).toFixed(2);
        return {
            valido: false,
            erro: `Imagem muito grande (${tamanhoMB}MB). Tamanho máximo: 2MB.`
        };
    }

    return { valido: true, erro: null };
}

/**
 * Converte imagem para Base64 comprimido
 * Redimensiona proporcionalmente com largura máxima de 800px
 * @param {File} arquivo - Arquivo de imagem
 * @returns {Promise<string>} Base64 da imagem comprimida
 */
async function converterImagemParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
        // Valida arquivo
        const validacao = validarImagem(arquivo);
        if (!validacao.valido) {
            reject(new Error(validacao.erro));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const MAX_WIDTH = 800;

                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL("image/jpeg", 0.75);
                resolve(base64);
            };
            
            img.onerror = function() {
                reject(new Error("Erro ao carregar imagem para processamento."));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error("Erro ao ler arquivo de imagem."));
        };
        
        reader.readAsDataURL(arquivo);
    });
}

// ==========================================
// CRUD - CREATE, READ, UPDATE, DELETE
// ==========================================

/**
 * Lista todos os comércios em tempo real
 * Garante apenas UM listener ativo
 */
function listarComercios() {
    // Remove listener anterior se existir
    if (unsubscribeComercios) {
        unsubscribeComercios();
    }

    const container = document.getElementById('container-comercios');
    
    if (!container) {
        console.error("ERRO: Container 'container-comercios' não encontrado");
        return;
    }

    // Mostra loading inicial
    container.innerHTML = `
        <div class="col-span-full flex justify-center py-10">
            <p class="text-gray-500 animate-pulse">Procurando comércios cadastrados...</p>
        </div>
    `;

    // Cria listener único
    unsubscribeComercios = db.collection(NOME_COLECAO).onSnapshot(
        (snapshot) => {
            console.log("Listener atualizado - Documentos:", snapshot.size);
            
            // Estado vazio
            if (snapshot.empty) {
                container.innerHTML = "<p class='text-gray-500 col-span-full text-center py-8'>Nenhum comércio cadastrado ainda.</p>";
                return;
            }

            // Renderiza todos os cards
            const html = renderizarCards(snapshot);
            container.innerHTML = html;
        },
        (error) => {
            console.error("Erro no listener:", error);
            container.innerHTML = "<p class='text-red-500 col-span-full text-center py-8'>Erro ao carregar comércios.</p>";
        }
    );
}

/**
 * Renderiza HTML de todos os cards de comércio
 * @param {firebase.firestore.QuerySnapshot} snapshot 
 * @returns {string} HTML completo dos cards
 */
function renderizarCards(snapshot) {
    const html = [];

    snapshot.forEach((doc) => {
        const negocio = doc.data();
        const docId = doc.id;
        const fotoCard = negocio.imagem ? negocio.imagem : IMAGEM_PADRAO;
        
        // Verifica se o usuário atual é o proprietário
        const ehProprietario = auth.currentUser && auth.currentUser.uid === negocio.uid_usuario;
        const botoesAcao = ehProprietario ? gerarBotoesAcao(docId) : "";

        html.push(`
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col comercio-card">
                <img src="${fotoCard}" alt="Logo de ${negocio.nome}" class="w-full h-48 object-cover" onerror="this.src='" + IMAGEM_PADRAO + "'">
                <div class="p-5 flex-grow">
                    <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ${negocio.categoria || 'Geral'}
                    </span>
                    <h3 class="text-xl font-bold text-gray-800 mt-2 comercio-nome">${negocio.nome}</h3>
                    <p class="text-gray-500 text-sm mt-1 mb-4 line-clamp-2 comercio-descricao">${negocio.descricao}</p>
                    <div class="flex justify-between items-center border-t pt-3 mb-3">
                        <span class="text-xs font-semibold text-gray-400">📍 ${negocio.estado || 'N/A'}</span>
                        <a href="https://wa.me/${negocio.whatsapp}" target="_blank" class="text-emerald-500 hover:text-emerald-600 text-sm font-bold flex items-center gap-1 transition">
                            💬 WhatsApp
                        </a>
                    </div>
                </div>
                ${botoesAcao}
            </div>
        `);
    });

    return html.join('');
}

/**
 * Gera HTML dos botões de editar e excluir
 * @param {string} docId - ID do documento
 * @returns {string} HTML dos botões
 */
function gerarBotoesAcao(docId) {
    return `
        <div class="bg-gray-50 p-3 flex justify-between border-t border-gray-100">
            <button onclick="editarComercio('${docId}')" class="text-xs text-blue-600 font-bold hover:underline">
                ✏️ Editar
            </button>
            <button onclick="deletarComercio('${docId}')" class="text-xs text-red-600 font-bold hover:underline">
                🗑️ Excluir
            </button>
        </div>
    `;
}

/**
 * Valida campos obrigatórios do formulário
 * @returns {Object} { valido: boolean, erros: string[] }
 */
function validarFormulario() {
    const erros = [];

    const nome = document.getElementById('reg-nome').value.trim();
    const categoria = document.getElementById('reg-categoria').value;
    const estado = document.getElementById('reg-estado').value.trim().toUpperCase();
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();
    const descricao = document.getElementById('reg-descricao').value.trim();

    if (!nome) erros.push("Nome do negócio é obrigatório.");
    if (!categoria) erros.push("Categoria é obrigatória.");
    if (!estado) erros.push("Estado (UF) é obrigatório.");
    if (!whatsapp) erros.push("WhatsApp é obrigatório.");
    if (!descricao) erros.push("Descrição é obrigatória.");

    return {
        valido: erros.length === 0,
        erros: erros
    };
}

/**
 * Salva novo comércio ou atualiza existente
 */
async function salvarComercio() {
    const usuarioLogado = auth.currentUser;
    
    // Validação de autenticação
    if (!usuarioLogado) {
        mostrarErro("Você precisa fazer login com o Google para alterar o sistema!");
        return;
    }

    // Validação de campos
    const validacao = validarFormulario();
    if (!validacao.valido) {
        mostrarErro("Por favor, preencha todos os campos obrigatórios:\n\n" + validacao.erros.join('\n'));
        return;
    }

    // Controle do estado do botão
    const btnSubmit = document.querySelector('#form-cadastro button[type="submit"]');
    const textoOriginal = btnSubmit.innerText;
    
    try {
        // Mostra loading
        btnSubmit.innerText = "Salvando...";
        btnSubmit.disabled = true;

        // Processamento de imagem (se houver)
        let imagemBase64 = null;
        const imagemInput = document.getElementById('imagem-loja');
        
        if (imagemInput && imagemInput.files.length > 0) {
            btnSubmit.innerText = "Processando imagem...";
            imagemBase64 = await converterImagemParaBase64(imagemInput.files[0]);
        } else if (idLojaEmEdicao) {
            // Se está editando e NÃO escolheu nova imagem, mantém a existente
            const doc = await db.collection(NOME_COLECAO).doc(idLojaEmEdicao).get();
            if (doc.exists) {
                const dadosAntigos = doc.data();
                if (dadosAntigos.imagem) {
                    imagemBase64 = dadosAntigos.imagem;
                }
            }
        }

        // Monta objeto de dados (IMPEDE alteração de uid_usuario)
        const dadosLoja = {
            estado: document.getElementById('reg-estado').value.toUpperCase(),
            nome: document.getElementById('reg-nome').value.trim(),
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value.trim(),
            whatsapp: document.getElementById('reg-whatsapp').value.trim(),
            uid_usuario: usuarioLogado.uid,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Adiciona imagem apenas se foi enviada
        if (imagemBase64) {
            dadosLoja.imagem = imagemBase64;
        }

        // CREATE ou UPDATE
        if (idLojaEmEdicao) {
            // Verifica se o usuário ainda é o proprietário
            const doc = await db.collection(NOME_COLECAO).doc(idLojaEmEdicao).get();
            if (!doc.exists) {
                throw new Error("Comércio não encontrado.");
            }
            
            const dadosDoc = doc.data();
            if (dadosDoc.uid_usuario !== usuarioLogado.uid) {
                throw new Error("Você não tem permissão para editar este comércio.");
            }

            await db.collection(NOME_COLECAO).doc(idLojaEmEdicao).update(dadosLoja);
            mostrarSucesso("Dados atualizados com sucesso!");
            resetarModoEdicao();
        } else {
            dadosLoja.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection(NOME_COLECAO).add(dadosLoja);
            mostrarSucesso("Cadastrado com sucesso!");
        }

        // Limpa formulário
        limparFormulario();

    } catch (error) {
        console.error("Erro ao salvar:", error);
        mostrarErro("Ocorreu um erro ao salvar o comércio: " + error.message);
    } finally {
        // Restaura botão
        btnSubmit.disabled = false;
        btnSubmit.innerText = idLojaEmEdicao ? "Atualizar Dados" : "Cadastrar Negócio";
    }
}

/**
 * Prepara formulário para edição de comércio
 * @param {string} id - ID do documento
 */
window.editarComercio = async function(id) {
    const usuario = auth.currentUser;
    
    // Validação de autenticação
    if (!usuario) {
        mostrarErro("Você precisa estar logado para editar.");
        return;
    }

    try {
        // Busca dados do comércio
        const doc = await db.collection(NOME_COLECAO).doc(id).get();
        if (!doc.exists) {
            throw new Error("Comércio não encontrado.");
        }

        const negocio = doc.data();

        // Verifica permissão (SEGURANÇA)
        const ehAdmin = usuarioAtual && usuarioAtual.tipo === "admin";
        const ehProprietario = negocio.uid_usuario === usuario.uid;
        
        if (!ehAdmin && !ehProprietario) {
            throw new Error("Você não tem permissão para editar este comércio.");
        }

        // Preenche formulário
        preencherFormulario(negocio);

        // Define modo de edição
        idLojaEmEdicao = id;
        const btnSubmit = document.querySelector('#form-cadastro button[type="submit"]');
        btnSubmit.innerText = "Atualizar Dados";

        // Rola para o formulário
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Erro ao carregar dados para edição:", error);
        mostrarErro("Erro ao carregar os dados para edição: " + error.message);
    }
};

/**
 * Exclui comércio do Firestore e imagem do Storage
 * @param {string} id - ID do documento
 */
window.deletarComercio = async function(id) {
    const usuario = auth.currentUser;
    
    // Validação de autenticação
    if (!usuario) {
        mostrarErro("Você precisa estar logado para excluir.");
        return;
    }

    // Confirmação de exclusão
    if (!confirm("Tem certeza que deseja excluir este comércio?\n\nEsta ação não pode ser desfeita.")) {
        return;
    }

    try {
        // Busca dados para verificar propriedade e obter URL da imagem
        const doc = await db.collection(NOME_COLECAO).doc(id).get();
        if (!doc.exists) {
            throw new Error("Comércio não encontrado.");
        }

        const comercio = doc.data();

        // Verifica permissão (SEGURANÇA)
        const ehAdminExclusao = usuarioAtual && usuarioAtual.tipo === "admin";
        const ehProprietarioExclusao = comercio.uid_usuario === usuario.uid;
        
        if (!ehAdminExclusao && !ehProprietarioExclusao) {
            throw new Error("Você não tem permissão para excluir este comércio.");
        }

        // Exclui documento do Firestore
        await db.collection(NOME_COLECAO).doc(id).delete();

        mostrarSucesso("Comércio excluído com sucesso!");

    } catch (error) {
        console.error("Erro ao excluir:", error);
        mostrarErro("Não foi possível excluir o comércio: " + error.message);
    }
};

// ==========================================
// FORMULÁRIO - PREENCHER, LIMPAR, RESETAR
// ==========================================

/**
 * Preenche formulário com dados do comércio
 * @param {Object} negocio - Dados do comércio
 */
function preencherFormulario(negocio) {
    document.getElementById('reg-estado').value = negocio.estado || '';
    document.getElementById('reg-nome').value = negocio.nome || '';
    document.getElementById('reg-categoria').value = negocio.categoria || '';
    document.getElementById('reg-descricao').value = negocio.descricao || '';
    document.getElementById('reg-whatsapp').value = negocio.whatsapp || '';
    
    // Limpa input de arquivo
    const imagemInput = document.getElementById('imagem-loja');
    if (imagemInput) {
        imagemInput.value = '';
    }
}

/**
 * Limpa todos os campos do formulário
 */
function limparFormulario() {
    const form = document.getElementById('form-cadastro');
    if (form) {
        form.reset();
    }
}

/**
 * Reseta modo de edição
 */
function resetarModoEdicao() {
    idLojaEmEdicao = null;
    const btnSubmit = document.querySelector('#form-cadastro button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.innerText = "Cadastrar Negócio";
    }
}

// ==========================================
// FILTROS E PESQUISA
// ==========================================

/**
 * Cria campo de pesquisa dinamicamente se não existir
 */
function criarCampoPesquisa() {
    const containerFiltros = document.querySelector('.lg\\:col-span-2 > div.mb-6');
    
    if (!containerFiltros) {
        console.error("Container de filtros não encontrado");
        return;
    }

    // Verifica se já existe campo de busca
    if (document.getElementById('input-busca')) {
        return;
    }

    // Cria elemento de busca
    const divBusca = document.createElement('div');
    divBusca.className = 'mb-4';
    divBusca.innerHTML = `
        <label class="font-bold text-gray-700 block mb-2">Pesquisar por nome, categoria ou descrição:</label>
        <input 
            type="text" 
            id="input-busca" 
            placeholder="Digite sua pesquisa..." 
            class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            autocomplete="off"
        >
    `;

    // Insere antes do select de estado
    const selectEstado = containerFiltros.querySelector('#filtro-estado');
    if (selectEstado) {
        containerFiltros.insertBefore(divBusca, selectEstado);
    } else {
        containerFiltros.appendChild(divBusca);
    }

    // Adiciona evento de busca em tempo real
    const inputBusca = document.getElementById('input-busca');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => filtrarComercios(e.target.value));
    }
}

/**
 * Filtra comércios por nome, categoria, descrição e estado
 * @param {string} termo - Termo de busca
 */
window.filtrarComercios = function(termo) {
    const busca = termo.toLowerCase().trim();
    const filtroEstado = document.getElementById('filtro-estado');
    const estadoSelecionado = filtroEstado ? filtroEstado.value : 'Todos';
    
    const cards = document.querySelectorAll('.comercio-card');
    
    cards.forEach(card => {
        const nome = card.querySelector('.comercio-nome').innerText.toLowerCase();
        const descricao = card.querySelector('.comercio-descricao').innerText.toLowerCase();
        const categoria = card.querySelector('.comercio-card span').innerText.toLowerCase();
        const estado = card.querySelector('.comercio-card .text-gray-400').innerText.replace('📍', '').trim().toLowerCase();
        
        // Filtro por texto (nome, categoria, descrição)
        const matchTexto = !busca || 
                          nome.includes(busca) || 
                          descricao.includes(busca) || 
                          categoria.includes(busca);
        
        // Filtro por estado
        const matchEstado = estadoSelecionado === 'Todos' || estado === estadoSelecionado.toLowerCase();
        
        // Exibe card se passar em ambos os filtros
        if (matchTexto && matchEstado) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
};

/**
 * Aplica filtros combinados (texto + estado)
 */
window.filtrarCards = function() {
    const inputBusca = document.getElementById('input-busca');
    const termo = inputBusca ? inputBusca.value : '';
    filtrarComercios(termo);
};

// ==========================================
// UTILITÁRIOS - MENSAGENS E NOTIFICAÇÕES
// ==========================================

/**
 * Exibe mensagem de erro para o usuário
 * @param {string} mensagem - Mensagem amigável
 */
function mostrarErro(mensagem) {
    console.error("ERRO:", mensagem);
    
    // Remove mensagens anteriores
    removerMensagens();
    
    const divMensagem = document.createElement('div');
    divMensagem.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    divMensagem.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl">❌</span>
            <div class="flex-1">
                <p class="font-bold">Erro</p>
                <p class="text-sm mt-1">${mensagem}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(divMensagem);
    
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
        if (divMensagem.parentElement) {
            divMensagem.remove();
        }
    }, 5000);
}

/**
 * Exibe mensagem de sucesso para o usuário
 * @param {string} mensagem - Mensagem amigável
 */
function mostrarSucesso(mensagem) {
    console.log("SUCESSO:", mensagem);
    
    // Remove mensagens anteriores
    removerMensagens();
    
    const divMensagem = document.createElement('div');
    divMensagem.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    divMensagem.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl">✅</span>
            <div class="flex-1">
                <p class="font-bold">Sucesso</p>
                <p class="text-sm mt-1">${mensagem}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(divMensagem);
    
    // Remove automaticamente após 4 segundos
    setTimeout(() => {
        if (divMensagem.parentElement) {
            divMensagem.remove();
        }
    }, 4000);
}

/**
 * Exibe mensagem de aviso para o usuário
 * @param {string} mensagem - Mensagem amigável
 */
function mostrarAviso(mensagem) {
    console.log("AVISO:", mensagem);
    
    // Remove mensagens anteriores
    removerMensagens();
    
    const divMensagem = document.createElement('div');
    divMensagem.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    divMensagem.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl">⚠️</span>
            <div class="flex-1">
                <p class="font-bold">Aviso</p>
                <p class="text-sm mt-1">${mensagem}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                ✕
            </button>
        </div>
    `;
    
    document.body.appendChild(divMensagem);
    
    // Remove automaticamente após 4 segundos
    setTimeout(() => {
        if (divMensagem.parentElement) {
            divMensagem.remove();
        }
    }, 4000);
}

/**
 * Remove todas as mensagens exibidas
 */
function removerMensagens() {
    const mensagens = document.querySelectorAll('.fixed.top-4');
    mensagens.forEach(msg => msg.remove());
}

// ==========================================
// EVENTOS
// ==========================================

// Submit do formulário de cadastro
const formCadastro = document.getElementById('form-cadastro');
if (formCadastro) {
    formCadastro.addEventListener('submit', async function(e) {
        e.preventDefault();
        await salvarComercio();
    });
}

// Filtro por estado
const filtroEstado = document.getElementById('filtro-estado');
if (filtroEstado) {
    filtroEstado.addEventListener('change', () => {
        const inputBusca = document.getElementById('input-busca');
        const termo = inputBusca ? inputBusca.value : '';
        filtrarComercios(termo);
    });
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

// Inicializa aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("=== Conecta Bairros - Inicializando ===");
    
    // Cria campo de pesquisa dinamicamente
    criarCampoPesquisa();
    
    // Inicia listagem de comércios em tempo real
    listarComercios();
    
    console.log("=== Conecta Bairros - Pronto ===");
});

