require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./services/db');
const alexaRouter = require('./routes/alexa');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/alexa', alexaRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Runner Coach backend running on port ${PORT}`));
});
