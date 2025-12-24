// Adicione 'where' nos imports do Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... (sua firebaseConfig continua igual)

const db = getFirestore(app);

// --- FUNÇÃO: CARREGAR COM FILTRO ---
window.carregarDadosFiltrados = async function() {
    const estadoFiltro = document.getElementById('filtro-estado').value;
    const vitrine = document.getElementById('lista-comerciantes');
    vitrine.innerHTML = "Buscando comerciantes locais...";

    try {
        let q;
        if (estadoFiltro) {
            // Se houver filtro, busca apenas o estado selecionado
            q = query(collection(db, "comerciantes"), where("estado", "==", estadoFiltro));
        } else {
            // Se não, busca todos
            q = query(collection(db, "comerciantes"));
        }

        const snapshot = await getDocs(q);
        vitrine.innerHTML = ""; 

        if (snapshot.empty) {
            vitrine.innerHTML = "<p class='col-span-full text-center text-gray-500'>Nenhum comerciante cadastrado nesta região ainda.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const d = doc.data();
            vitrine.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-500">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">${d.cidade} - ${d.estado}</span>
                        <span class="text-xs text-gray-400 italic">${d.categoria}</span>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">${d.nome}</h3>
                    <p class="text-gray-600 my-4 text-sm whitespace-pre-line">${d.descricao}</p>
                    <a href="https://wa.me/${d.whatsapp}" target="_blank" class="block text-center bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition">
                       Ver Produtos / Contato
                    </a>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

// --- FUNÇÃO: CADASTRAR COM LOCALIZAÇÃO ---
const form = document.getElementById('form-cadastro');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novaLoja = {
        estado: document.getElementById('reg-estado').value.toUpperCase(),
        cidade: document.getElementById('reg-cidade').value,
        nome: document.getElementById('reg-nome').value,
        categoria: document.getElementById('reg-categoria').value,
        descricao: document.getElementById('reg-descricao').value,
        whatsapp: document.getElementById('reg-whatsapp').value,
        criadoEm: new Date()
    };

    try {
        await addDoc(collection(db, "comerciantes"), novaLoja);
        alert("Cadastrado com sucesso no Conecta Bairros!");
        form.reset();
        carregarDadosFiltrados(); 
    } catch (e) { alert("Erro ao salvar!"); }
});

// Inicializa a página carregando todos
carregarDadosFiltrados();