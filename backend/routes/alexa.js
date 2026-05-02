const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WorkoutLog = require('../models/WorkoutLog');
const { generateWeeklyPlan, extractOnboardingInfo, generateDailyWorkoutSpeech } = require('../services/gemini');
const { buildResponse } = require('../utils/alexaResponse');

// Returns 1 (Monday) through 7 (Sunday)
function getCurrentDay() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

// Extracts the user's spoken value from whichever slot Alexa filled.
// level and goal are checked first so onboarding routing works correctly
// when UpdateLevelIntent / UpdateGoalIntent fire during onboarding.
function getSlotValue(slots = {}) {
  return (
    slots.level?.value ||
    slots.goal?.value ||
    slots.days?.value ||
    slots.userInput?.value ||
    slots.duration?.value ||
    slots.effort?.value ||
    ''
  );
}

router.post('/handler', async (req, res) => {
  try {
    const { request, session, context } = req.body;
    const alexaUserId = context?.System?.user?.userId || session?.user?.userId;
    const sessionAttributes = session?.attributes || {};
    const requestType = request.type;
    const intentName = request.intent?.name;

    if (requestType === 'LaunchRequest') {
      return res.json(await handleLaunch(alexaUserId, sessionAttributes));
    }

    if (requestType === 'SessionEndedRequest') {
      return res.json(buildResponse('', true));
    }

    if (requestType !== 'IntentRequest') {
      return res.json(buildResponse('Lo siento, no entendí eso. Intenta de nuevo.', false, sessionAttributes));
    }

    if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      return res.json(buildResponse('¡Hasta pronto! Sigue entrenando duro.', true));
    }

    if (intentName === 'AMAZON.HelpIntent') {
      return res.json(buildResponse(
        'Puedes decirme: ¿qué me toca correr hoy?, ya terminé de correr, generar nuevo plan, o cambiar mi nivel. ¿Qué quieres hacer?',
        false, sessionAttributes, '¿En qué te puedo ayudar?'
      ));
    }

    // Handle multi-turn dialog state before checking onboarding
    const { conversationState } = sessionAttributes;

    if (conversationState === 'awaiting_duration') {
      return res.json(await handleProvideDuration(alexaUserId, request, sessionAttributes));
    }

    if (conversationState === 'awaiting_effort') {
      return res.json(await handleProvideEffort(alexaUserId, request, sessionAttributes));
    }

    // Route to onboarding if user hasn't completed setup
    const user = await User.findOne({ alexaUserId });
    if (!user || !user.onboardingComplete) {
      return res.json(await handleOnboarding(alexaUserId, request, sessionAttributes, user));
    }

    switch (intentName) {
      case 'GetTodayWorkoutIntent':
        return res.json(await handleGetTodayWorkout(user, sessionAttributes));
      case 'LogWorkoutIntent':
        return res.json(await handleLogWorkoutStart(user, sessionAttributes));
      case 'GenerateNewPlanIntent':
        return res.json(await handleGenerateNewPlan(user, sessionAttributes));
      case 'UpdateLevelIntent':
        return res.json(await handleUpdateLevel(user, request, sessionAttributes));
      case 'UpdateGoalIntent':
        return res.json(await handleUpdateGoal(user, request, sessionAttributes));
      case 'UpdateFrequencyIntent':
        return res.json(await handleUpdateFrequency(user, request, sessionAttributes));
      default:
        return res.json(buildResponse(
          'No entendí tu solicitud. Puedes preguntarme qué te toca correr hoy, registrar tu entrenamiento, o pedir un nuevo plan.',
          false, sessionAttributes, '¿Qué quieres hacer?'
        ));
    }
  } catch (error) {
    console.error('Handler error:', error);
    return res.json(buildResponse('Lo siento, ocurrió un error inesperado. Por favor intenta de nuevo.', true));
  }
});

// ─── Launch ──────────────────────────────────────────────────────────────────

async function handleLaunch(alexaUserId, sessionAttributes) {
  const user = await User.findOne({ alexaUserId });

  if (!user || !user.onboardingComplete) {
    if (!user) {
      await User.create({ alexaUserId, onboardingStep: 'name', onboardingComplete: false });
    }
    const step = user?.onboardingStep || 'name';
    return resumeOnboardingPrompt(step, sessionAttributes);
  }

  return buildResponse(
    `¡Hola de nuevo, ${user.name}! ¿Qué quieres hacer hoy? Puedes preguntarme qué te toca correr, registrar un entrenamiento, o pedir un nuevo plan semanal.`,
    false, sessionAttributes, '¿Qué quieres hacer?'
  );
}

function resumeOnboardingPrompt(step, sessionAttributes) {
  const prompts = {
    name: '¡Bienvenido a Runner Coach, tu entrenador personal de running con inteligencia artificial! Para comenzar, ¿cómo te llamas?',
    level: '¿Cuál es tu nivel de experiencia en running? ¿Eres principiante, intermedio o avanzado?',
    goal: '¿Cuál es tu meta de running? Por ejemplo: correr 5k, 10k, un medio maratón, un maratón, o mejorar tu condición física general.',
    days: '¿Cuántos días a la semana puedes entrenar?'
  };
  const reprompts = {
    name: '¿Cuál es tu nombre?',
    level: '¿Eres principiante, intermedio o avanzado?',
    goal: '¿Cuál es tu meta?',
    days: '¿Cuántos días a la semana quieres entrenar?'
  };
  return buildResponse(prompts[step] || prompts.name, false, sessionAttributes, reprompts[step] || reprompts.name);
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

async function handleOnboarding(alexaUserId, request, sessionAttributes, user) {
  const slots = request.intent?.slots || {};
  const userInput = getSlotValue(slots);
  const currentStep = user?.onboardingStep || 'name';

  switch (currentStep) {
    case 'name': {
      if (!userInput) {
        return buildResponse('No escuché tu nombre. ¿Cómo te llamas?', false, sessionAttributes, '¿Cuál es tu nombre?');
      }
      let name;
      try {
        const raw = await extractOnboardingInfo(userInput, 'name');
        name = raw.charAt(0).toUpperCase() + raw.slice(1);
      } catch {
        name = userInput.split(' ')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
      }
      await User.findOneAndUpdate({ alexaUserId }, { name, onboardingStep: 'level' });
      return buildResponse(
        `¡Mucho gusto, ${name}! ¿Cuál es tu nivel de experiencia en running? ¿Eres principiante, intermedio o avanzado?`,
        false, sessionAttributes, '¿Eres principiante, intermedio o avanzado?'
      );
    }

    case 'level': {
      if (!userInput) {
        return buildResponse('¿Cuál es tu nivel? ¿Principiante, intermedio o avanzado?', false, sessionAttributes);
      }
      let level;
      try {
        level = await extractOnboardingInfo(userInput, 'level');
      } catch {
        level = 'principiante';
      }
      if (!['principiante', 'intermedio', 'avanzado'].includes(level)) level = 'principiante';
      await User.findOneAndUpdate({ alexaUserId }, { level, onboardingStep: 'goal' });
      return buildResponse(
        `Perfecto, nivel ${level} registrado. ¿Cuál es tu meta? Por ejemplo: correr 5k, 10k, un medio maratón, un maratón, o mejorar tu condición física general.`,
        false, sessionAttributes, '¿Cuál es tu meta de running?'
      );
    }

    case 'goal': {
      if (!userInput) {
        return buildResponse('¿Cuál es tu meta? ¿5k, 10k, medio maratón, maratón, o condición física general?', false, sessionAttributes);
      }
      let goal;
      try {
        goal = await extractOnboardingInfo(userInput, 'goal');
      } catch {
        goal = userInput;
      }
      await User.findOneAndUpdate({ alexaUserId }, { goal, onboardingStep: 'days' });
      return buildResponse(
        `¡Excelente meta! Por último, ¿cuántos días a la semana puedes entrenar?`,
        false, sessionAttributes, '¿Cuántos días a la semana quieres entrenar?'
      );
    }

    case 'days': {
      if (!userInput) {
        return buildResponse('¿Cuántos días a la semana quieres entrenar?', false, sessionAttributes);
      }
      let trainingDays;
      try {
        const raw = await extractOnboardingInfo(userInput, 'days');
        trainingDays = parseInt(raw);
      } catch {
        trainingDays = parseInt(userInput);
      }
      if (!trainingDays || trainingDays < 1) trainingDays = 3;
      if (trainingDays > 7) trainingDays = 7;

      await User.findOneAndUpdate({ alexaUserId }, {
        trainingDays,
        onboardingStep: 'complete',
        onboardingComplete: true,
        weekNumber: 1,
        weekStartDate: new Date()
      });

      const updatedUser = await User.findOne({ alexaUserId });
      try {
        const planData = await generateWeeklyPlan(updatedUser, []);
        await User.findOneAndUpdate({ alexaUserId }, { currentWeekPlan: planData.plan });
      } catch (e) {
        console.error('Plan generation error during onboarding:', e);
      }

      return buildResponse(
        `¡Listo, ${updatedUser.name}! He creado tu perfil y tu primer plan de entrenamiento para esta semana con ${trainingDays} días de entrenamiento. Puedes preguntarme: ¿qué me toca correr hoy?`,
        false, sessionAttributes, '¿Qué quieres hacer?'
      );
    }

    default:
      return buildResponse('¿Puedes repetirlo, por favor?', false, sessionAttributes);
  }
}

// ─── Get Today's Workout ─────────────────────────────────────────────────────

async function handleGetTodayWorkout(user, sessionAttributes) {
  if (!user.currentWeekPlan || user.currentWeekPlan.length === 0) {
    return buildResponse(
      'Aún no tienes un plan generado. Di "generar nuevo plan" para que cree tu entrenamiento semanal.',
      false, sessionAttributes, '¿Quieres que genere tu plan?'
    );
  }

  const today = getCurrentDay();
  const todayPlan = user.currentWeekPlan.find(p => p.day === today);

  if (!todayPlan) {
    return buildResponse(
      'No encontré tu entrenamiento de hoy. Di "generar nuevo plan" para actualizar tu plan semanal.',
      false, sessionAttributes
    );
  }

  const speech = await generateDailyWorkoutSpeech(todayPlan.workout, user.name);
  return buildResponse(speech, false, sessionAttributes, '¿Necesitas algo más?');
}

// ─── Log Workout (multi-turn) ─────────────────────────────────────────────────

async function handleLogWorkoutStart(user, sessionAttributes) {
  const today = getCurrentDay();
  const todayPlan = user.currentWeekPlan?.find(p => p.day === today);
  const workoutDesc = todayPlan?.workout || '';

  const newAttrs = {
    ...sessionAttributes,
    conversationState: 'awaiting_duration',
    workoutDay: today,
    workoutDesc,
    userId: user._id.toString()
  };

  return buildResponse(
    `¡Excelente trabajo, ${user.name}! ¿Cuántos minutos duraste corriendo?`,
    false, newAttrs, '¿Cuántos minutos corriste?'
  );
}

async function handleProvideDuration(alexaUserId, request, sessionAttributes) {
  const slots = request.intent?.slots || {};
  const raw = slots.duration?.value || getSlotValue(slots);
  const duration = parseInt(raw);

  if (!duration || duration <= 0) {
    return buildResponse('No escuché la duración. ¿Cuántos minutos corriste?', false, sessionAttributes, '¿Cuántos minutos?');
  }

  const newAttrs = {
    ...sessionAttributes,
    conversationState: 'awaiting_effort',
    logDuration: duration
  };

  return buildResponse(
    `Registré ${duration} minutos. Del 1 al 10, ¿qué tanto esfuerzo te requirió la sesión de hoy?`,
    false, newAttrs, '¿Cuánto esfuerzo del 1 al 10?'
  );
}

async function handleProvideEffort(alexaUserId, request, sessionAttributes) {
  const slots = request.intent?.slots || {};
  const raw = slots.effort?.value || getSlotValue(slots);
  const effort = parseInt(raw);

  if (!effort || effort < 1 || effort > 10) {
    return buildResponse(
      'Por favor dime un número del 1 al 10 para calificar tu esfuerzo.',
      false, sessionAttributes, '¿Cuánto esfuerzo del 1 al 10?'
    );
  }

  const { logDuration: duration, workoutDay, workoutDesc, userId } = sessionAttributes;

  const user = await User.findById(userId);
  if (!user) {
    return buildResponse('Hubo un error al guardar tu sesión. Por favor intenta de nuevo.', true);
  }

  const log = await WorkoutLog.create({
    userId,
    alexaUserId,
    duration,
    perceivedEffort: effort,
    workoutDescription: workoutDesc,
    weekNumber: user.weekNumber,
    dayNumber: workoutDay
  });

  // Mark the corresponding day as completed
  const dayIndex = user.currentWeekPlan.findIndex(p => p.day === workoutDay);
  if (dayIndex !== -1) {
    await User.findByIdAndUpdate(userId, {
      $set: {
        [`currentWeekPlan.${dayIndex}.completed`]: true,
        [`currentWeekPlan.${dayIndex}.logId`]: log._id
      }
    });
  }

  // Clear conversation state
  const cleanAttrs = { ...sessionAttributes };
  delete cleanAttrs.conversationState;
  delete cleanAttrs.logDuration;
  delete cleanAttrs.workoutDay;
  delete cleanAttrs.workoutDesc;
  delete cleanAttrs.userId;

  return buildResponse(
    `Perfecto, he guardado tu sesión de ${duration} minutos con un esfuerzo de ${effort} sobre 10. ¡Descansa bien y nos vemos en el próximo entrenamiento!`,
    false, cleanAttrs
  );
}

// ─── Generate New Plan ────────────────────────────────────────────────────────

async function handleGenerateNewPlan(user, sessionAttributes) {
  try {
    const recentLogs = await WorkoutLog.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(7);

    const nextWeek = user.weekNumber + 1;
    await User.findByIdAndUpdate(user._id, { weekNumber: nextWeek, weekStartDate: new Date() });
    const updatedUser = await User.findById(user._id);

    const planData = await generateWeeklyPlan(updatedUser, recentLogs);
    await User.findByIdAndUpdate(user._id, { currentWeekPlan: planData.plan });

    return buildResponse(
      `¡Listo, ${user.name}! He generado tu plan de entrenamiento para la semana ${nextWeek}. Puedes preguntarme qué te toca cada día.`,
      false, sessionAttributes
    );
  } catch (error) {
    console.error('Generate plan error:', error);
    return buildResponse('Hubo un error al generar tu plan. Por favor intenta de nuevo.', false, sessionAttributes);
  }
}

// ─── Update Profile ───────────────────────────────────────────────────────────

async function handleUpdateLevel(user, request, sessionAttributes) {
  const level = request.intent?.slots?.level?.value?.toLowerCase();
  if (!level || !['principiante', 'intermedio', 'avanzado'].includes(level)) {
    return buildResponse('¿A qué nivel quieres cambiar? ¿Principiante, intermedio o avanzado?', false, sessionAttributes);
  }
  await User.findByIdAndUpdate(user._id, { level });
  return buildResponse(
    `Tu nivel ha sido actualizado a ${level}. Di "generar nuevo plan" para que cree un plan adaptado a tu nuevo nivel.`,
    false, sessionAttributes
  );
}

async function handleUpdateGoal(user, request, sessionAttributes) {
  const goal = request.intent?.slots?.goal?.value;
  if (!goal) {
    return buildResponse('¿Cuál es tu nueva meta?', false, sessionAttributes);
  }
  await User.findByIdAndUpdate(user._id, { goal });
  return buildResponse(
    `Tu meta ha sido actualizada a ${goal}. Di "generar nuevo plan" para que adapte tu entrenamiento.`,
    false, sessionAttributes
  );
}

async function handleUpdateFrequency(user, request, sessionAttributes) {
  const days = parseInt(request.intent?.slots?.days?.value || '0');
  if (!days || days < 1 || days > 7) {
    return buildResponse('¿Cuántos días a la semana quieres entrenar? Di un número del 1 al 7.', false, sessionAttributes);
  }
  await User.findByIdAndUpdate(user._id, { trainingDays: days });
  return buildResponse(
    `Actualizado. Ahora entrenarás ${days} días a la semana. Di "generar nuevo plan" para actualizar tu plan con esta frecuencia.`,
    false, sessionAttributes
  );
}

module.exports = router;
