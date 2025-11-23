const { db } = require('../../lib/firebase-admin.js');
const { withCors } = require('../../lib/withCors.js');
const { generateJSON } = require('../../lib/gemini.js');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { gymId, challengerId } = req.body;

    if (!gymId || !challengerId) {
        return res.status(400).json({ error: 'Missing gymId or challengerId' });
    }

    try {
        // 1. Fetch Data
        const gymSnapshot = await db.ref(`gyms/${gymId}`).once('value');
        const gym = gymSnapshot.val();

        const userSnapshot = await db.ref(`users/${challengerId}`).once('value');
        const user = userSnapshot.val();

        if (!gym) return res.status(404).json({ error: 'Gym not found' });
        
        // 2. Prepare Context
        const leaderName = gym.leaderName || 'Leader';
        const gymName = gym.gymName || 'Gym';
        const gymDesc = gym.description || 'A standard battle arena.';
        // Helper to parse team data (handles both array and object structures)
        const parseTeam = (teamData) => {
            if (!teamData) return 'Unknown Pokemon';
            const teamArray = Array.isArray(teamData) ? teamData : Object.values(teamData);
            return teamArray.map(p => p.name || `Pokemon #${p.pokedexId}`).join(', ');
        };

        const leaderTeam = parseTeam(gym.team);
        
        // Fetch user's gym team specifically
        const userGymTeamSnapshot = await db.ref(`users/${challengerId}/gym/team`).once('value');
        const userGymTeam = userGymTeamSnapshot.val();
        const challengerTeam = parseTeam(userGymTeam);
        
        // 3. Judge: Intro
        const introPrompt = `
            You are the Judge of a Pokemon Gym Battle.
            Gym: ${gymName} - ${gymDesc}
            Leader: ${leaderName} (Team: ${leaderTeam})
            Challenger: Challenger (Team: ${challengerTeam})
            
            Task: Create a VERY SHORT, DIRECT, single-sentence introduction for the battle.
            Focus on the ATMOSPHERE and the TENSION between the Leader and the Challenger.
            MENTION BOTH SIDES (Leader/Team AND Challenger/Team).
            Example: "The air crackles as Lt. Surge's electric team faces off against the Challenger's squad, sparks flying between them."
            Do NOT focus on just one Pokemon. Do NOT describe an attack yet. Set the scene.
            
            Return JSON: { "narrative": "string" }
            IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
        `;
        const introData = await generateJSON(introPrompt);

        // 4. Judge: Generate Options for Leader
        const optionsPrompt = `
            Context: Battle just started (Score: 0). ${introData.narrative}
            Gym Environment: ${gymDesc}
            Leader: ${leaderName}
            Leader Team: ${leaderTeam}
            Challenger Team: ${challengerTeam}
            
            Task: Generate 3 strategic options for the Gym Leader to take as their first move.
            Options should use the environment or their pokemon's strengths.
            Assign a hidden score (-2 to +2) for each option representing its effectiveness/advantage.
            
            IMPORTANT: Generate options using ONLY the Pokemon in the Leader's Team: ${leaderTeam}.
            
            Return JSON: { "options": [{ "id": 1, "text": "string", "score": number }] }
            IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
        `;
        const optionsData = await generateJSON(optionsPrompt);

        // 5. AI Leader: Choose Option
        const leaderPrompt = `
            You are Gym Leader ${leaderName}.
            Strategy: ${gym.strategy || 'Win at all costs.'}
            Options: ${JSON.stringify(optionsData.options)}
            
            Task: Choose the best option based on your strategy.
            
            Return JSON: { "choiceId": number }
            IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
        `;
        const leaderChoiceData = await generateJSON(leaderPrompt);
        const selectedOption = optionsData.options.find(o => o.id === leaderChoiceData.choiceId) || optionsData.options[0];

        // 6. Judge: Narrate Leader Move & Generate Player Options
        const turnPrompt = `
            Context: ${introData.narrative}
            Leader Choice: ${selectedOption.text}
            Leader Team: ${leaderTeam}
            Challenger Team: ${challengerTeam}
            Gym Environment: ${gymDesc}
            
            Task: 
            1. Narrate the Leader's action based on the choice (VERY CONCISE, max 1 sentence).
               - USE ONLY POKEMON FROM: ${leaderTeam}.
            2. Generate 3 strategic options for the Challenger (Player) to respond.
               - The player can use ANY of their pokemon or combine them.
               - "text": A short, action-oriented phrase describing the INTENT (e.g., "Dodge and counter with Water Gun", "Hide behind rocks", "Order Pikachu to use Thunderbolt"). NOT just the move name.
               - "narrative": What happens if chosen (Max 1 sentence).
               - Assign a score (1 to 3) for each option (Higher = Better).
            
            Return JSON: { 
                "narrative": "string", 
                "playerOptions": [{ "id": 1, "text": "string", "narrative": "string", "score": number }]
            }
            IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
        `;
        const turnData = await generateJSON(turnPrompt);

        // 7. Save Battle State
        const battleId = db.ref('battles').push().key;
        console.log(`[Battle Start] ID: ${battleId} | Gym: ${gymName} | Leader: ${leaderName} | Challenger: ${challengerId}`);
        const battleState = {
            gymId,
            challengerId,
            score: selectedOption.score || 0, // Initial score from Leader's move
            turn: 1,
            history: [
                { role: 'intro', text: introData.narrative },
                { role: 'leader_move', text: turnData.narrative, option: selectedOption }
            ],
            playerOptions: turnData.playerOptions,
            status: 'active',
            lastUpdated: Date.now(),
            leaderTeam,
            challengerTeam
        };

        await db.ref(`battles/${battleId}`).set(battleState);

        // 8. Return Response
        return res.status(200).json({
            battleId,
            introNarrative: introData.narrative,
            leaderMoveNarrative: turnData.narrative,
            playerOptions: turnData.playerOptions,
            status: 'active'
        });

    } catch (error) {
        console.error('Battle Start Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = withCors(handler);
