const { withCors } = require('../lib/withCors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { image } = req.body; // Expecting base64 string (without data:image/... prefix if possible, or strip it)

    if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
    }

    try {
        const imgbbKey = process.env.IMGBB_KEY;
        if (!imgbbKey) {
            throw new Error('IMGBB_KEY not configured');
        }

        // Strip header if present (e.g., "data:image/png;base64,")
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const formData = new FormData();
        formData.append('image', base64Data);

        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: formData,
        });

        const imgbbData = await imgbbResponse.json();

        if (!imgbbData.success) {
            throw new Error(imgbbData.error ? imgbbData.error.message : 'ImgBB upload failed');
        }

        return res.status(200).json({ 
            success: true, 
            imageUrl: imgbbData.data.url,
            deleteUrl: imgbbData.data.delete_url 
        });

    } catch (error) {
        console.error('Upload Image Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

module.exports = withCors(handler);
