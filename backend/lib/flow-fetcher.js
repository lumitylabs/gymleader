// lib/flow-fetcher.js

const dotenv = require('dotenv');
dotenv.config();

/**
 * Busca e processa NFTs da blockchain Flow usando a API da Moralis.
 * Prioriza o parse do campo 'metadata' (string JSON) para extração precisa.
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
                    let metadata = {};

                    // 1. Tenta fazer o parse do JSON string cru (metadata)
                    // Isso é muito mais confiável que o normalized_metadata
                    try {
                        if (nft.metadata && typeof nft.metadata === 'string') {
                            metadata = JSON.parse(nft.metadata);
                        } else {
                            // Fallback se já vier como objeto ou se falhar
                            metadata = nft.normalized_metadata || {};
                        }
                    } catch (e) {
                        console.warn(`[Flow Fetcher] Erro ao parsear metadata do token ${nft.token_id}, usando fallback.`);
                        metadata = nft.normalized_metadata || {};
                    }

                    const attributes = metadata.attributes || [];

                    // Helper para extrair valor dos atributos de forma segura
                    const getAttr = (key) => attributes.find(a => a.trait_type === key)?.value;

                    // 2. Filtros Rigorosos
                    const category = getAttr('Category');
                    const cardType = getAttr('Card Type');

                    // Verifica se é Pokemon
                    const isPokemon = category === 'Pokemon';
                    
                    // Verifica se é Monstro (Ignora Treinadores, Energias, etc)
                    // Se 'Card Type' não existir, assumimos que passa (para não perder cartas antigas mal formatadas),
                    // mas se existir, TEM que ser 'Monster'.
                    const isMonster = cardType ? cardType === 'Monster' : true;

                    if (isPokemon && isMonster) {
                        // Extrai dados limpos diretamente dos atributos
                        const pokemonName = getAttr('Pokemon Name');
                        const grader = getAttr('Grader');
                        const grade = getAttr('Grade');
                        console.log(pokemonName)
                        
                        // Constrói um nome limpo se disponível, senão usa o nome do NFT
                        // Ex: "Raichu" ao invés de "1999 Game Raichu #14..."
                        // Mas mantemos o token_name original como fallback ou para display completo
                        
                        acc.push({
                            token_name: metadata.name || nft.name || "Unknown Card",
                            // Dados específicos para facilitar a vida do aggregator/enricher
                            clean_name: pokemonName, 
                            token_image: metadata.image || '', // URL direta do IPFS
                            attributes: attributes, // Passamos os atributos estruturados para o aggregator usar
                            token_address: nft.token_address,
                            grader: grader,
                            grade: grade
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
        throw error;
    }
}

module.exports = { fetchFlowNfts };