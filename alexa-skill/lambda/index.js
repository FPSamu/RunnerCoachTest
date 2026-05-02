const https = require('https');

const BACKEND_URL = 'https://runnercoachtest.onrender.com/alexa/handler';

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

function postToBackend(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: 'runnercoachtest.onrender.com',
      port: 443,
      path: '/alexa/handler',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Backend error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

exports.handler = async (event) => {
  try {
    return await postToBackend(event);
  } catch (error) {
    console.error('Lambda proxy error:', error.message);
    return ERROR_RESPONSE;
  }
};
