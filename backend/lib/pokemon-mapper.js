// lib/pokemon-mapper.js
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse'); // Instale: npm install papaparse

let pokemonCache = null;

function loadPokemonData() {
    if (pokemonCache) return pokemonCache;
    
    try {
        // Assumindo que pokemon.csv está na pasta raiz ou lib
        const csvFilePath = path.join(process.cwd(), 'lib', 'pokemon.csv');
        const fileContent = fs.readFileSync(csvFilePath, 'utf8');
        
        const parsed = Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true
        });

        // Cria um mapa para busca rápida: nome -> id
        pokemonCache = parsed.data.map(p => ({
            id: parseInt(p.id),
            name: p.identifier.toLowerCase()
        }));
        
        return pokemonCache;
    } catch (error) {
        console.error("Erro ao carregar CSV:", error);
        return [];
    }
}

function findPokemonId(cardName) {
    const pokemons = loadPokemonData();
    const cleanName = cardName.toLowerCase();

    // 1. Tenta encontrar o nome exato do pokemon dentro do nome da carta
    // Ex: "Dark Charizard" contém "charizard"
    // Ordenamos por tamanho do nome (decrescente) para evitar que "Mew" dê match em "Mewtwo" incorretamente
    const sortedPokemons = pokemons.sort((a, b) => b.name.length - a.name.length);

    for (const p of sortedPokemons) {
        // Regex verifica a palavra inteira para evitar falsos positivos
        const regex = new RegExp(`\\b${p.name}\\b`, 'i');
        if (regex.test(cleanName)) {
            return p.id;
        }
    }

    return null; // Não encontrado (pode ser carta de treinador ou energia)
}

module.exports = { findPokemonId };