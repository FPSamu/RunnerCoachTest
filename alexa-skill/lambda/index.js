// Node.js 18+ has built-in fetch — no dependencies needed.
// Set BACKEND_URL as a Lambda environment variable pointing to your Render service.
// Example: https://runner-coach-backend.onrender.com/alexa/handler

const BACKEND_URL = process.env.BACKEND_URL;

const ERROR_RESPONSE = {
  version: '1.0',
  response: {
    outputSpeech: {
      type: 'PlainText',
      text: 'Lo siento, no pude conectarme al servidor. Por favor intenta de nuevo en un momento.'
    },
    shouldEndSession: true
  }
};

exports.handler = async (event) => {
  if (!BACKEND_URL) {
    console.error('BACKEND_URL environment variable is not set');
    return ERROR_RESPONSE;
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      console.error(`Backend responded with status ${response.status}`);
      return ERROR_RESPONSE;
    }

    return await response.json();
  } catch (error) {
    console.error('Lambda proxy error:', error.message);
    return ERROR_RESPONSE;
  }
};
