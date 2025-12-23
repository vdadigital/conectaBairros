import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuração oficial
const firebaseConfig = {
  apiKey: "AIzaSyBAlXgCQ10YLWYfFi47cXelUKMYAF3DW-Q",
  authDomain: "conectabairros-dea35.firebaseapp.com",
  projectId: "conectabairros-dea35",
  storageBucket: "conectabairros-dea35.firebasestorage.app",
  messagingSenderId: "215834992578",
  appId: "1:215834992578:web:625ef084714b032fcfc05b",
  measurementId: "G-6JKL4S2LXD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- FUNÇÃO: CARREGAR DADOS ---
async function carregarDados() {
    const vitrine = document.getElementById('lista-comerciantes');
    if (!vitrine) return;

    try {
        const q = query(collection(db, "comerciantes"));
        const snapshot = await getDocs(q);
        vitrine.innerHTML = ""; 

        snapshot.forEach((doc) => {
            const d = doc.data();
            
            // Lógica de ícones e cores
            let icone = 'storefront'; 
            let corBadge = 'bg-blue-100 text-blue-700';

            const cat = d.categoria ? d.categoria.toLowerCase() : "";
            if (cat.includes('alimento') || cat.includes('padaria') || cat.includes('pães')) {
                icone = 'restaurant';
                corBadge = 'bg-orange-100 text-orange-700';
            } else if (cat.includes('serviço') || cat.includes('manutenção')) {
                icone = 'build';
                corBadge = 'bg-purple-100 text-purple-700';
            }

            vitrine.innerHTML += `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    <div class="p-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1 rounded-full text-xs font-bold ${corBadge}">
                                ${d.categoria || 'Geral'}
                            </span>
                            <span class="material-icons text-gray-300 group-hover:text-blue-500 transition-colors">
                                ${icone}
                            </span>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">${d.nome}</h3>
                        <p class="text-gray-500 text-sm leading-relaxed mb-6 h-12 overflow-hidden">
                            ${d.descricao || 'Sem descrição.'}
                        </p>
                        <a href="https://wa.me/${d.whatsapp}" target="_blank" 
                           class="flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 shadow-lg shadow-green-100 transition-all">
                           <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" class="w-5 h-5" alt="WhatsApp">
                           Conversar Agora
                        </a>
                    </div>
                </div>`;
        });
    } catch (e) { 
        console.error("Erro ao carregar:", e); 
    }
}

// --- FUNÇÃO: CADASTRAR DADOS ---
const form = document.getElementById('form-cadastro');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novaLoja = {
            nome: document.getElementById('reg-nome').value,
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value,
            whatsapp: document.getElementById('reg-whatsapp').value,
            criadoEm: new Date()
        };

        try {
            await addDoc(collection(db, "comerciantes"), novaLoja);
            alert("Cadastrado com sucesso!");
            form.reset();
            carregarDados(); 
        } catch (e) { 
            alert("Erro ao salvar! Verifique as regras do Firebase."); 
        }
    });
}

carregarDados();