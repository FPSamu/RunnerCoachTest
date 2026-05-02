const mongoose = require('mongoose');

const weeklyPlanDaySchema = new mongoose.Schema({
  day: Number,
  dayName: String,
  workout: String,
  completed: { type: Boolean, default: false },
  logId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutLog', default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  alexaUserId: { type: String, required: true, unique: true },
  name: String,
  level: { type: String, enum: ['principiante', 'intermedio', 'avanzado'] },
  goal: String,
  trainingDays: Number,
  weekNumber: { type: Number, default: 1 },
  currentWeekPlan: [weeklyPlanDaySchema],
  weekStartDate: Date,
  onboardingComplete: { type: Boolean, default: false },
  onboardingStep: { type: String, default: 'name' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
