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

let loginEmCurso = false;
let authRevision = 0;
let ultimoSnapshot = null;
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function normalizarTexto(value) { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function telefoneWhatsApp(value) {
    let numero = String(value ?? '').replace(/\D/g,'');
    if (numero.length === 10 || numero.length === 11) numero = '55' + numero;
    return /^55\d{10,11}$/.test(numero) ? numero : '';
}
function atualizarConta(usuario, mensagem) {
    const btn = document.getElementById('btn-login');
    const sair = document.getElementById('btn-logout');
    btn.hidden = !!usuario;
    btn.disabled = loginEmCurso;
    btn.textContent = loginEmCurso ? 'Entrando…' : 'Entrar com Google';
    sair.hidden = !usuario;
    document.getElementById('auth-name').textContent = usuario ? (usuario.displayName || 'Empreendedor') : '';
    document.getElementById('auth-status').textContent = mensagem || (usuario ? 'Você está conectado. Cadastre um negócio ou use “Somente meus negócios” para gerenciar os seus.' : 'Entre com Google para cadastrar e gerenciar seus negócios. A busca é livre.');
    const meus = document.getElementById('filtro-meus');
    meus.disabled = !usuario;
    if (!usuario) meus.checked = false;
    document.getElementById('cadastro-ajuda').textContent = usuario ? 'Os negócios cadastrados ficam vinculados à sua conta.' : 'Entre com sua conta Google para publicar. Você pode preparar os dados abaixo.';
    if (ultimoSnapshot) {
        document.getElementById('container-comercios').innerHTML = renderizarCards(ultimoSnapshot);
        filtrarCards();
    }
}
window.fazerLoginGoogle = async function() {
    if (loginEmCurso) return;
    loginEmCurso = true;
    atualizarConta(auth.currentUser);
    try { await auth.signInWithPopup(provider); }
    catch (error) {
        const mensagens = {
            'auth/popup-closed-by-user':'A janela de login foi fechada. Você pode tentar novamente.',
            'auth/cancelled-popup-request':'Já existe uma tentativa de login em andamento.',
            'auth/popup-blocked':'Seu navegador bloqueou a janela. Permita pop-ups para este site e tente novamente.',
            'auth/network-request-failed':'Não foi possível conectar. Confira sua conexão e tente novamente.',
            'auth/unauthorized-domain':'O login não está habilitado para este endereço. Entre em contato com a equipe do Conecta Bairros.',
            'auth/operation-not-allowed':'O login Google precisa ser habilitado pela equipe do Conecta Bairros.'
        };
        atualizarConta(auth.currentUser, mensagens[error.code] || 'Não foi possível entrar. Tente novamente.');
    } finally {
        loginEmCurso = false;
        const btn = document.getElementById('btn-login');
        btn.disabled = false;
        btn.textContent = 'Entrar com Google';
    }
};
window.fazerLogoutGoogle = async function() {
    const btn = document.getElementById('btn-logout');
    btn.disabled = true;
    try { await auth.signOut(); }
    catch { document.getElementById('auth-status').textContent = 'Não foi possível sair. Tente novamente.'; }
    finally { btn.disabled = false; }
};
auth.onAuthStateChanged(async usuario => {
    const revision = ++authRevision;
    usuarioAtual = null;
    if (!usuario) { resetarModoEdicao(); limparFormulario(); }
    atualizarConta(usuario);
    if (!usuario) return;
    try {
        const ref = db.collection('usuarios').doc(usuario.uid);
        const doc = await ref.get();
        if (!doc.exists) await ref.set({ uid:usuario.uid, nome:usuario.displayName || '', email:usuario.email || '', foto:usuario.photoURL || '', tipo:'empreendedor', ativo:true, criadoEm:firebase.firestore.FieldValue.serverTimestamp() });
        if (revision !== authRevision) return;
        usuarioAtual = doc.exists ? doc.data() : {tipo:'empreendedor'};
    } catch {
        if (revision !== authRevision) return;
        document.getElementById('auth-status').textContent = 'Você entrou com Google, mas não conseguimos carregar seu perfil. Tente novamente mais tarde.';
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
            
            ultimoSnapshot = snapshot;
            // Estado vazio
            if (snapshot.empty) {
                container.innerHTML = "<p class='text-gray-500 col-span-full text-center py-8'>Nenhum comércio cadastrado ainda.</p>";
                filtrarCards();
                return;
            }

            // Renderiza todos os cards
            const html = renderizarCards(snapshot);
            container.innerHTML = html;
            filtrarCards();
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
        const dados = doc.data();
        const negocio = Object.fromEntries(Object.entries(dados).map(([key,value]) => [key, escapeHTML(value)]));
        const docId = doc.id;
        const fotoCard = /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(dados.imagem || "") ? negocio.imagem : IMAGEM_PADRAO;
        
        // Verifica se o usuário atual é o proprietário
        const ehProprietario = auth.currentUser && auth.currentUser.uid === negocio.uid_usuario;
        const botoesAcao = ehProprietario ? gerarBotoesAcao(docId) : "";

        html.push(`
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100 flex flex-col comercio-card" data-estado="${negocio.estado || ''}" data-categoria="${negocio.categoria || ''}" data-owner="${negocio.uid_usuario || ''}">
                <img src="${fotoCard}" alt="Logo de ${negocio.nome}" class="w-full h-48 object-cover" loading="lazy" onerror="this.onerror=null;this.src='${IMAGEM_PADRAO}'">
                <div class="p-5 flex-grow">
                    <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ${negocio.categoria || 'Geral'}
                    </span>
                    <h3 class="text-xl font-bold text-gray-800 mt-2 comercio-nome">${negocio.nome}</h3>
                    <p class="text-gray-500 text-sm mt-1 mb-4 line-clamp-2 comercio-descricao">${negocio.descricao}</p>
                    <div class="flex justify-between items-center border-t pt-3 mb-3">
                        <span class="text-xs font-semibold text-gray-400">📍 ${negocio.estado || 'N/A'}</span>
                        <a href="https://wa.me/${telefoneWhatsApp(dados.whatsapp)}" target="_blank" rel="noopener noreferrer" ${telefoneWhatsApp(dados.whatsapp) ? '' : 'aria-disabled="true" tabindex="-1"'} class="text-emerald-500 hover:text-emerald-600 text-sm font-bold flex items-center gap-1 transition">
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
    const whatsapp = telefoneWhatsApp(document.getElementById('reg-whatsapp').value);
    const descricao = document.getElementById('reg-descricao').value.trim();

    if (!nome) erros.push("Nome do negócio é obrigatório.");
    if (!categoria) erros.push("Categoria é obrigatória.");
    if (!estado) erros.push("Estado (UF) é obrigatório.");
    if (!whatsapp) erros.push("Informe um WhatsApp brasileiro com DDD (10 ou 11 dígitos, com ou sem 55).");
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
            whatsapp: telefoneWhatsApp(document.getElementById('reg-whatsapp').value),
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
    document.getElementById('input-busca').addEventListener('input',filtrarCards);
    for (const id of ['filtro-categoria','filtro-meus']) document.getElementById(id).addEventListener('change',filtrarCards);
}
window.filtrarComercios = function(termo) {
    const busca = normalizarTexto(termo);
    const estado = document.getElementById('filtro-estado').value;
    const categoria = document.getElementById('filtro-categoria').value;
    const meus = document.getElementById('filtro-meus').checked;
    let encontrados = 0;
    const cards = document.querySelectorAll('.comercio-card');
    cards.forEach(card => {
        const texto = [card.querySelector('.comercio-nome').textContent,card.querySelector('.comercio-descricao').textContent,card.dataset.categoria].join(' ');
        const visivel = normalizarTexto(texto).includes(busca) && (estado === 'Todos' || normalizarTexto(card.dataset.estado) === normalizarTexto(estado)) && (categoria === 'Todos' || normalizarTexto(card.dataset.categoria) === normalizarTexto(categoria)) && (!meus || card.dataset.owner === auth.currentUser?.uid);
        card.style.display = visivel ? 'flex' : 'none';
        if (visivel) encontrados++;
    });
    document.getElementById('resultado-filtros').textContent = encontrados + (encontrados === 1 ? ' negócio encontrado' : ' negócios encontrados');
    document.getElementById('sem-resultados').hidden = encontrados > 0 || cards.length === 0;
};
window.filtrarCards = function() { filtrarComercios(document.getElementById('input-busca').value); };
window.limparFiltros = function() {
    document.getElementById('input-busca').value = '';
    document.getElementById('filtro-estado').value = 'Todos';
    document.getElementById('filtro-categoria').value = 'Todos';
    document.getElementById('filtro-meus').checked = false;
    filtrarCards();
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
                <p class="text-sm mt-1">${escapeHTML(mensagem)}</p>
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
    
    // Remove mensagens anteriores
    removerMensagens();
    
    const divMensagem = document.createElement('div');
    divMensagem.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    divMensagem.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl">✅</span>
            <div class="flex-1">
                <p class="font-bold">Sucesso</p>
                <p class="text-sm mt-1">${escapeHTML(mensagem)}</p>
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
    
    // Remove mensagens anteriores
    removerMensagens();
    
    const divMensagem = document.createElement('div');
    divMensagem.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
    divMensagem.innerHTML = `
        <div class="flex items-start gap-3">
            <span class="text-2xl">⚠️</span>
            <div class="flex-1">
                <p class="font-bold">Aviso</p>
                <p class="text-sm mt-1">${escapeHTML(mensagem)}</p>
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
    
    // Cria campo de pesquisa dinamicamente
    criarCampoPesquisa();
    
    // Inicia listagem de comércios em tempo real
    listarComercios();
    
});

// ==========================================
// DOCUMENTAÇÃO E COMENTÁRIOS
// ==========================================

/**
 * CONECTA BAIRROS - Sistema de Cadastro de Comércios Locais
 * 
 * ARQUITETURA:
 * - Firebase v8 (compatível com código existente)
 * - Firestore para banco de dados
 * - Armazenamento de imagens em Base64 (Firestore)
 * - Firebase Auth para autenticação
 * 
 * ESTRUTURA DO CÓDIGO:
 * 1. CONFIGURAÇÃO - Inicialização do Firebase
 * 2. VARIÁVEIS GLOBAIS - Constantes e variáveis de controle
 * 3. AUTENTICAÇÃO - Login/Logout com Google
 * 4. UPLOAD - Gerenciamento de imagens em Base64
 * 5. CRUD - Operações de Create, Read, Update, Delete
 * 6. FORMULÁRIO - Preenchimento, limpeza e reset
 * 7. FILTROS - Pesquisa e filtragem de comércios
 * 8. UTILITÁRIOS - Funções de mensagens e validações
 * 9. EVENTOS - Listeners de eventos
 * 10. INICIALIZAÇÃO - Início da aplicação
 * 
 * SEGURANÇA:
 * - Login obrigatório para operações de CRUD
 * - Verificação de propriedade (uid_usuario)
 * - Validação de campos obrigatórios
 * - Validação de tipo e tamanho de imagem
 * - Prevenção de alteração de uid_usuario
 * 
 * PERFORMANCE:
 * - Apenas UM listener onSnapshot() ativo
 * - Renderização eficiente (innerHTML único)
 * - Limpeza de listeners quando necessário
 * 
 * COMPATIBILIDADE:
 * - Firebase v8 (não migrado para v9)
 * - JavaScript ES6+
 * - Tailwind CSS (classes não alteradas)
 * - HTML existente preservado
 */
