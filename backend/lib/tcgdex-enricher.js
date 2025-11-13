// lib/tcgdex-enricher.js

// (A função parsePokemonName permanece a mesma)
function parsePokemonName(nftName) {
    const parts = nftName.split('#');
    if (parts.length < 2) {
        return nftName.replace(/\b(PSA|CGC|TAG|SGC)\s*\d{1,2}(\.\d)?\b/gi, '').trim();
    }
    const beforeHash = parts[0].trim();
    const afterHash = parts[1].trim();
    if (beforeHash.length <= 5 && /^\d{4}$/.test(beforeHash)) {
        let name = afterHash.replace(/^\S+\s*/, '');
        return name.replace(/\//g, '&').replace(/-/g, ' ').trim();
    } else {
        let name = beforeHash.replace(/^\d{4}\s*/, '');
        return name.trim();
    }
}

/**
 * Função auxiliar que busca o ano de lançamento de um set, utilizando um cache.
 * @param {string} setId - O ID do set (ex: "base1").
 * @param {Map} setCache - O cache em memória para armazenar os resultados.
 * @returns {Promise<number|null>} - O ano de lançamento ou null.
 */
async function getSetReleaseYear(setId, setCache) {
    // 1. Consulta o cache primeiro
    if (setCache.has(setId)) {
        console.log(`[DEBUG] CACHE HIT para o set: ${setId}`);
        return setCache.get(setId);
    }

    // 2. Se não estiver no cache, busca na API
    try {
        console.log(`[DEBUG] CACHE MISS. Buscando dados para o set: ${setId}`);
        const response = await fetch(`https://api.tcgdex.net/v2/en/sets/${setId}`);
        if (!response.ok) {
            setCache.set(setId, null); // Armazena null para não tentar buscar de novo
            return null;
        }
        const setData = await response.json();
        if (setData && setData.releaseDate) {
            const year = new Date(setData.releaseDate).getFullYear();
            setCache.set(setId, year); // 3. Armazena o resultado no cache
            return year;
        }
    } catch (e) {
        console.error(`[DEBUG] Erro ao buscar o set ${setId}:`, e.message);
    }
    
    setCache.set(setId, null);
    return null;
}

/**
 * Encontra a melhor correspondência, usando o ano (com cache) para desempate.
 * @param {object} card - O objeto da carta original.
 * @param {string} parsedName - O nome limpo da carta.
 * @param {Array} searchResults - Os resultados da API.
 * @param {Map} setCache - O cache de sets compartilhado.
 * @returns {Promise<object|null>} - O melhor resultado.
 */
async function findBestMatch(card, parsedName, searchResults, setCache) {
    if (!searchResults || searchResults.length === 0) return null;

    const targetIdLower = card.numeracao.toLowerCase();
    const targetIdAsInt = parseInt(card.numeracao, 10);

    const candidates = searchResults.filter(result => {
        const resultIdLower = result.localId.toLowerCase();
        const resultIdAsInt = parseInt(result.localId, 10);
        return (resultIdLower === targetIdLower) || 
               (!isNaN(targetIdAsInt) && resultIdAsInt === targetIdAsInt);
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const nameWords = parsedName.toLowerCase().split(' ');
    const scoredCandidates = candidates.map(c => {
        let score = 0;
        const candidateNameLower = c.name.toLowerCase();
        nameWords.forEach(word => {
            if (candidateNameLower.includes(word)) score++;
        });
        return { ...c, score };
    });

    const maxScore = Math.max(...scoredCandidates.map(c => c.score));
    const topCandidates = scoredCandidates.filter(c => c.score === maxScore);

    if (topCandidates.length === 1) return topCandidates[0];

    console.log(`[DEBUG] DESAMBIGUAÇÃO POR ANO para "${parsedName}". Candidatos:`, topCandidates.map(c => c.id));
    
    let bestByYear = null;
    let smallestYearDiff = Infinity;

    for (const candidate of topCandidates) {
        const setId = candidate.id.split('-')[0];
        const releaseYear = await getSetReleaseYear(setId, setCache);

        if (releaseYear) {
            const yearDiff = Math.abs(releaseYear - parseInt(card.ano, 10));
            console.log(`[DEBUG] Candidato ${candidate.id}: Ano Lançamento ${releaseYear}, Ano Alvo ${card.ano}, Diferença ${yearDiff}`);
            if (yearDiff < smallestYearDiff) {
                smallestYearDiff = yearDiff;
                bestByYear = candidate;
            }
        }
    }

    console.log(`[DEBUG] Melhor correspondência por ano: ${bestByYear ? bestByYear.id : 'Nenhum'}`);
    return bestByYear || topCandidates[0];
}

async function fetchCardDetails(card, setCache) { // Aceita o cache como argumento
    console.log(`\n============================================================`);
    console.log(`[DEBUG] INICIANDO BUSCA PARA: "${card.nome}" | Num: ${card.numeracao}`);

    if (!card.numeracao || card.numeracao.toLowerCase() === "na") {
        console.log(`[DEBUG] PULAR: Carta sem numeração válida.`);
        return null;
    }

    const parsedName = parsePokemonName(card.nome);
    console.log(`[DEBUG] Nome parseado para busca: "${parsedName}"`);

    if (!parsedName) {
        console.log(`[DEBUG] PULAR: Nome parseado resultou em string vazia.`);
        return null;
    }

    let bestMatch = null;

    const searchUrl = `https://api.tcgdex.net/v2/en/cards?name=like:${encodeURIComponent(parsedName.split(' ').join('|'))}&localId=${card.numeracao}`;
    
    console.log(`\n[DEBUG] TENTATIVA OTIMIZADA: ${searchUrl}`);
    try {
        const response = await fetch(searchUrl);
        if (response.ok) {
            const results = await response.json();
            console.log(`[DEBUG] Resultados da API: ${results.length}`);
            bestMatch = await findBestMatch(card, parsedName, results, setCache); // Passa o cache
        }
    } catch (e) {
        console.error(`[DEBUG] ERRO na busca:`, e.message);
    }

    if (!bestMatch) {
        console.log('--- [DEBUG] FALHA! NENHUMA CORRESPONDÊNCIA ENCONTRADA. ---');
        return null;
    }

    console.log('--- [DEBUG] SUCESSO! CORRESPONDÊNCIA ENCONTRADA: ', bestMatch.id);
    try {
        const detailsUrl = `https://api.tcgdex.net/v2/en/cards/${bestMatch.id}`;
        const detailsResponse = await fetch(detailsUrl);
        if (!detailsResponse.ok) return null;
        
        const details = await detailsResponse.json();
        console.log(`--- [DEBUG] DETALHES FINAIS ENCONTRADOS PARA ${bestMatch.id} ---`);
        return {
            abilities: details.abilities || [],
            attacks: details.attacks || [],
            weaknesses: details.weaknesses || [],
            resistances: details.resistances || [],
            types: details.types || [],
            hp: details.hp || null,
            retreat: details.retreat || 0,
            stage: details.stage || "N/A",
            image: details.image || null
        };
    } catch (error) {
        console.error(`[DEBUG] Erro ao buscar detalhes finais para ${bestMatch.id}:`, error.message);
        return null;
    }
}

/**
 * Orquestra o enriquecimento de uma lista de cartas, criando e gerenciando o cache.
 * @param {Array<object>} cards - Array de cartas agregadas.
 * @returns {Promise<Array>} - Array de cartas com um novo campo 'details'.
 */
async function enrichAllCards(cards) {
    // 1. Cria o cache que será compartilhado por todas as chamadas dentro desta execução.
    const setCache = new Map();

    // 2. Mapeia cada carta para uma promessa, passando o cache para cada uma.
    const enrichedCardsPromises = cards.map(card => fetchCardDetails(card, setCache));
    
    const detailsResults = await Promise.all(enrichedCardsPromises);
    return cards.map((card, index) => ({
        ...card,
        details: detailsResults[index]
    }));
}

module.exports = { enrichAllCards };