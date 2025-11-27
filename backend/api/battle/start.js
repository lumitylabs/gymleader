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
        
        // --- PARALLEL EXECUTION START ---
        
        // Task A: Intro Narrative
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

        // Task B: Combined Game Logic (Options -> Choice -> Turn)
        const logicPrompt = `
            You are the Game Engine for a Pokemon Battle.
            Context: Battle Start. Score: 0.
            Gym Environment: ${gymDesc}
            Leader: ${leaderName} (Strategy: ${gym.strategy || 'Win at all costs'})
            Leader Team: ${leaderTeam}
            Challenger Team: ${challengerTeam}
            
            Task: Simulate the first turn of the battle internally and return the result.
            
            Steps (INTERNAL THINKING):
            1. Generate 3 strategic options for the Gym Leader using their team (${leaderTeam}).
               - VARIETY RULE: Do not always start with the strongest move. Use status moves, environment, or setup moves.
               - NO SWITCHING: The Leader fights with the active Pokemon or the whole team as a unit. Do not suggest switching out.
            2. Select the BEST option based on the Leader's strategy.
            3. Narrate the Leader's move based on that choice (VERY CONCISE, max 1 sentence).
            4. Determine the initial advantage/disadvantage score (-2 to +2).
               - If Leader has type advantage or better position: Positive score.
               - If Challenger has type advantage: Negative score.
            5. Explain the reasoning for the score (1 sentence).
            
            Return JSON: { 
                "leaderMoveNarrative": "string", 
                "leaderMoveScore": number, // -2 to +2
                "leaderMoveReasoning": "string"
            }
            IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
        `;

        // Execute both in parallel
        const [introData, logicData] = await Promise.all([
            generateJSON(introPrompt),
            generateJSON(logicPrompt)
        ]);

        // --- PARALLEL EXECUTION END ---

        // 7. Save Battle State
        const battleId = db.ref('battles').push().key;
        console.log(`[Battle Start] ID: ${battleId} | Gym: ${gymName} | Leader: ${leaderName} | Challenger: ${challengerId}`);
        console.log(`[Battle Start] Leader Score: ${logicData.leaderMoveScore} | Reasoning: ${logicData.leaderMoveReasoning}`);
        
        const battleState = {
            gymId,
            challengerId,
            score: logicData.leaderMoveScore || 0,
            turn: 1,
            history: [
                { role: 'intro', text: introData.narrative },
                { role: 'leader_move', text: logicData.leaderMoveNarrative }
            ],
            playerOptions: logicData.playerOptions || null,
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
            leaderMoveNarrative: logicData.leaderMoveNarrative,
            playerOptions: logicData.playerOptions || null,
            status: 'active'
        });

    } catch (error) {
        console.error('Battle Start Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = withCors(handler);
