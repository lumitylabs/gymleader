const { fetchSolanaNftsByMints } = require('../lib/solana-fetcher.js');
const { enrichAllCards } = require('../lib/tcgdex-enricher.js');
const { withCors } = require('../lib/withCors.js');

const GIFT_MINTS = [
    "4fXMwuFVyENwtqzChyDEA4QWpJYVRUHBHe2gRXwvYKNS",
    "CcizkBD6iognwY3qqecthqnqMA7tcwmFwo4V2vzoWBRK",
    "A81y9XqYmhASEMgMkbWzvPZgSZUevPwtVGibuMDzVFT2",
    "ss4bn6r9wGmWBXwDLz3ikVtvCss6QD57dL5iKeJuPbx",
    "CViyvDfHccyj5Uw9mc4sngmCqbrbmP64YH4wRzBffviy",
    "CVamzfzZ3oQKyhpXcVh4tiYAudF1GTUnqT4MMmASRDBj",
    "2xHkpRUkAepj3UHuQF3nH6LkJB1tHEnb8mNH4GsxLo4d", //squirtle
    "6GZu5t2asWpoxncKANDfZ4Wb9PEQYddoGkiYyRXNMTHo", //evee
    // "74QyGxUjcWnJoQicR3fVecQ1QkBk9X2KowGQUA2bXRiu", // persian
    // "41AudbcmhAg9ymd6pqvhKCtDpG4TB18hWn4DqkCJ26hn", // ninetales
    // "DMuYix69PtxZi9nX7MDSmgYWhXDV52BLcFH6Pd6gih7q", // drowzee
    // "DUzfgoPZq1cNGiQVycHSiLL2dXXcbYrfyaxdwBdJiMQG", // hypno
    // "BQyiVEZxwawh5BJ2gNDjXYDa5KriMT7wzgXfWJewZDSQ", // kadabra
    // "AY4dFTzrKpCg6F2EPkgumjkNf2iymfGLDqRQWMYAY4jW", // charmeleon
    // "9JfAbHSE1LzeyjX25RXJCEkRPMXFUPjTruH1ssWMipy6", // lapas
    // "G4Fc7yL4T68t26gFGBx8cNFhiPxgcs67YdCj2LZ4L1m6", // lickitung
    // "GJBpM8vCnaRz1RCGDE4X8j3k8G7b1NKHtpS9WEgTUPt8", //dewgong 
    // "CobaacekAU2MUm5TgvjN1HHrkcfw7rj6BFtC7DZVSJBd", //cloyster
    // "9ZeqMbsGJzZkphmMREKpooMR3jZDe97SGgdtdvQsBGeJ", //slowbrow
    // "A5RUALqJTXhXvgnCZMdNcLXWBPgrpEsWEvM7y7LjCe9j", //onix
    // "3vgWRz8rWkAjW2gdVkeKU2NP6vAuqVg6zadGNMZnV4w1", //hitmonchan
    // "PwxCawWxCrxfVkjedX75zFdN9XtbcPL5jNtWza9VHxi", //hitmonlee
    // "4i9YzBaYtw4ngzSuoqPYJNffjLznuqC5LqorMwwXdG3K", //gengar
    // "BZStMfj7B8ab3KJyh4MWAnKSamegv64NCawi5Y6QkWXP", //golbat
    // "DLhzo21zBr17aFnk5zZhLowjHjF63K7pTYHe86osLHBv", //haunter
    // "CNRsNKp6BnADCvgL4BQF6bWzb5fYYxo7uYJurvUXLX5E", //gyarados
    // "2m38XzR9RpPkccRnRgAP9TdJHxmAm9CZoNQg8tdeW1P5", //dragonair
    // "f3ETWtQjckuNG9AeuciwzMiRjw9pnA6sy4caikkcYHf", //dragonite
    // "B6UBLsFAH9iBisDPE9aZndtFciMPsJBPmwkZA2DyEhoQ", //Zubat
    // "8ePRrNTcGAG1g8zcETA5ZuWkRiAWPru39E2pjeAmu3Qn", //Staryu
    // "5n1pPj38U3mfghMaCCtThiMgoKZEEaFUxfcbTfdvwsQd", //Starmie
    // "12aUfS4bWGY9Kg86EhxevVzQjT2DfNxxzgcXjpTC7Eyi", //Togepi
    // "42FWB5Fv4isHaMUcNg93Bs7QgpT7x5LxvQDuG92w5kKg", //Voltorb
    // "D6HKg3sHNg3hdgTNwwtwcFpmasJ7iWQMwiMD5ZuUA6d4", //Pikachu
    // "9T79JhUYb8LsGBL8uZX2HxCK9dd4fsvYUnzAbFkk9uLf", //Raichu
    // "oV3rKb72MdbgiFZQJGuW8q1qpwyB4WZE3dypg1d4dyP", //Tangela
    // "CsB94HyJvEdkUBdcSSctqXB4zCywqBQuSdFd1rS5V116", //Weepinbell
    // "DEGnxyaGQqe2MyDJEWpT6qd2Z1Z5w6V9H5Vo3PqZAXco", //Gloom
    // "B9pTJDBeoaoMTuMgCUSFxgM8B8L6roWWQUACAZZRJ9B5", //Venonat
    // "9vvy9UwAzai5YMgPXHnunu7kiBTLrxpCsSQnVTzWXoMx", //Venomoth
    // "6Xiawkr5AgcnwWT4osjPJdLKusKShZESQ9h69NBaWZNh", //Muk
    // "725SJBFRcAJeNJCDkNuPPtPCyuRuKbrRaQb7d2gFZaDb", //Abra
    // "BQyiVEZxwawh5BJ2gNDjXYDa5KriMT7wzgXfWJewZDSQ", //Kadabra
    // "3Mn1A5d1UXazaVU2A7hgc7R3jLTHVcVoiwEkCE9DhRUs", //Alakazam
    // "41AudbcmhAg9ymd6pqvhKCtDpG4TB18hWn4DqkCJ26hn", //Ninetales
    // "GWr8rJJRbxpUyNmraskAYqCKttNjsnws4JCkGsBxcLHe",//Rapidash
    // "35XJJJVCD7TP5NWm9R3TCFGTFWKJciE8patRgM3kgfX1",//Arcanine
    // "74QyGxUjcWnJoQicR3fVecQ1QkBk9X2KowGQUA2bXRiu", //Persian
    // "2j9Vi9EGsLUShoLN14htvAjtbAUqKvFEEN3SudytjYLf",//Nidoking
    // "99mPvuotUT5FS6oe6orpTZzoX9UwSjPFuye55RTrFC2g",//Rhydon
    // "HhvC5VxmivKXDYXjeN83n7xyjJ8ihGURfGiMJzSqJKVt",//Geodude

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
