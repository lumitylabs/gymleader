// lib/flow-fetcher.js

const dotenv = require('dotenv');
dotenv.config();

/**
 * Busca e processa NFTs da blockchain Flow usando a API da Moralis.
 * @param {string} address - O endereço da carteira EVM (Flow).
 * @returns {Promise<Array>} - Uma promessa que resolve para um array de NFTs formatados.
 */
async function fetchFlowNfts(address) {
    const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
    const EVM_ADDRESS = address;
    const PAGINATION_LIMIT = 100;

    if (!MORALIS_API_KEY) {
        throw new Error("Erro de Configuração: MORALIS_API_KEY não foi definida no ambiente.");
    }
    if (!EVM_ADDRESS) {
        // Retorna um array vazio se nenhum endereço for fornecido, em vez de usar um padrão.
        return [];
    }

    const allPokemonCards = [];
    let cursor = null;
    const headers = { 'accept': 'application/json', 'X-API-Key': MORALIS_API_KEY };

    try {
        do {
            const baseUrl = `https://deep-index.moralis.io/api/v2.2/${EVM_ADDRESS}/nft?chain=flow&format=decimal&limit=${PAGINATION_LIMIT}`;
            const url = cursor ? `${baseUrl}&cursor=${cursor}` : baseUrl;

            const response = await fetch(url, { headers });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha na API Moralis: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.result && data.result.length > 0) {
                const pokemonCardsOnPage = data.result.reduce((acc, nft) => {
                    
                    const normMeta = nft.normalized_metadata || {};
                    const attributes = normMeta.attributes || [];
                    const isPokemon = attributes.some(attr => attr.trait_type === 'Category' && attr.value === 'Pokemon');
                    const graderValue = attributes.find(a => a.trait_type === "Grader")?.value ?? null;
                    
                    if (isPokemon) {
                        acc.push({
                            token_name: normMeta.name || nft.name || "N/A",
                            token_image: normMeta.image || '',
                            attributes: attributes,
                            token_address: nft.token_address,
                            grader: graderValue
                        });
                    }
                    return acc;
                }, []);
                allPokemonCards.push(...pokemonCardsOnPage);
            }
            cursor = data.cursor;
        } while (cursor);

        return allPokemonCards;
    } catch (error) {
        console.error('Erro detalhado ao buscar NFTs da Flow:', error);
        // Propaga o erro para que a API principal possa tratá-lo
        throw error;
    }
}

// Exporta a função para que possa ser usada em 'api/fetchCards.js'
module.exports = { fetchFlowNfts };