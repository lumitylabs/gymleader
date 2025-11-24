const { fetchSolanaNftsByMints } = require('../lib/solana-fetcher.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');
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

const { db } = require('../lib/firebase-admin.js');

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Check Cache
        const cacheRef = db.ref('system/gift_cards');
        const cacheSnapshot = await cacheRef.once('value');
        const cachedCards = cacheSnapshot.val();

        if (cachedCards) {
            console.log("CACHE HIT: Returning gift cards from Firebase.");
            return res.status(200).json({ cards: Object.values(cachedCards) });
        }

        console.log("CACHE MISS: Fetching gift cards from Solana...");

        // 2. Fetch raw NFT data from Solana
        const rawCards = await fetchSolanaNftsByMints(GIFT_MINTS);

        // 3. Format for Enricher (needs 'chain' property)
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

        // 4. Enrich with TCGDex data
        const enrichedCards = await enrichAllCards(formattedCards);

        // 5. Save to Cache
        const cacheUpdate = {};
        enrichedCards.forEach(card => {
            cacheUpdate[card.token_address] = card;
        });
        await cacheRef.set(cacheUpdate);

        return res.status(200).json({ cards: enrichedCards });

    } catch (error) {
        console.error('Gift Options Error:', error);
        return res.status(500).json({ error: 'Failed to fetch gift options' });
    }
};

module.exports = withCors(handler);
