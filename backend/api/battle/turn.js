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

        // Fetch Gym for context
        const gymSnapshot = await db.ref(`gyms/${battle.gymId}`).once('value');
        const gym = gymSnapshot.val();
        const gymDesc = gym.description || '';
        const leaderName = gym.leaderName || 'Leader';

        // --- FORMATTING RULES (UPDATED) ---
        const formattingRules = `
            IMPORTANT FORMATTING RULES FOR POKEMON NAMES:
            1. When mentioning a Pokemon from the LEADER'S team (${battle.leaderTeam}), YOU MUST use the format: @Enemy_PokemonName.
            2. When mentioning a Pokemon from the CHALLENGER'S team (${battle.challengerTeam}), YOU MUST use the format: @PokemonName.
            3. CRITICAL: REPLACE ALL SPACES WITH UNDERSCORES inside the tag.
               - Example: "Tapu Koko" -> "@Tapu_Koko" (or "@Enemy_Tapu_Koko").
               - Example: "Mr. Mime" -> "@Mr_Mime" (Remove dots, use underscores).
            4. Do NOT use bold or markdown for names, just the @ tag.
            5. Even if the user input uses "enemy Charizard", you must convert it to @Enemy_Charizard in your narrative.
        `;

        // --- PHASE 1: PLAYER TURN ---
        let playerNarrative = "";
        let scoreChange = 0;

        if (choiceId && battle.playerOptions) {
            // OPTION A: Player chose a pre-generated option
            const selectedOption = battle.playerOptions.find(o => o.id === choiceId);
            if (selectedOption) {
                playerNarrative = selectedOption.text || selectedOption.narrative || `Player chose option ${choiceId}`;
                scoreChange = selectedOption.score || 0;
            } else {
                playerNarrative = `Player chose option ${choiceId}`;
            }
        } else {
            // OPTION B: Free text (Turn 1)
            const playerMovePrompt = `
                You are the Judge.
                Gym: ${gymDesc}
                Challenger Team: ${battle.challengerTeam || 'Unknown'}
                Leader Team: ${battle.leaderTeam || 'Unknown'}
                Player Action: "${action}"
                
                ${formattingRules}

                Task:
                1. Verify if the action is feasible.
                   - SPELLING LENIENCY: Be very forgiving with Pokemon names.
                2. Evaluate the STRATEGY and EFFECTIVENESS.
                3. Narrate the outcome (VERY CONCISE, max 1 sentence).
                   - USE THE @ TAGS for all Pokemon names (with underscores).
                4. Determine score change (-3 to +3).
                   - Negative Score (-1 to -3): Good for Player.
                   - Positive Score (+1 to +3): Bad for Player.
                5. Explain the reasoning for the score (1 sentence).
                
                Return JSON: { "narrative": "string", "scoreChange": number, "scoreReasoning": "string" }
                IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
            `;
            const playerResult = await generateJSON(playerMovePrompt);
            playerNarrative = playerResult.narrative;
            scoreChange = playerResult.scoreChange;
            console.log(`[Battle ${battleId}] Player Turn | Score Change: ${scoreChange}`);
        }

        // Update Score after Player Move
        let currentScore = battle.score + scoreChange;

        // Check Win Conditions (Player Win)
        if (currentScore <= -7 || (battle.turn >= 5 && currentScore < 0)) {
            console.log(`[Battle ${battleId}] Player Win | Score: ${currentScore}`);
            const endPrompt = `
                Battle Ended. Challenger Wins! 
                Final Score: ${currentScore}.
                Last Action: ${playerNarrative}.
                ${formattingRules}
                
                Task: Narrate the conclusion of the battle.
                - Summarize the Challenger's victory.
                - USE @ TAGS for Pokemon names (with underscores).
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

            // Increment Gym Losses & Award Badge
            await db.ref(`gyms/${battle.gymId}/stats/losses`).transaction((current) => (current || 0) + 1);
            await db.ref(`users/${playerId}/badges/${battle.gymId}`).set({
                earnedAt: Date.now(),
                gymName: gym.gymName || 'Unknown Gym',
                badgeImage: gym.badgeImage || '',
                leaderName: gym.leaderName || 'Unknown Leader',
                twitter: gym.twitter || '',
                location: gym.location || 'Kanto'
            });

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: endResult.narrative,
                gameOver: true,
                winner: playerId,
                challengerId: playerId
            });
        }

        // --- PHASE 2: LEADER TURN (Combined AI Call) ---

        const historyText = battle.history ? battle.history.slice(-4).map(h => `${h.role}: ${h.text}`).join('\n') : "No history";

        const combinedTurnPrompt = `
            You are the Game Engine for a Pokemon Battle.
            Gym: ${gymDesc}
            Leader: ${leaderName} (Strategy: ${gym.strategy || 'Win'})
            Leader Team: ${battle.leaderTeam || 'Unknown'}
            Challenger Team: ${battle.challengerTeam || 'Unknown'}
            Current Score: ${currentScore} (Positive=Leader Advantage, Negative=Challenger Advantage)
            
            ${formattingRules}

            Recent Battle History:
            ${historyText}
            
            Player Just Did: ${playerNarrative}
            
            Task:
            1. Determine the Leader's counter-move based on strategy.
               - TEAMWORK RULE: The Leader MUST use their team as a COHESIVE UNIT. Combine abilities.
               - Example: "@Enemy_Blastoise creates a rain dance while @Enemy_Raichu prepares thunder".
               - Do not treat this as 1v1. Use the whole team to counter the player.
            2. Narrate the Leader's move (VERY CONCISE, max 1 sentence). USE @ TAGS WITH UNDERSCORES.
            3. Calculate the score impact of this move (-2 to +2, Positive helps Leader).
            4. Explain the reasoning for the score (1 sentence).
            5. Generate 3 strategic options for the Challenger (Player) to respond.
               - STYLE: TRAINER COMMANDS.
               - USE @ TAGS for player's own Pokemon (e.g., "@Charizard, dodge!").
               - "text": The concise Trainer Command (Max 15 words).
               - "reasoning": Brief explanation.
               - "score": The score value (-3 to +3).
               - "id": 1, 2, or 3.
            
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
            turnResult.playerOptions = turnResult.playerOptions.map((opt, index) => ({
                ...opt,
                id: index + 1
            }));
        }

        console.log(`[Battle ${battleId}] Leader Turn | Score Change: ${turnResult.leaderScoreChange}`);

        // Update Score after Leader Move
        currentScore += turnResult.leaderScoreChange;

        // Check Win Conditions (Leader Win)
        if (currentScore >= 7 || (battle.turn >= 5 && currentScore >= 0)) {
            console.log(`[Battle ${battleId}] Leader Win | Score: ${currentScore}`);
            const endPrompt = `
                Battle Ended. Leader Wins! 
                Final Score: ${currentScore}.
                Last Action: ${turnResult.leaderNarrative}.
                ${formattingRules}
                
                Task: Narrate the conclusion of the battle.
                - Summarize the Leader's victory.
                - USE @ TAGS WITH UNDERSCORES.
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

            await db.ref(`gyms/${battle.gymId}/stats/wins`).transaction((current) => (current || 0) + 1);

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: turnResult.leaderNarrative + " " + endResult.narrative,
                gameOver: true,
                winner: battle.gymId,
                challengerId: battle.challengerId
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