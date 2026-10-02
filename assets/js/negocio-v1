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
const detalhe = document.getElementById('detalhe');
const statusPagina = document.getElementById('status-pagina');
function valor(value) { return typeof value === 'string' ? value.trim() : ''; }
function telefone(value) {
    let n = valor(value).replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    return /^55\d{10,11}$/.test(n) ? n : '';
}
async function carregarNegocio() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id || id.includes('/') || id.length > 1500) {
        statusPagina.textContent = 'O link deste negócio é inválido. Volte à busca para encontrar um negócio.';
        return;
    }
    try {
        const registro = await db.collection('comerciantes').doc(id).get();
        if (!registro.exists) { statusPagina.textContent = 'Este negócio não foi encontrado ou foi removido. Volte à busca para encontrar outros serviços.'; return; }
        const n = registro.data();
        document.getElementById('nome').textContent = valor(n.nome) || 'Negócio local';
        document.title = (valor(n.nome) || 'Negócio local') + ' | Conecta Bairros';
        document.getElementById('categoria').textContent = valor(n.categoria) || 'Negócio local';
        document.getElementById('descricao').textContent = valor(n.descricao) || 'Descrição ainda não informada.';
        const foto = document.getElementById('foto');
        const imagem = valor(n.imagem);
        if (/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(imagem)) {
            foto.src = imagem; foto.alt = 'Foto de ' + (valor(n.nome) || 'negócio local');
            foto.hidden = false;
            foto.onerror = () => { foto.hidden = true; document.getElementById('sem-foto').hidden = false; };
            document.getElementById('sem-foto').hidden = true;
        }
        const rua = valor(n.rua), numero = valor(n.numero), cidade = valor(n.cidade), estado = valor(n.estado), bairro = valor(n.bairro);
        const endereco = [rua, numero, bairro, cidade, estado].filter(Boolean).join(', ');
        document.getElementById('endereco').textContent = endereco || 'Localização ainda não informada.';
        if (rua && numero && cidade && estado) {
            const rota = document.getElementById('rota');
            rota.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(endereco + ', Brasil');
            rota.hidden = false;
            document.getElementById('aviso-rota').textContent = 'A rota abre no Google Maps. Confira o destino antes de sair.';
        } else {
            document.getElementById('aviso-rota').textContent = 'O endereço completo ainda não foi informado. Consulte o negócio antes de ir até o local.';
        }
        const numeroZap = telefone(n.whatsapp);
        const zap = document.getElementById('whatsapp');
        if (numeroZap) { zap.href = 'https://wa.me/' + numeroZap; zap.hidden = false; }
        else { document.getElementById('aviso-contato').textContent = 'WhatsApp ainda não disponível.'; }
        statusPagina.hidden = true;
        detalhe.hidden = false;
    } catch {
        statusPagina.textContent = 'Não foi possível carregar este negócio. Confira sua conexão e tente novamente.';
    }
}
document.getElementById('compartilhar').addEventListener('click', async () => {
    const mensagem = document.getElementById('status-compartilhar');
    const link = new URL('negocio.php', location.href);
    link.searchParams.set('id', new URLSearchParams(location.search).get('id'));
    try {
        await navigator.clipboard.writeText(link.href);
        mensagem.textContent = 'Link copiado! Você pode enviar pelo WhatsApp.';
    } catch {
        const campo = document.getElementById('link-negocio');
        campo.value = link.href; campo.hidden = false; campo.focus(); campo.select();
        mensagem.textContent = 'Copie o link abaixo para compartilhar.';
    }
});
carregarNegocio();
