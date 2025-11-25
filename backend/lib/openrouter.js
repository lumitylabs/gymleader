const fetch = require('node-fetch');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS = (process.env.OPENROUTER_MODELS || '').split(',').filter(Boolean);

async function generateJSON(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set.");
  }

  if (OPENROUTER_MODELS.length === 0) {
    throw new Error("No OPENROUTER_MODELS configured.");
  }

  let lastError = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`Attempting OpenRouter with model: ${model}`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: prompt + "\n\nReturn the result strictly as a JSON object."
            }
          ],
          response_format: { type: "json_object" } 
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error (${model}): ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Robust JSON extraction
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      let jsonStr = content;
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      return JSON.parse(jsonStr);

    } catch (error) {
      console.error(`Failed with model ${model}:`, error.message);
      lastError = error;
      // Continue to next model
    }
  }

  throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message}`);
}

module.exports = { generateJSON };
