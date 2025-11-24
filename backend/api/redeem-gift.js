const { fetchSolanaNftsByMints } = require('../lib/solana-fetcher.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');
const { findPokemonId } = require('../lib/pokemon-mapper.js');
const { db } = require('../lib/firebase-admin.js');
const { withCors } = require('../lib/withCors.js');

const GIFT_MINTS = [
    "3pZFcEpoc5ub6cNNfw8m92Kbi7AvGm4Y2QrfZEvoLoCA",
    "4fXMwuFVyENwtqzChyDEA4QWpJYVRUHBHe2gRXwvYKNS",
    "CcizkBD6iognwY3qqecthqnqMA7tcwmFwo4V2vzoWBRK",
    "A81y9XqYmhASEMgMkbWzvPZgSZUevPwtVGibuMDzVFT2",
    "ss4bn6r9wGmWBXwDLz3ikVtvCss6QD57dL5iKeJuPbx",
    "CViyvDfHccyj5Uw9mc4sngmCqbrbmP64YH4wRzBffviy",
    "CVamzfzZ3oQKyhpXcVh4tiYAudF1GTUnqT4MMmASRDBj",
    "5SM8Qpu1qEtuRfCUYf7M3NgFPTEzDvkRNv7kfKvcf2Ej"
];

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, selectedCardIds } = req.body;

    if (!userId || !selectedCardIds || !Array.isArray(selectedCardIds)) {
        return res.status(400).json({ error: 'Invalid request data' });
    }

    if (selectedCardIds.length > 3) {
        return res.status(400).json({ error: 'Max 3 cards allowed' });
    }

    // Validate selection against allowed list
    const invalidSelection = selectedCardIds.some(id => !GIFT_MINTS.includes(id));
    if (invalidSelection) {
        return res.status(400).json({ error: 'Invalid card selection' });
    }

    try {
        // Check if already redeemed
        const userMetaRef = db.ref(`users/${userId}/metadata`);
        const metaSnapshot = await userMetaRef.once('value');
        const meta = metaSnapshot.val() || {};

        if (meta.giftRedeemed) {
            return res.status(400).json({ error: 'Gift already redeemed' });
        }

        // Fetch from Cache (Optimized)
        const cacheSnapshot = await db.ref('system/gift_cards').once('value');
        const cachedCards = cacheSnapshot.val() || {};
        
        const enrichedCards = selectedCardIds.map(id => cachedCards[id]).filter(Boolean);

        if (enrichedCards.length !== selectedCardIds.length) {
             // Fallback: If cache is missing some cards (rare), fetch them
             console.log("Cache miss during redeem, fetching from Solana...");
             const rawCards = await fetchSolanaNftsByMints(selectedCardIds);
             const formattedCards = rawCards.map(card => ({
                token_name: card.token_name,
                nome: card.clean_name,
                imagem: card.token_image,
                serie: "N/A",
                ano: card.attributes.find(a => a.trait_type === 'Year')?.value || "N/A",
                numeracao: (card.attributes.find(a => a.trait_type === 'Serial Number')?.value || "N/A").replace(/[^0-9a-zA-Z]/g, ''),
                token_address: card.token_address,
                grader: card.grader,
                chain: 'solana'
            }));
            const fetchedEnriched = await enrichAllCards(formattedCards);
            enrichedCards.push(...fetchedEnriched);
        }

        const collectionUpdates = {};
        const cardUpdates = {};

        enrichedCards.forEach(card => {
            const pokedexId = findPokemonId(card.nome);
            if (!pokedexId) return;

            const uniqueKey = `${card.chain}_${card.token_address}_${card.numeracao}`.replace(/[.#$/[\]]/g, '_');
            
            const cardData = {
                name: card.nome,
                fullName: card.nome,
                pokedexId: pokedexId,
                cardId: card.numeracao,
                image: card.imagem,
                original: card.details?.image || null,
                chain: card.chain,
                grader: card.grader || "Raw",
                grade: card.grader ? (card.nome.match(/(\d+(\.\d+)?)$/)?.[0] || "N/A") : null,
                types: card.details?.types || [],
                rarity: card.details?.rarity || "Common",
                token_address: card.token_address,
                lastUpdated: Date.now(),
                source: 'gift', // Mark as gift
                tag: 'OAK GIFT' // Custom tag for sidebar
            };

            collectionUpdates[`users/${userId}/collection/${uniqueKey}`] = cardData;
            
            // Also update global cards
            cardUpdates[`cards/${card.token_address}`] = {
                ...card,
                pokedexId,
                original: card.details?.image || null,
                lastUpdated: Date.now()
            };
        });

        // Atomic Update
        await db.ref().update({
            ...collectionUpdates,
            ...cardUpdates,
            [`users/${userId}/metadata/giftRedeemed`]: true
        });

        return res.status(200).json({ success: true, count: enrichedCards.length });

    } catch (error) {
        console.error('Redeem Gift Error:', error);
        return res.status(500).json({ error: 'Failed to redeem gift' });
    }
};

module.exports = withCors(handler);
