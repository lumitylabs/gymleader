// lib/solana-fetcher.js

const { Metaplex, guestIdentity } = require("@metaplex-foundation/js");
const { Connection, PublicKey } = require("@solana/web3.js");

const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

/**
 * Busca e processa NFTs da blockchain Solana usando o SDK Metaplex.
 * @param {string} address - O endereço da carteira Solana.
 * @returns {Promise<Array>} - Uma promessa que resolve para um array de NFTs formatados.
 */
async function fetchSolanaNfts(address) {
    if (!address) {
        return []; // Retorna array vazio se nenhum endereço for fornecido
    }

    try {
        const metaplex = new Metaplex(connection).use(guestIdentity());
        const ownerPublicKey = new PublicKey(address);

        const initialNfts = await metaplex.nfts().findAllByOwner({ owner: ownerPublicKey });

        const nftsWithJson = await Promise.all(
            initialNfts.map(nft => {
                if (!nft.uri) return nft;
                return metaplex.nfts().load({ metadata: nft });
            })
        );

        const pokemonCards = nftsWithJson.reduce((acc, nft) => {
            const tokenSymbol = nft.symbol || "";
            const isCollector = tokenSymbol === 'COLLECTOR';
            const graderValue = nft.json?.attributes?.find(a => a.trait_type === "Grading Company")?.value ?? null;

            if (isCollector) {
                acc.push({
                    token_name: nft.name || "N/A",
                    token_image: nft.json?.image || '',
                    attributes: nft.json?.attributes || [],
                    token_address: nft.address.toBase58(),
                    grader: graderValue
                });
            }
            return acc;
        }, []);

        return pokemonCards;
    } catch (error) {
        console.error('Erro detalhado ao buscar NFTs da Solana:', error);
        // Propaga o erro
        throw error;
    }
}

// Exporta a função no formato CommonJS
module.exports = { fetchSolanaNfts };