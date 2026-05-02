const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant';

async function chat(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature: 0.7
  });
  return completion.choices[0].message.content.trim();
}

async function generateWeeklyPlan(user, previousLogs = []) {
  const logsContext = previousLogs.length > 0
    ? `Sesiones previas: ${previousLogs.map(l => `Duración: ${l.duration}min, Esfuerzo: ${l.perceivedEffort}/10`).join('; ')}.`
    : 'Es la primera semana del usuario, sin historial previo.';

  const prompt = `Eres un entrenador de running experto. Genera un plan semanal personalizado.

Perfil:
- Nombre: ${user.name}
- Nivel: ${user.level}
- Meta: ${user.goal}
- Días de entrenamiento: ${user.trainingDays}
- Semana número: ${user.weekNumber}
- ${logsContext}

Instrucciones:
- Distribuye exactamente ${user.trainingDays} sesiones en los 7 días.
- Los días sin entrenamiento: workout = "Descanso".
- Si el esfuerzo promedio fue alto (7+), reduce la intensidad. Si fue bajo (4-), auméntala.

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "plan": [
    {"day": 1, "dayName": "Lunes", "workout": "descripción o Descanso"},
    {"day": 2, "dayName": "Martes", "workout": "..."},
    {"day": 3, "dayName": "Miércoles", "workout": "..."},
    {"day": 4, "dayName": "Jueves", "workout": "..."},
    {"day": 5, "dayName": "Viernes", "workout": "..."},
    {"day": 6, "dayName": "Sábado", "workout": "..."},
    {"day": 7, "dayName": "Domingo", "workout": "..."}
  ]
}

Descripciones claras y específicas, máximo 2 oraciones por sesión.`;

  const text = await chat(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Respuesta de IA inválida');
  return JSON.parse(jsonMatch[0]);
}

function extractLevel(text) {
  const t = text.toLowerCase();
  if (t.includes('avanzado') || t.includes('experto') || t.includes('profesional')) return 'avanzado';
  if (t.includes('intermedio') || t.includes('moderado')) return 'intermedio';
  if (t.includes('principiante') || t.includes('básico') || t.includes('novato') || t.includes('nuevo')) return 'principiante';
  return null;
}

function extractGoal(text) {
  const t = text.toLowerCase();
  if ((t.includes('medio') || t.includes('media') || t.includes('21')) && !t.includes('42')) return 'medio maratón';
  if (t.includes('maratón') || t.includes('maraton') || t.includes('42')) return 'maratón';
  if (t.includes('10') || t.includes('diez')) return '10k';
  if (t.includes('5') || t.includes('cinco')) return '5k';
  if (t.includes('condición') || t.includes('condicion') || t.includes('forma') || t.includes('general')) return 'condición física general';
  return null;
}

async function extractOnboardingInfo(userSpeech, field) {
  if (field === 'level') return extractLevel(userSpeech) || 'principiante';
  if (field === 'goal') return extractGoal(userSpeech) || 'condición física general';
  if (field === 'days') {
    const match = userSpeech.match(/\d+/);
    return match ? match[0] : '3';
  }

  const text = await chat(
    `Del siguiente texto, extrae únicamente el nombre propio de la persona. Responde SOLO con el nombre, sin puntuación.\nTexto: "${userSpeech}"`
  );
  return text;
}

async function generateDailyWorkoutSpeech(workout, userName) {
  if (!workout || workout.toLowerCase() === 'descanso') {
    return `Hoy es día de descanso, ${userName}. Aprovecha para recuperarte y llegar fuerte al próximo entrenamiento.`;
  }

  const text = await chat(
    `Eres un entrenador de running motivador. Presenta el siguiente entrenamiento de forma clara para ser leído en voz alta por Alexa. Sin caracteres especiales ni símbolos. Máximo 3 oraciones.\n\nEntrenamiento: ${workout}\nAtleta: ${userName}`
  );
  return text;
}

module.exports = { generateWeeklyPlan, extractOnboardingInfo, generateDailyWorkoutSpeech };
