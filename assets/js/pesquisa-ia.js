(() => {
    const form = document.getElementById('form-pesquisa-ia');
    const campo = document.getElementById('pergunta-ia');
    const resposta = document.getElementById('resposta-ia');
    const lista = document.getElementById('resultados-ia');
    const botao = form.querySelector('button[type="submit"]');
    const palavrasComuns = new Set('onde como tem acho alguem encontro encontrar preciso quero gostaria pode consigo procura procurar perto bairro cidade voce voces quais qual quem para uma uns umas dos das pelo pela com que algum alguma existe saber tem serviço serviços'.split(' ').map(normalizarTexto));

    function selecionarAnuncios(pergunta, snapshot) {
        const termos = [...new Set(normalizarTexto(pergunta).match(/[a-z0-9]+/g) || [])]
            .filter(termo => termo.length > 2 && !palavrasComuns.has(termo));
        const anuncios = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            if (!profissaoDoAnuncio(dados)) return;
            const anuncio = { id: doc.id };
            for (const campo of ['nome', 'profissao', 'descricao', 'bairro', 'cidade', 'estado']) {
                anuncio[campo] = String(dados[campo] ?? '').trim().slice(0, campo === 'descricao' ? 400 : 100);
            }
            if (!anuncio.nome) return;
            const servico = normalizarTexto([anuncio.nome, anuncio.profissao, anuncio.descricao].join(' '));
            const local = normalizarTexto([anuncio.bairro, anuncio.cidade, anuncio.estado].join(' '));
            const pontos = termos.reduce((total, termo) => total + (servico.includes(termo) ? 3 : 0) + (local.includes(termo) ? 2 : 0), 0);
            anuncios.push({ anuncio, pontos });
        });
        // Se a pergunta usar um sinônimo, mantenha alguns anúncios disponíveis para a IA avaliar.
        return anuncios.sort((a, b) => b.pontos - a.pontos).slice(0, 12).map(item => item.anuncio);
    }

    function mostrarAnuncios(anuncios) {
        for (const anuncio of anuncios) {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = 'negocio.php?id=' + encodeURIComponent(anuncio.id);
            link.className = 'font-semibold text-blue-700 underline';
            link.textContent = anuncio.nome + ' — ' + anuncio.profissao;
            const local = [anuncio.bairro, anuncio.cidade, anuncio.estado].filter(Boolean).join(', ');
            item.append(link, local ? ' · ' + local : '');
            lista.append(item);
        }
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (botao.disabled) return;
        const pergunta = campo.value.trim();
        lista.replaceChildren();
        if (pergunta.length < 3) {
            resposta.textContent = 'Digite uma pergunta com pelo menos três caracteres.';
            return;
        }
        if (!ultimoSnapshot) {
            resposta.textContent = 'O catálogo ainda não está disponível. Tente novamente em instantes.';
            return;
        }
        const anuncios = selecionarAnuncios(pergunta, ultimoSnapshot);
        if (!anuncios.length) {
            resposta.textContent = 'O balcão ainda não tem profissionais de mão de obra cadastrados.';
            return;
        }

        botao.disabled = true;
        resposta.textContent = 'Consultando os anúncios cadastrados…';
        try {
            const requisicao = await fetch('api/pesquisa-ia.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pergunta, anuncios }),
                signal: AbortSignal.timeout(25000)
            });
            const dados = await requisicao.json();
            if (!requisicao.ok) {
                resposta.textContent = dados.erro || 'A pesquisa com IA está indisponível. Use os filtros do balcão.';
                return;
            }
            resposta.textContent = dados.resposta;
            mostrarAnuncios(dados.indices.map(indice => anuncios[indice]).filter(Boolean));
        } catch {
            resposta.textContent = 'Não foi possível consultar a IA. Use os filtros do balcão ou tente novamente.';
        } finally {
            botao.disabled = false;
        }
    });
})();
