// api/get-enriched-cards.js
const { aggregateCards } = require('../lib/card-aggregator.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');
const { withCors } = require('../lib/withCors.js'); // <--- Importar

const handler = async (req, res) => {
    const { flow_address, solana_address } = req.query;

    if (!flow_address && !solana_address) {
        return res.status(400).json({ error: 'Pelo menos um endereço deve ser fornecido.' });
    }

    try {
        const aggregatedCards = await aggregateCards({ flow_address, solana_address });
        const enrichedCards = await enrichAllCards(aggregatedCards);

        return res.status(200).json({
            success: true,
            total_cards: enrichedCards.length,
            data: enrichedCards
        });

    } catch (error) {
        console.error('Erro fatal:', error);
        return res.status(500).json({
            error: 'Falha ao processar.',
            details: error.message,
            status: "FAILED"
        });
    }
};

// Exportar com CORS
module.exports = withCors(handler);