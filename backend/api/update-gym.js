const { db } = require('../lib/firebase-admin.js');
const { withCors } = require('../lib/withCors.js');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, gymData } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    if (!gymData) {
        return res.status(400).json({ error: 'Gym data is required' });
    }

    try {
        // --- AI MODERATION PLACEHOLDER ---
        // TODO: Integrate with an AI service to validate the gym description and strategy.
        // For now, we just check if the description contains forbidden words (example).
        const forbiddenWords = ['offensive', 'banned_word'];
        const description = gymData.description || '';
        const strategy = gymData.strategy || '';

        const hasForbiddenContent = forbiddenWords.some(word => 
            description.toLowerCase().includes(word) || strategy.toLowerCase().includes(word)
        );

        if (hasForbiddenContent) {
            return res.status(400).json({ error: 'Content contains inappropriate language.' });
        }
        // ---------------------------------

        // Prepare data for update
        // We only allow specific fields to be updated to prevent pollution
        const safeUpdate = {
            gymName: gymData.gymName || '',
            description: gymData.description || '',
            badgeId: gymData.badgeId || 'boulder', // Default to a basic badge if not set
            badgeImage: gymData.badgeImage || '',
            leaderName: gymData.leaderName || '',
            leaderImage: gymData.leaderImage || '', // URL or base64? Assuming URL for now
            gymImage: gymData.gymImage || '',
            team: gymData.team || [], // Array of pokemon IDs or objects
            strategy: gymData.strategy || '',
            twitter: gymData.twitter || '',
            lastUpdated: Date.now()
        };

        // Validate Team Structure (optional but good practice)
        if (!Array.isArray(safeUpdate.team)) {
            safeUpdate.team = [];
        }
        // Limit team size to 3
        safeUpdate.team = safeUpdate.team.slice(0, 3);

        // Write to Firebase (User Profile)
        await db.ref(`users/${userId}/gym`).set(safeUpdate);

        // Replicate to public gyms list for Battle page
        await db.ref(`gyms/${userId}`).set({
            ...safeUpdate,
            userId: userId // Add userId to the record for reference
        });

        return res.status(200).json({ success: true, data: safeUpdate });

    } catch (error) {
        console.error('Update Gym Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = withCors(handler);
