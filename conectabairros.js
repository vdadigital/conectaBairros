// 1. Configuração do Firebase
var firebaseConfig = {
    apiKey: "AIzaSyBAlXgCQ10YLWYfFi47cXelUKMYAF3DW-Q",
    authDomain: "conectabairros-dea35.firebaseapp.com",
    projectId: "conectabairros-dea35",
    storageBucket: "conectabairros-dea35.firebasestorage.app",
    messagingSenderId: "215834992578",
    appId: "1:215834992578:web:625ef084714b032fcfc05b"
};

// 2. Inicialização Segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
var db = firebase.firestore();

// 3. FUNÇÃO PARA CARREGAR DADOS
window.carregarDadosFiltrados = function() {
    var vitrine = document.getElementById('lista-comerciantes');
    var estadoFiltro = document.getElementById('filtro-estado').value;
    
    if (!vitrine) {
        console.error("Erro: A div 'lista-comerciantes' não foi encontrada no HTML!");
        return;
    }

    vitrine.innerHTML = "<p class='col-span-full text-center'>Buscando no bairro...</p>";

    var query = db.collection("comerciantes");
    if (estadoFiltro) {
        query = query.where("estado", "==", estadoFiltro);
    }

    query.get().then(function(snapshot) {
        vitrine.innerHTML = "";
        
        if (snapshot.empty) {
            vitrine.innerHTML = "<p class='col-span-full text-center'>Nenhum comércio cadastrado nesta região.</p>";
            return;
        }

        snapshot.forEach(function(doc) {
            var d = doc.data();
            vitrine.innerHTML += 
                '<div class="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-500 mb-4">' +
                    '<span class="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">' + (d.cidade || "") + ' - ' + (d.estado || "") + '</span>' +
                    '<h3 class="text-xl font-bold text-gray-800 mt-2">' + (d.nome || "Sem Nome") + '</h3>' +
                    '<p class="text-gray-600 my-4 text-sm">' + (d.descricao || "") + '</p>' +
                    '<a href="https://wa.me/' + d.whatsapp + '" target="_blank" class="block text-center bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600 transition">Conversar no WhatsApp</a>' +
                '</div>';
        });
    }).catch(function(error) {
        console.error("Erro ao carregar dados:", error);
        vitrine.innerHTML = "<p class='col-span-full text-center text-red-500'>Erro ao carregar os dados.</p>";
    });
};

// 4. FUNÇÃO PARA SALVAR
var form = document.getElementById('form-cadastro');
if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var novaLoja = {
            estado: document.getElementById('reg-estado').value.toUpperCase(),
            cidade: document.getElementById('reg-cidade').value,
            nome: document.getElementById('reg-nome').value,
            categoria: document.getElementById('reg-categoria').value,
            descricao: document.getElementById('reg-descricao').value,
            whatsapp: document.getElementById('reg-whatsapp').value,
            criadoEm: new Date()
        };

        db.collection("comerciantes").add(novaLoja).then(function() {
            alert("Cadastrado com sucesso!");
            form.reset();
            window.carregarDadosFiltrados();
        }).catch(function(error) {
            console.error("Erro ao salvar:", error);
            alert("Erro ao salvar!");
        });
    });
}

// 5. Inicializa a lista ao abrir a página
window.carregarDadosFiltrados();