const { db } = require('../../lib/firebase-admin.js');
const { withCors } = require('../../lib/withCors.js');
const { generateJSON } = require('../../lib/gemini.js');



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

        // --- PHASE 1: PLAYER TURN ---
        let playerNarrative = "";
        let scoreChange = 0;

        if (choiceId && battle.playerOptions) {
            // OPTION A: Player chose a pre-generated option
            const selectedOption = battle.playerOptions.find(o => o.id === choiceId);
            if (selectedOption) {
                playerNarrative = selectedOption.narrative; // Use pre-generated narrative
                // Score: Higher option score = Good for Player. Global score: Positive = Leader.
                // So we SUBTRACT the option score.
                scoreChange = -(selectedOption.score || 0);
            } else {
                // Fallback if option not found
                playerNarrative = `Player chose option ${choiceId}`;
            }
        } else {
            // OPTION B: Free text (Turn 1)
            const playerMovePrompt = `
                You are the Referee.
                Gym: ${gymDesc}
                Challenger Team: ${battle.challengerTeam || 'Unknown'}
                Player Action: "${action}"
                
                Task:
                1. Verify if the action is feasible (Pokemon exists in Challenger Team, action is physically possible).
                2. Narrate the outcome (VERY CONCISE, max 1 sentence).
                   - If VALID: Narrate the action dynamically.
                   - If INVALID (e.g. wrong Pokemon, impossible move): Narrate the failure energetically (e.g. Trainer is confused, Pokemon ignores command, attack misses completely). Do NOT just say "Invalid move".
                3. Determine score change (-3 to +2). Negative helps Player.
                   - If INVALID: Score should favor the Leader (positive score change).
                
                Return JSON: { "narrative": "string", "scoreChange": number }
                IMPORTANT: Ensure all keys are double-quoted. Return ONLY the JSON object.
            `;
            const playerResult = await generateJSON(playerMovePrompt);
            playerNarrative = playerResult.narrative;
            scoreChange = playerResult.scoreChange;
        }

        // Update Score after Player Move
        let currentScore = battle.score + scoreChange;
        
        // Check Win Conditions (Player Win)
        if (currentScore <= -7 || (battle.turn >= 5 && currentScore < 0)) {
             console.log(`[Battle ${battleId}] Player Win | Score: ${currentScore}`);
             const endPrompt = `Battle Ended. Challenger Wins! Final Score: ${currentScore} (INTERNAL ONLY - DO NOT MENTION). Last Action: ${playerNarrative}. Narrate conclusion (Max 1 sentence). Return JSON: { "narrative": "string" }`;
             const endResult = await generateJSON(endPrompt);
             
             await battleRef.update({
                status: 'ended',
                score: currentScore,
                winner: playerId,
                history: [...battle.history, { role: 'player_move', text: playerNarrative }, { role: 'end', text: endResult.narrative }]
            });

            // Award Badge
            await db.ref(`users/${playerId}/badges/${battle.gymId}`).set({
                earnedAt: Date.now(),
                gymName: gym.gymName || 'Unknown Gym',
                badgeImage: gym.badgeImage || ''
            });

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: endResult.narrative, // Use leader field for end message
                gameOver: true,
                winner: playerId
            });
        }

        // --- PHASE 2: LEADER TURN (Combined AI Call) ---
        
        const combinedTurnPrompt = `
            You are the Game Engine for a Pokemon Battle.
            Gym: ${gymDesc}
            Leader: ${leaderName} (Strategy: ${gym.strategy || 'Win'})
            Leader Team: ${battle.leaderTeam || 'Unknown'}
            Challenger Team: ${battle.challengerTeam || 'Unknown'}
            Current Score: ${currentScore} (Positive=Leader, Negative=Challenger)
            Player Just Did: ${playerNarrative}
            
            Task:
            1. Determine the Leader's counter-move based on strategy.
            2. Narrate the Leader's move (VERY CONCISE, max 1 sentence).
            3. Calculate the score impact of this move (-2 to +2, Positive helps Leader).
            4. Generate 3 strategic options for the Challenger (Player) to respond.
               - The player can use ANY of their pokemon or combine them.
               - "text": A short, action-oriented phrase describing the INTENT (e.g., "Dodge and counter with Water Gun", "Hide behind rocks", "Order Pikachu to use Thunderbolt"). NOT just the move name.
               - "narrative": What happens if chosen (Max 1 sentence).
               - "score": 1-3 (Higher = Better for Player).
            
            IMPORTANT: 
            - Use ONLY the Pokemon listed in the teams above. Do not invent Pokemon.
            - Ensure all keys are double-quoted. Return ONLY the JSON object.

            Return JSON: {
                "leaderNarrative": "string",
                "leaderScoreChange": number,
                "playerOptions": [{ "id": 1, "text": "string", "narrative": "string", "score": number }]
            }
        `;
        
        const turnResult = await generateJSON(combinedTurnPrompt);
        
        // Update Score after Leader Move
        currentScore += turnResult.leaderScoreChange;

        // Check Win Conditions (Leader Win)
        if (currentScore >= 7 || (battle.turn >= 5 && currentScore >= 0)) {
             console.log(`[Battle ${battleId}] Leader Win | Score: ${currentScore}`);
             const endPrompt = `Battle Ended. Leader Wins! Final Score: ${currentScore} (INTERNAL ONLY - DO NOT MENTION). Last Action: ${turnResult.leaderNarrative}. Narrate conclusion (Max 1 sentence). Return JSON: { "narrative": "string" }`;
             const endResult = await generateJSON(endPrompt);
             
             await battleRef.update({
                status: 'ended',
                score: currentScore,
                winner: battle.gymId,
                history: [...battle.history, { role: 'player_move', text: playerNarrative }, { role: 'leader_move', text: turnResult.leaderNarrative }, { role: 'end', text: endResult.narrative }]
            });

            return res.status(200).json({
                playerNarrative,
                leaderNarrative: turnResult.leaderNarrative + " " + endResult.narrative,
                gameOver: true,
                winner: battle.gymId
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
