// api/get-enriched-cards.js

const { aggregateCards } = require('../lib/card-aggregator.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');

/**
 * Handler da Vercel que primeiro agrega as cartas das carteiras
 * e depois enriquece cada uma com dados detalhados da TCGdex.
 */
module.exports = async (req, res) => {
    const { flow_address, solana_address } = req.query;

    if (!flow_address && !solana_address) {
        return res.status(400).json({ error: 'Pelo menos um endereço (flow_address ou solana_address) deve ser fornecido.' });
    }

    try {
        // Passo 1: Agregar as cartas das blockchains
        const aggregatedCards = await aggregateCards({ flow_address, solana_address });

        // Passo 2: Enriquecer as cartas agregadas com detalhes
        const enrichedCards = await enrichAllCards(aggregatedCards);

        return res.status(200).json({
            success: true,
            total_cards: enrichedCards.length,
            data: enrichedCards
        });

    } catch (error) {
        console.error('Erro fatal na API get-enriched-cards:', error);
        return res.status(500).json({
            error: 'Falha ao processar a requisição de cartas enriquecidas.',
            details: error.message,
            status: "FAILED"
        });
    }
};