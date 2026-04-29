const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { apiLimiter } = require('./middleware/rateLimit');
const { backfillPatientNumbers } = require('./utils/patientNumber');
const { backfillRecallSplit } = require('./utils/recallMigration');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/optometrists', require('./routes/optometrists'));
app.use('/api/waitlist', require('./routes/waitlist'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/visit-records', require('./routes/visitRecords'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/adminTools'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OptiBook API is running' });
});

// 404 + central error handler — must be last
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Phase D2b: idempotent one-shot to assign patientNumber to any legacy
  // Patient docs in createdAt order. No-ops once every patient has one.
  // Failure is logged but does not block server start.
  try {
    const { assigned } = await backfillPatientNumbers();
    if (assigned > 0) {
      console.log(`✓ Backfilled patientNumber for ${assigned} patient(s)`);
    }
  } catch (err) {
    console.error('patientNumber backfill failed:', err.message);
  }

  // Phase R1: copy legacy nextRecallDate into eyeTestRecallDate where
  // neither typed field is populated yet. Idempotent — safe on every boot.
  try {
    const { migrated } = await backfillRecallSplit();
    if (migrated > 0) {
      console.log(`✓ Recall split: migrated ${migrated} patient(s) to eyeTestRecallDate`);
    }
  } catch (err) {
    console.error('recall split backfill failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n✓ Server running on port ${PORT}`);
    console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL}`);
  });
});
