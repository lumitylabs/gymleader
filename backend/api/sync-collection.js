// api/sync-collection.js
const { aggregateCards } = require('../lib/card-aggregator.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');
const { findPokemonId } = require('../lib/pokemon-mapper.js');
const { db } = require('../lib/firebase-admin.js');
const { withCors } = require('../lib/withCors.js');

const handler = async (req, res) => {
    // Pegamos os dados originais (suas carteiras vazias)
    const { userId, flow_address, solana_address } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // ============================================================
    // 🔴 MODO DEMO PARA VÍDEO (Hackathon)
    // Mude para FALSE quando terminar de gravar
    const DEMO_MODE = true; 

    // Endereços "Ricos" para o vídeo
    const DEMO_FLOW = "0xad050BF165033DD1b86D23a75504e079B2053F2C";
    const DEMO_SOLANA = "Di5xtPy1mSd8F51xa31FM2RzTiWL6FxUQ3o5rXwaVTuT";
    // ============================================================

    try {
        // 1. Salvar as carteiras REAIS no Firebase (para manter a consistência visual no perfil)
        // Isso garante que no menu do usuário apareça a SUA carteira, não a fake.
        const updates = {};
        if (flow_address) updates[`users/${userId}/wallets/flow`] = flow_address;
        if (solana_address) updates[`users/${userId}/wallets/solana`] = solana_address;
        
        if (Object.keys(updates).length > 0) {
            await db.ref().update(updates);
        }

        // 2. Definir quais carteiras usar para BUSCAR AS CARTAS
        let targetFlow = flow_address;
        let targetSolana = solana_address;

        // Se não vieram no body, busca do banco
        if (!targetFlow || !targetSolana) {
            const snapshot = await db.ref(`users/${userId}/wallets`).once('value');
            const wallets = snapshot.val() || {};
            targetFlow = targetFlow || wallets.flow;
            targetSolana = targetSolana || wallets.solana;
        }

        // --- AQUI ACONTECE A MÁGICA ---
        // Se o modo demo estiver ativo, ignoramos a carteira do usuário e usamos a rica
        if (DEMO_MODE) {
            console.log("🎥 DEMO MODE ATIVO: Usando carteiras ricas para fetch.");
            targetFlow = DEMO_FLOW;
            targetSolana = DEMO_SOLANA;
        }
        // ------------------------------

        // 3. Buscar e Enriquecer Cartas (Usando targetFlow/targetSolana)
        const aggregatedCards = await aggregateCards({ 
            flow_address: targetFlow, 
            solana_address: targetSolana 
        });
        
        const enrichedCards = await enrichAllCards(aggregatedCards);

        // ... (O resto do código continua igual) ...
        const collectionData = {};
        let cardCount = 0;

        enrichedCards.forEach(card => {
            const pokedexId = findPokemonId(card.nome);
            if (!pokedexId) return; 

            const uniqueKey = `${card.chain}_${card.token_address}_${card.numeracao}`.replace(/[.#$/[\]]/g, '_');

            collectionData[uniqueKey] = {
                name: card.nome,
                fullName: card.nome,
                pokedexId: pokedexId,
                cardId: card.numeracao,
                image: card.imagem,
                officialArt: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${pokedexId}.gif`,
                chain: card.chain,
                grader: card.grader || "Raw",
                grade: card.grader ? (card.nome.match(/(\d+(\.\d+)?)$/)?.[0] || "N/A") : null,
                types: card.details?.types || [],
                rarity: card.details?.rarity || "Common",
                token_address: card.token_address,
                lastUpdated: Date.now()
            };
            cardCount++;
        });

        await db.ref(`users/${userId}/collection`).set(collectionData);
        await db.ref(`users/${userId}/metadata`).update({
            lastSync: Date.now(),
            totalCards: cardCount
        });

        return res.status(200).json({ success: true, count: cardCount });

    } catch (error) {
        console.error('Sync Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = withCors(handler);