const { withCors } = require('../lib/withCors');
const fetch = require('node-fetch'); // Or global fetch if Node 18+
// If node-fetch is not installed, we might need to use built-in fetch or https. 
// Assuming standard environment or that I can use what's available. 
// I'll try to use global fetch first, if it fails I'll fallback or ask.
// Actually, let's check if I can use 'fetch' directly. Node 18 has it.

const handler = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, name, description, category } = req.body;

        if (!process.env.IMAGE_WORKER_URL) {
            throw new Error('IMAGE_WORKER_URL not configured');
        }
        if (!process.env.IMGBB_KEY) {
            throw new Error('IMGBB_KEY not configured');
        }

        // Construct the prompt for the image worker
        // If a direct prompt is provided, use it. Otherwise build one.
        let finalPrompt = prompt;
        if (!finalPrompt) {
             // Simple prompt construction since we don't have the LLM provider
             finalPrompt = `A high quality, digital art illustration of ${name || 'a gym leader'}. ${description || ''}. ${category ? `Theme: ${category}.` : ''} Fantasy style, cinematic lighting, detailed.`;
        }

        console.log("Generating image with prompt:", finalPrompt);

        // 1. Generate Image
        const workerUrl = `${process.env.IMAGE_WORKER_URL}/?prompt=${encodeURIComponent(finalPrompt)}`;
        const genResponse = await fetch(workerUrl);
        
        if (!genResponse.ok) {
            throw new Error(`Image worker failed: ${genResponse.statusText}`);
        }

        const imageBuffer = await genResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // 2. Upload to ImgBB
        const formData = new URLSearchParams();
        formData.append('image', base64Image);
        
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const imgbbData = await imgbbResponse.json();

        if (!imgbbData.success) {
            throw new Error(`ImgBB upload failed: ${imgbbData.error?.message || 'Unknown error'}`);
        }

        return res.status(200).json({ 
            success: true, 
            imageUrl: imgbbData.data.url,
            deleteUrl: imgbbData.data.delete_url 
        });

    } catch (error) {
        console.error("Generate image error:", error);
        return res.status(500).json({ error: error.message });
    }
};

module.exports = withCors(handler);
