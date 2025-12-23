import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Sua configuração oficial do Firebase
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
    try {
        const q = query(collection(db, "comerciantes"));
        const snapshot = await getDocs(q);
        vitrine.innerHTML = ""; 

        snapshot.forEach((doc) => {
            const d = doc.data();
            vitrine.innerHTML += `
                <div class="bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500 hover:scale-105 transition-transform">
                    <span class="text-xs font-bold text-blue-600 uppercase">${d.categoria}</span>
                    <h3 class="text-xl font-bold mt-2">${d.nome}</h3>
                    <p class="text-gray-600 my-4 text-sm">${d.descricao}</p>
                    <a href="https://wa.me/${d.whatsapp}" target="_blank" class="inline-block bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600">Falar no WhatsApp</a>
                </div>`;
        });
    } catch (e) { console.error("Erro:", e); }
}

// --- FUNÇÃO: CADASTRAR DADOS ---
const form = document.getElementById('form-cadastro');
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
        carregarDados(); // Atualiza a lista sem recarregar
    } catch (e) { alert("Erro ao salvar! Verifique as regras do Firebase."); }
});

carregarDados();