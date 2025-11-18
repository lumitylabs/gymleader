const { fetchFlowNfts } = require('./flow-fetcher.js');
const { fetchSolanaNfts } = require('./solana-fetcher.js');

const extractAttribute = (attributes, traitName) => {
    if (!Array.isArray(attributes)) return "N/A";
    const attribute = attributes.find(attr => attr.trait_type === traitName);
    return attribute ? String(attribute.value) : "N/A";
};

/**
 * Agrega NFTs das carteiras Flow e Solana.
 * @param {object} params
 * @param {string} params.flow_address - Endereço da carteira Flow.
 * @param {string} params.solana_address - Endereço da carteira Solana.
 * @returns {Promise<Array>} - Uma promessa que resolve para um array de cartas agregadas.
 */
async function aggregateCards({ flow_address, solana_address }) {
    const results = await Promise.allSettled([
        fetchFlowNfts(flow_address),
        fetchSolanaNfts(solana_address)
    ]);

    const flowResult = results[0];
    const solanaResult = results[1];
    let allCards = [];

    if (flowResult.status === 'fulfilled') {
        const formattedFlowCards = flowResult.value.map(nft => ({
            token_name: nft.token_name,
            nome: nft.clean_name,
            imagem: nft.token_image,
            serie: extractAttribute(nft.attributes, 'Set Name'),
            ano: extractAttribute(nft.attributes, 'Year'),
            numeracao: extractAttribute(nft.attributes, 'Card Number').replace(/[^0-9a-zA-Z]/g, '') || "N/A",
            token_address: nft.token_address,
            grader: nft.grader,
            chain: 'flow'
        }));
        allCards.push(...formattedFlowCards);
    } else {
        console.error("Falha ao buscar dados da Flow:", flowResult.reason.message);
    }

    if (solanaResult.status === 'fulfilled') {
        const formattedSolanaCards = solanaResult.value.map(nft => ({
            token_name: nft.token_name,
            nome: nft.clean_name,
            imagem: nft.token_image,
            serie: "N/A",
            ano: extractAttribute(nft.attributes, 'Year'),
            numeracao: extractAttribute(nft.attributes, 'Serial Number').replace(/[^0-9a-zA-Z]/g, '') || "N/A",
            token_address: nft.token_address,
            grader: nft.grader,
            chain: 'solana'
        }));
        allCards.push(...formattedSolanaCards);
    } else {
        console.error("Falha ao buscar dados da Solana:", solanaResult.reason.message);
    }

    return allCards;
}

module.exports = { aggregateCards };