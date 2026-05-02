const mongoose = require('mongoose');

const workoutLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  alexaUserId: String,
  date: { type: Date, default: Date.now },
  duration: Number,
  perceivedEffort: Number,
  workoutDescription: String,
  weekNumber: Number,
  dayNumber: Number
}, { timestamps: true });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
