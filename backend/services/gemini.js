const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generateWeeklyPlan(user, previousLogs = []) {
  const logsContext = previousLogs.length > 0
    ? `Sesiones previas de la semana anterior: ${previousLogs.map(l => `Duración: ${l.duration}min, Esfuerzo percibido: ${l.perceivedEffort}/10`).join('; ')}.`
    : 'Es la primera semana del usuario, sin historial previo.';

  const prompt = `Eres un entrenador de running experto. Genera un plan semanal de entrenamiento personalizado.

Perfil del usuario:
- Nombre: ${user.name}
- Nivel: ${user.level}
- Meta: ${user.goal}
- Días de entrenamiento por semana: ${user.trainingDays}
- Semana número: ${user.weekNumber}
- ${logsContext}

Instrucciones:
- Distribuye exactamente ${user.trainingDays} sesiones de entrenamiento en los 7 días.
- Los días sin entrenamiento deben tener workout: "Descanso".
- Si el esfuerzo percibido promedio fue alto (7 o más), reduce la intensidad esta semana.
- Si fue bajo (4 o menos), aumenta gradualmente la carga.

Responde ÚNICAMENTE con un JSON válido con este formato exacto, sin texto adicional:
{
  "plan": [
    {"day": 1, "dayName": "Lunes", "workout": "descripción del entrenamiento o Descanso"},
    {"day": 2, "dayName": "Martes", "workout": "..."},
    {"day": 3, "dayName": "Miércoles", "workout": "..."},
    {"day": 4, "dayName": "Jueves", "workout": "..."},
    {"day": 5, "dayName": "Viernes", "workout": "..."},
    {"day": 6, "dayName": "Sábado", "workout": "..."},
    {"day": 7, "dayName": "Domingo", "workout": "..."}
  ]
}

Las descripciones deben ser claras y específicas: incluye distancias, tiempos y ritmos cuando aplique. Máximo 2 oraciones por sesión.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini devolvió un formato inválido');

  return JSON.parse(jsonMatch[0]);
}

async function extractOnboardingInfo(userSpeech, field) {
  const prompts = {
    name: `Del siguiente texto, extrae únicamente el nombre propio de la persona. Responde SOLO con el nombre, sin más texto ni puntuación.\nTexto: "${userSpeech}"`,
    level: `Del siguiente texto, identifica el nivel de experiencia en running. Responde SOLO con una de estas palabras exactas: "principiante", "intermedio" o "avanzado".\nTexto: "${userSpeech}"`,
    goal: `Del siguiente texto, identifica la meta de running. Responde SOLO con una de estas opciones exactas: "5k", "10k", "medio maratón", "maratón", "condición física general".\nTexto: "${userSpeech}"`,
    days: `Del siguiente texto, extrae el número de días a la semana que la persona quiere entrenar. Responde SOLO con el número entero entre 1 y 7.\nTexto: "${userSpeech}"`
  };

  const result = await model.generateContent(prompts[field]);
  return result.response.text().trim().toLowerCase();
}

async function generateDailyWorkoutSpeech(workout, userName) {
  if (!workout || workout.toLowerCase() === 'descanso') {
    return `Hoy es día de descanso, ${userName}. Aprovecha para recuperarte y llegar fuerte al próximo entrenamiento.`;
  }

  const prompt = `Eres un entrenador de running motivador. Presenta el siguiente entrenamiento de forma clara y motivadora para ser leído en voz alta por Alexa. Sin caracteres especiales ni símbolos. Máximo 3 oraciones.

Entrenamiento: ${workout}
Nombre del atleta: ${userName}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { generateWeeklyPlan, extractOnboardingInfo, generateDailyWorkoutSpeech };
