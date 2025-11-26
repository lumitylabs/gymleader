const { db } = require('../../lib/firebase-admin.js');
const { withCors } = require('../../lib/withCors.js');
const { generateJSON } = require('../../lib/gemini.js');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { battleId, action, choiceId, playerId } = req.body;

    if (!battleId || !playerId) {
        return res.status(400).json({ error: 'Missing battleId or playerId' });
    }

    if (!action && !choiceId) {
        return res.status(400).json({ error: 'Missing action or choiceId' });
    }

    try {
        // 1. Fetch Battle State
        const battleRef = db.ref(`battles/${battleId}`);
        const battleSnapshot = await battleRef.once('value');
        const battle = battleSnapshot.val();

        if (!battle) return res.status(404).json({ error: 'Battle not found' });
        if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

        console.log(`[Battle ${battleId}] Turn ${battle.turn} Start | Score: ${battle.score}`);
        console.log(" Teams: ", battle.challengerTeam, battle.leaderTeam);

        // Fetch Gym for context
        const gymSnapshot = await db.ref(`gyms/${battle.gymId}`).once('value');
        const gym = gymSnapshot.val();
        const gymDesc = gym.description || '';
        const leaderName = gym.leaderName || 'Leader';

        // --- PHASE 1: PLAYER TURN ---
        let playerNarrative = "";
        let scoreChange = 0;

        if (choiceId && battle.playerOptions) {
            // OPTION A: Player chose a pre-generated option
            const selectedOption = battle.playerOptions.find(o => o.id === choiceId);
            if (selectedOption) {
                // Use 'text' as the narrative since we removed the separate 'narrative' field
                playerNarrative = selectedOption.text || selectedOption.narrative || `Player chose option ${choiceId}`;
                // Score: Direct mapping. Negative = Good for Player. Positive = Good for Leader.
                scoreChange = selectedOption.score || 0;
            } else {
                // Fallback if option not found
                playerNarrative = `Player chose option ${choiceId}`;
            }
        } else {
            // OPTION B: Free text (Turn 1)
            const playerMovePrompt = `
                You are the Judge.
                Gym: ${gymDesc}
                Challenger Team: ${battle.challengerTeam || 'Unknown'}
                Leader Team: ${battle.leaderTeam || 'Unknown'}
                Challanger general strategy: ${battle.challengerStrategy || 'Unknown'}
                Leader general strategy: ${battle.leaderStrategy || 'Unknown'}
                Player Action: "${action}"
                
                Task:
                1. Verify if the action is feasible.
                   - SPELLING LENIENCY: Be very forgiving with Pokemon names (e.g. "Squartle" -> "Squirtle"). If you can understand the intent, accept it.
                   - LOGIC CHECK: Pokemon must be in Challenger Team. Action must be physically possible.
                2. Evaluate the STRATEGY and EFFECTIVENESS.
                   - Type Matchups: Fire vs Water? Electric vs Ground?
                   - Move Utility: Status effects, environment usage.
                   - Risk vs Reward.
                   - Narrative
                   - Creativity
                3. Narrate the outcome (VERY CONCISE, max 1 sentence).
                   - If VALID: Narrate the action dynamically.
                   - If INVALID (e.g. wrong Pokemon, impossible move): Narrate the failure energetically.
                4. Determine score change (-3 to +3).
                   - Negative Score (-1 to -3): Good for Player (Effective move, super effective, good strategy).
                   - Positive Score (+1 to +3): Bad for Player (Ineffective, bad type matchup, missed attack, invalid move).
                   - Zero (0): Neutral exchange.
                5. Explain the reasoning for the score (1 sentence).
                
                Return JSON: { "narrative": "string", "scoreChange": number, "scoreReasoning": "string" }
                IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
            `;
            const playerResult = await generateJSON(playerMovePrompt);
            playerNarrative = playerResult.narrative;
            scoreChange = playerResult.scoreChange;
            console.log(`[Battle ${battleId}] Player Turn | Score Change: ${scoreChange} | Reasoning: ${playerResult.scoreReasoning}`);
        }

        // Update Score after Player Move
        let currentScore = battle.score + scoreChange;

        // Check Win Conditions (Player Win)
        if (currentScore <= -7 || (battle.turn >= 5 && currentScore < 0)) {
            console.log(`[Battle ${battleId}] Player Win | Score: ${currentScore}`);
            const endPrompt = `
                Battle Ended. Challenger Wins! 
                Final Score: ${currentScore} (INTERNAL ONLY - DO NOT MENTION).
                Last Action: ${playerNarrative}.
                
                Task: Narrate the conclusion of the battle.
                - Summarize the Challenger's victory and team dominance.
                - Do NOT focus only on the last move. Describe the overall triumph.
                - Max 2 sentences.
                
                Return JSON: { "narrative": "string" }
             `;
            const endResult = await generateJSON(endPrompt);

            await battleRef.update({
                status: 'ended',
                score: currentScore,
                winner: playerId,
                history: [...battle.history, { role: 'player_move', text: playerNarrative }, { role: 'end', text: endResult.narrative }]
            });

            // Increment Gym Losses
            await db.ref(`gyms/${battle.gymId}/stats/losses`).transaction((current) => (current || 0) + 1);

            // Award Badge
            await db.ref(`users/${playerId}/badges/${battle.gymId}`).set({
                earnedAt: Date.now(),
                gymName: gym.gymName || 'Unknown Gym',
                badgeImage: gym.badgeImage || '',
                leaderName: gym.leaderName || 'Unknown Leader',
                twitter: gym.twitter || '',
                location: gym.location || 'Kanto' // Default to Kanto if not set
            });

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: endResult.narrative, // Use leader field for end message
                gameOver: true,
                winner: playerId,
                challengerId: playerId  // Player won, so winner IS the challenger
            });
        }

        // --- PHASE 2: LEADER TURN (Combined AI Call) ---

        // Format recent history for context
        const historyText = battle.history ? battle.history.slice(-4).map(h => `${h.role}: ${h.text}`).join('\n') : "No history";

        const combinedTurnPrompt = `
            You are the Game Engine for a Pokemon Battle.
            Gym: ${gymDesc}
            Leader: ${leaderName} (Strategy: ${gym.strategy || 'Win'})
            Leader Team: ${battle.leaderTeam || 'Unknown'}
            Challenger Team: ${battle.challengerTeam || 'Unknown'}
            Current Score: ${currentScore} (Positive=Leader Advantage, Negative=Challenger Advantage)
            
            Recent Battle History:
            ${historyText}
            
            Player Just Did: ${playerNarrative}
            
            Task:
            1. Determine the Leader's counter-move based on strategy.
               - VARIETY RULE: Do not repeat the same move or idea as the last turns. Be dynamic.
               - NO SWITCHING: The Leader fights with the active Pokemon or the whole team as a unit.
            2. Narrate the Leader's move (VERY CONCISE, max 1 sentence).
            3. Calculate the score impact of this move (-2 to +2, Positive helps Leader).
            4. Explain the reasoning for the score (1 sentence).
            5. Generate 3 strategic options for the Challenger (Player) to respond.
               - STYLE: TRAINER COMMANDS. Write them as if the Trainer is shouting orders to their Pokemon.
               - USE IMPERATIVE MOOD: "Charizard, fly up and melt the rocks!", "Team, combine your power to push them back!"
               - AVOID MOVE NAMES: Do not say "Use Flamethrower". Say "Unleash a stream of fire". Do not say "Use Psychic". Say "Grip them with your mind".
               - FOCUS ON ACTION & INTENT: Describe WHAT they should do and WHY (briefly).
               - KEEP IT CONCISE: Max 20 words per option.
               - Examples: "Charizards, melt the gym floor to trap them! Mewtwo, levitate above the lava!", "Pikachu, use your speed to confuse them, then strike their blind spot!"

               - OPTION 1 (GOOD): A creative, effective strategy. Score: -3 to -2 (Negative favors Player).
               - OPTION 2 (NEUTRAL/RISKY): Standard or risky. Score: -1 to 1.
               - OPTION 3 (BAD/MISTAKE): Poor choice, bad matchup. Score: 2 to 3 (Positive favors Leader).
               
               - "text": The concise Trainer Command (Max 15 words).
               - "reasoning": Brief explanation of why this option has this score.
               - "score": The score value defined above.
               - "id": 1, 2, or 3.
               - NO SWITCHING: Do not offer "Switch Pokemon" as an option.
            
            IMPORTANT: 
            - Use ONLY the Pokemon listed in the teams above. Do not invent Pokemon.
            - Ensure all keys are double-quoted. Return ONLY the JSON object.

            Return JSON: {
                "leaderNarrative": "string",
                "leaderScoreChange": number,
                "leaderMoveReasoning": "string",
                "playerOptions": [{ "id": 1, "text": "string", "reasoning": "string", "score": number }]
            }
        `;

        const turnResult = await generateJSON(combinedTurnPrompt);
        if (Array.isArray(turnResult.playerOptions)) {
            shuffleArray(turnResult.playerOptions);

            // REASSIGN IDS
            turnResult.playerOptions = turnResult.playerOptions.map((opt, index) => ({
                ...opt,
                id: index + 1
            }));
        }

        console.log(`[Battle ${battleId}] Leader Turn | Score Change: ${turnResult.leaderScoreChange} | Reasoning: ${turnResult.leaderMoveReasoning}`);

        if (turnResult.playerOptions) {
            console.log(`[Battle ${battleId}] Generated Options:`);
            turnResult.playerOptions.forEach(o => {
                console.log(`  ${o.id}: ${o.text} (Score: ${o.score}) | Reasoning: ${o.reasoning}`);
            });
        }

        // Update Score after Leader Move
        currentScore += turnResult.leaderScoreChange;

        // Check Win Conditions (Leader Win)
        if (currentScore >= 7 || (battle.turn >= 5 && currentScore >= 0)) {
            console.log(`[Battle ${battleId}] Leader Win | Score: ${currentScore}`);
            const endPrompt = `
                Battle Ended. Leader Wins! 
                Final Score: ${currentScore} (INTERNAL ONLY - DO NOT MENTION).
                Last Action: ${turnResult.leaderNarrative}.
                
                Task: Narrate the conclusion of the battle.
                - Summarize the Leader's victory and team dominance.
                - Do NOT focus only on the last move. Describe the overall triumph.
                - Max 2 sentences.
                
                Return JSON: { "narrative": "string" }
             `;
            const endResult = await generateJSON(endPrompt);

            await battleRef.update({
                status: 'ended',
                score: currentScore,
                winner: battle.gymId,
                history: [...battle.history, { role: 'player_move', text: playerNarrative }, { role: 'leader_move', text: turnResult.leaderNarrative }, { role: 'end', text: endResult.narrative }]
            });

            // Increment Gym Wins
            await db.ref(`gyms/${battle.gymId}/stats/wins`).transaction((current) => (current || 0) + 1);

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: turnResult.leaderNarrative + " " + endResult.narrative,
                gameOver: true,
                winner: battle.gymId,  // Leader won, so winner is NOT the challenger
                challengerId: battle.challengerId  // Send challengerId so frontend can properly check
            });
        }

        // Save State
        await battleRef.update({
            score: currentScore,
            turn: battle.turn + 1,
            playerOptions: turnResult.playerOptions,
            history: [...battle.history, { role: 'player_move', text: playerNarrative }, { role: 'leader_move', text: turnResult.leaderNarrative }]
        });

        return res.status(200).json({
            playerNarrative,
            leaderNarrative: turnResult.leaderNarrative,
            playerOptions: turnResult.playerOptions,
            gameOver: false
        });

    } catch (error) {
        console.error('Battle Turn Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = withCors(handler);
