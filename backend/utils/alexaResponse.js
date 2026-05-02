function buildResponse(speechText, shouldEndSession = false, sessionAttributes = {}, repromptText = null) {
  const response = {
    version: '1.0',
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText
      },
      shouldEndSession
    }
  };

  if (repromptText && !shouldEndSession) {
    response.response.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText
      }
    };
  }

  return response;
}

module.exports = { buildResponse };
