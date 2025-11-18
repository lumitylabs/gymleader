// lib/solana-fetcher.js

const { Metaplex, guestIdentity } = require("@metaplex-foundation/js");
const { Connection, PublicKey } = require("@solana/web3.js");

const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");

/**
 * Função auxiliar para fazer o parse do nome do NFT da Solana.
 * Exemplo de entrada: "2006 #100 Charizard-Holo BGS 6.5"
 */
function parseSolanaName(rawName) {
    let year = "N/A";
    let number = "N/A";
    let cleanName = rawName;
    let grader = null;
    let grade = null;

    if (!rawName) return { year, number, cleanName, grader, grade };

    // 1. Extrair Ano (4 dígitos no início)
    const yearMatch = rawName.match(/^(\d{4})/);
    if (yearMatch) {
        year = yearMatch[1];
    }

    // 2. Extrair Número da Carta (Logo após #)
    const numMatch = rawName.match(/#(\w+)/);
    if (numMatch) {
        number = numMatch[1];
    }

    // 3. Extrair Grader e Nota (Procura por PSA, BGS, CGC, SGC, TAG seguidos de número)
    const gradeMatch = rawName.match(/\b(PSA|BGS|CGC|SGC|TAG)\s+(\d+(?:\.\d+)?)/i);
    if (gradeMatch) {
        grader = gradeMatch[1].toUpperCase();
        grade = gradeMatch[2];
    }

    // 4. Limpar o Nome do Pokémon
    // Remove o ano, o número (#123), o grader/nota e sufixos comuns
    cleanName = rawName
        .replace(/^(\d{4})/, '') // Remove ano do inicio
        .replace(/#\w+/, '')     // Remove numero (#100)
        .replace(/\b(PSA|BGS|CGC|SGC|TAG)\s+(\d+(?:\.\d+)?).*/i, '') // Remove Grader e tudo depois dele
        .replace(/-Holo/gi, '')  // Remove sufixo -Holo
        .replace(/1st Editi\w*/gi, '') // Remove "1st Editi..."
        .replace(/1st Ed\b/gi, '')
        .replace(/Shadowless/gi, '')
        .replace(/-/g, ' ') // Troca hifens restantes por espaço
        .trim();

    return { year, number, cleanName, grader, grade };
}

/**
 * Busca e processa NFTs da blockchain Solana usando o SDK Metaplex.
 * @param {string} address - O endereço da carteira Solana.
 * @returns {Promise<Array>} - Uma promessa que resolve para um array de NFTs formatados.
 */
async function fetchSolanaNfts(address) {
    if (!address) {
        return []; 
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
            // Verifica se é COLLECTOR ou se o nome parece uma carta (começa com ano)
            const isCollector = tokenSymbol === 'COLLECTOR' || /^\d{4}\s+#/.test(nft.name);

            if (isCollector) {
                // 1. Faz o parse do nome bagunçado
                const parsed = parseSolanaName(nft.name);
                
                // 2. Tenta pegar atributos existentes ou usa os parseados
                const existingAttributes = nft.json?.attributes || [];
                const existingGrader = existingAttributes.find(a => a.trait_type === "Grading Company")?.value;

                // 3. Cria atributos artificiais para o Aggregator funcionar
                // O aggregator procura por 'Year' e 'Serial Number' (na logica solana)
                const artificialAttributes = [
                    { trait_type: "Year", value: parsed.year },
                    { trait_type: "Serial Number", value: parsed.number }, 
                    { trait_type: "Pokemon Name", value: parsed.cleanName },
                    { trait_type: "Grader", value: parsed.grader || existingGrader },
                    { trait_type: "Grade", value: parsed.grade }
                ];

                // Mescla atributos (priorizando os parseados se os originais faltarem)
                const finalAttributes = [...existingAttributes, ...artificialAttributes];

                acc.push({
                    token_name: nft.name || "N/A", // Nome original completo
                    clean_name: parsed.cleanName,  // Nome limpo (ex: "Charizard")
                    token_image: nft.json?.image || '',
                    attributes: finalAttributes,   // Atributos enriquecidos
                    token_address: nft.address.toBase58(),
                    grader: parsed.grader || existingGrader,
                    grade: parsed.grade
                });
            }
            return acc;
        }, []);

        return pokemonCards;
    } catch (error) {
        console.error('Erro detalhado ao buscar NFTs da Solana:', error);
        throw error;
    }
}

module.exports = { fetchSolanaNfts };