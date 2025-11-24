const { db } = require('../../lib/firebase-admin.js');
const { withCors } = require('../../lib/withCors.js');

const handler = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const badgesRef = db.ref(`users/${userId}/badges`);
        const snapshot = await badgesRef.once('value');
        const badgesData = snapshot.val() || {};

        // Convert object to array
        const badges = Object.entries(badgesData).map(([gymId, data]) => ({
            gymId,
            ...data
        }));

        return res.status(200).json({ badges });
    } catch (error) {
        console.error('Fetch Badges Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = withCors(handler);
