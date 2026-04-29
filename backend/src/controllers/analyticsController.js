const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Waitlist = require('../models/Waitlist');
const moment = require('moment');
const asyncHandler = require('../utils/asyncHandler');
const { getModelMeta, getModelWeights } = require('../utils/noShowModel');

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = moment().startOf('day');
  const monthStart = moment().startOf('month');

  const todayAppointments = await Appointment.countDocuments({
    date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() },
  });

  const monthlyAppointments = await Appointment.countDocuments({
    date: { $gte: monthStart.toDate() },
  });

  const completedAppointments = await Appointment.countDocuments({
    date: { $gte: monthStart.toDate() },
    status: 'completed',
  });

  const noShowCount = await Appointment.countDocuments({
    date: { $gte: monthStart.toDate() },
    status: 'no-show',
  });

  const cancelledCount = await Appointment.countDocuments({
    date: { $gte: monthStart.toDate() },
    status: 'cancelled',
  });

  const totalPatients = await Patient.countDocuments();
  const totalOptometrists = await Optometrist.countDocuments({ isActive: true });

  const noShowRate =
    monthlyAppointments > 0 ? ((noShowCount / monthlyAppointments) * 100).toFixed(2) : 0;
  const cancellationRate =
    monthlyAppointments > 0 ? ((cancelledCount / monthlyAppointments) * 100).toFixed(2) : 0;

  // Clinic-wide utilization = today's appointments / total daily capacity.
  const activeOptoms = await Optometrist.find({ isActive: true }).select('maxAppointmentsPerDay');
  const capacityToday = activeOptoms.reduce(
    (s, o) => s + (o.maxAppointmentsPerDay || 0),
    0,
  );
  const utilization =
    capacityToday > 0 ? Math.min(100, Math.round((todayAppointments / capacityToday) * 100)) : 0;

  const waitlistActive = await Waitlist.countDocuments({ status: 'active' });
  const waitlistHighPriority = await Waitlist.countDocuments({
    status: 'active',
    priority: 'high',
  });

  // AI signal snapshot (best-effort — scoring is only present on newer rows).
  const scoredThisMonth = await Appointment.find({
    date: { $gte: monthStart.toDate() },
    $or: [
      { noShowRiskScore: { $ne: null } },
      { compatibilityScore: { $ne: null } },
    ],
  }).select('noShowRiskScore compatibilityScore createdViaSmartBooking');

  const riskValues = scoredThisMonth
    .map((a) => a.noShowRiskScore)
    .filter((v) => typeof v === 'number');
  const compatValues = scoredThisMonth
    .map((a) => a.compatibilityScore)
    .filter((v) => typeof v === 'number');
  const highRiskCount = riskValues.filter((v) => v >= 0.66).length;
  const smartBookingCount = scoredThisMonth.filter((a) => a.createdViaSmartBooking).length;
  const manualBookingCount = Math.max(0, monthlyAppointments - smartBookingCount);

  res.json({
    success: true,
    data: {
      todayAppointments,
      monthlyAppointments,
      completedAppointments,
      noShowCount,
      noShowRate,
      totalPatients,
      totalOptometrists,
      cancelledCount,
      cancellationRate,
      utilization,
      waitlistActive,
      waitlistHighPriority,
      ai: {
        avgCompatibilityScore: round2(avg(compatValues)),
        avgNoShowRiskScore: round2(avg(riskValues)),
        highRiskCount,
        smartBookingCount,
        manualBookingCount,
      },
    },
  });
});

exports.getOptometristStats = asyncHandler(async (req, res) => {
  const optometrists = await Optometrist.find({ isActive: true });
  const today = moment().startOf('day');

  const stats = await Promise.all(
    optometrists.map(async (optom) => {
      const todayCount = await Appointment.countDocuments({
        optometrist: optom._id,
        date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() },
      });

      const weekCount = await Appointment.countDocuments({
        optometrist: optom._id,
        date: { $gte: moment().startOf('week').toDate() },
      });

      const utilization = ((todayCount / optom.maxAppointmentsPerDay) * 100).toFixed(0);

      return {
        id: optom._id,
        name: `${optom.firstName} ${optom.lastName}`,
        specialty: optom.specialty,
        room: optom.roomNumber,
        todayAppointments: todayCount,
        weekAppointments: weekCount,
        utilization,
      };
    }),
  );

  res.json({ success: true, data: stats });
});

// --- Phase 7 additive endpoints ---

// Last 14 days: total appointments vs no-shows per day, with rate %.
exports.getNoShowTrends = asyncHandler(async (req, res) => {
  const days = Math.min(60, Math.max(1, parseInt(req.query.days, 10) || 14));
  const start = moment().startOf('day').subtract(days - 1, 'days');

  const rows = await Appointment.find({
    date: { $gte: start.toDate() },
  }).select('date status noShowRiskScore');

  const labels = [];
  const totals = [];
  const noShows = [];
  const rates = [];
  // Phase ML-Monitoring: predicted-rate trend overlay. Per-day mean of
  // stored noShowRiskScore × 100. Calibration audit, not retraining feed.
  const predictedRates = [];

  for (let i = 0; i < days; i++) {
    const d = start.clone().add(i, 'days');
    const dayStart = d.clone().startOf('day');
    const dayEnd = d.clone().endOf('day');
    const dayRows = rows.filter(
      (r) => r.date >= dayStart.toDate() && r.date <= dayEnd.toDate(),
    );
    const total = dayRows.length;
    const ns = dayRows.filter((r) => r.status === 'no-show').length;
    labels.push(d.format('DD MMM'));
    totals.push(total);
    noShows.push(ns);
    rates.push(total > 0 ? round2((ns / total) * 100) : 0);

    const scored = dayRows
      .map((r) => r.noShowRiskScore)
      .filter((v) => typeof v === 'number');
    predictedRates.push(
      scored.length > 0 ? round2(avg(scored) * 100) : 0,
    );
  }

  res.json({
    success: true,
    data: { labels, totals, noShows, rates, predictedRates },
  });
});

// Last 30 days booked slot distribution by hour-of-day (0-23).
exports.getBusyHours = asyncHandler(async (req, res) => {
  const days = Math.min(120, Math.max(1, parseInt(req.query.days, 10) || 30));
  const start = moment().startOf('day').subtract(days - 1, 'days');

  const query = {
    date: { $gte: start.toDate() },
    status: { $ne: 'cancelled' },
  };

  // Optometrists only see their own load.
  if (req.user.role === 'optometrist') {
    const self = await Optometrist.findOne({ user: req.user._id });
    if (!self) return res.json({ success: true, data: [] });
    query.optometrist = self._id;
  }

  const rows = await Appointment.find(query).select('startTime');
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const r of rows) {
    if (!r.startTime) continue;
    const h = parseInt(String(r.startTime).split(':')[0], 10);
    if (!Number.isNaN(h) && h >= 0 && h < 24) buckets[h].count += 1;
  }
  // Trim leading/trailing empty hours for a cleaner chart (8-19 typically).
  const trimmed = buckets.filter((b) => b.hour >= 8 && b.hour <= 19);

  res.json({ success: true, data: trimmed });
});

// Per-optometrist KPI bundle (today, week, utilization, no-show rate, avg compatibility).
exports.getClinicianWorkload = asyncHandler(async (req, res) => {
  const optometrists = await Optometrist.find({ isActive: true });
  const today = moment().startOf('day');
  const weekStart = moment().startOf('week');
  const monthStart = moment().startOf('month');

  const rows = await Promise.all(
    optometrists.map(async (o) => {
      const [todayCount, weekCount, monthRows] = await Promise.all([
        Appointment.countDocuments({
          optometrist: o._id,
          date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() },
        }),
        Appointment.countDocuments({
          optometrist: o._id,
          date: { $gte: weekStart.toDate() },
        }),
        Appointment.find({
          optometrist: o._id,
          date: { $gte: monthStart.toDate() },
        }).select('status compatibilityScore'),
      ]);

      const monthTotal = monthRows.length;
      const noShowCount = monthRows.filter((r) => r.status === 'no-show').length;
      const compatVals = monthRows
        .map((r) => r.compatibilityScore)
        .filter((v) => typeof v === 'number');

      const utilization =
        o.maxAppointmentsPerDay > 0
          ? Math.min(100, Math.round((todayCount / o.maxAppointmentsPerDay) * 100))
          : 0;
      const noShowRate = monthTotal > 0 ? round2((noShowCount / monthTotal) * 100) : 0;

      return {
        optometristId: o._id,
        name: `${o.firstName} ${o.lastName}`,
        specialty: o.specialty,
        room: o.roomNumber,
        todayAppointments: todayCount,
        weekAppointments: weekCount,
        utilization,
        noShowRate,
        avgCompatibilityScore: round2(avg(compatVals)),
      };
    }),
  );

  res.json({ success: true, data: rows });
});

// AI-centric insights: risk buckets, booking source, predicted-vs-actual, type mix.
exports.getAiInsights = asyncHandler(async (req, res) => {
  const monthStart = moment().startOf('month');

  const rows = await Appointment.find({
    date: { $gte: monthStart.toDate() },
  }).select(
    'appointmentType status noShowRiskScore compatibilityScore createdViaSmartBooking',
  );

  const riskVals = rows.map((r) => r.noShowRiskScore).filter((v) => typeof v === 'number');
  const compatVals = rows.map((r) => r.compatibilityScore).filter((v) => typeof v === 'number');

  const riskBuckets = { low: 0, medium: 0, high: 0 };
  for (const v of riskVals) {
    if (v < 0.33) riskBuckets.low += 1;
    else if (v < 0.66) riskBuckets.medium += 1;
    else riskBuckets.high += 1;
  }

  const smart = rows.filter((r) => r.createdViaSmartBooking).length;
  const bookingSource = { smart, manual: Math.max(0, rows.length - smart) };

  // Predicted-vs-actual: avg risk score for rows that ended as no-show vs. attended.
  const attendedStatuses = new Set(['completed', 'confirmed', 'scheduled']);
  const noShowRisks = rows
    .filter((r) => r.status === 'no-show' && typeof r.noShowRiskScore === 'number')
    .map((r) => r.noShowRiskScore);
  const attendedRisks = rows
    .filter(
      (r) => attendedStatuses.has(r.status) && typeof r.noShowRiskScore === 'number',
    )
    .map((r) => r.noShowRiskScore);

  const typeCounts = new Map();
  for (const r of rows) {
    if (!r.appointmentType) continue;
    typeCounts.set(r.appointmentType, (typeCounts.get(r.appointmentType) || 0) + 1);
  }
  const typeDistribution = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  res.json({
    success: true,
    data: {
      avgCompatibilityScore: round2(avg(compatVals)),
      avgNoShowRiskScore: round2(avg(riskVals)),
      riskBuckets,
      bookingSource,
      predictedVsActual: {
        noShowAvgRisk: round2(avg(noShowRisks)),
        attendedAvgRisk: round2(avg(attendedRisks)),
      },
      typeDistribution,
      // Phase AI-2 + ML-Monitoring: trained no-show classifier metadata
      // plus admin-only weights for the coefficient chart. Null when no
      // model artifact is loaded — frontend hides the cards gracefully.
      model: (() => {
        const meta = getModelMeta();
        if (!meta) return null;
        return { ...meta, weights: getModelWeights() };
      })(),
      // Phase ML-Monitoring: per-bucket calibration. For each risk bucket
      // we count appointments and compute the actual no-show rate among
      // those that have reached a terminal status (completed / no-show).
      riskBucketPerformance: (() => {
        const buckets = {
          low: { count: 0, completed: 0, noShow: 0 },
          medium: { count: 0, completed: 0, noShow: 0 },
          high: { count: 0, completed: 0, noShow: 0 },
        };
        for (const r of rows) {
          if (typeof r.noShowRiskScore !== 'number') continue;
          let key = 'low';
          if (r.noShowRiskScore >= 0.66) key = 'high';
          else if (r.noShowRiskScore >= 0.33) key = 'medium';
          buckets[key].count += 1;
          if (r.status === 'no-show') buckets[key].noShow += 1;
          else if (r.status === 'completed') buckets[key].completed += 1;
        }
        return Object.entries(buckets).map(([level, b]) => {
          const terminal = b.completed + b.noShow;
          const actualRate = terminal > 0
            ? round2((b.noShow / terminal) * 100)
            : null;
          return {
            level,
            count: b.count,
            completed: b.completed,
            noShow: b.noShow,
            actualNoShowRate: actualRate,
          };
        });
      })(),
      // Phase ML-Monitoring: per-optometrist average predicted risk this
      // month. Top 8 by sample size; sorted by avg risk descending.
      avgRiskByOptometrist: await (async () => {
        const populated = await Appointment.find({
          date: { $gte: monthStart.toDate() },
          noShowRiskScore: { $ne: null },
        })
          .populate('optometrist', 'firstName lastName')
          .select('noShowRiskScore optometrist')
          .lean();
        const map = new Map();
        for (const r of populated) {
          if (!r.optometrist) continue;
          const id = String(r.optometrist._id);
          if (!map.has(id)) {
            map.set(id, {
              name: `Dr. ${r.optometrist.firstName || ''} ${r.optometrist.lastName || ''}`.trim(),
              total: 0,
              count: 0,
            });
          }
          const e = map.get(id);
          e.total += r.noShowRiskScore;
          e.count += 1;
        }
        return [...map.values()]
          .map((e) => ({
            optometrist: e.name,
            count: e.count,
            avgRisk: round2(e.total / e.count),
          }))
          .sort((a, b) => b.avgRisk - a.avgRisk)
          .slice(0, 8);
      })(),
      // Phase ML-Monitoring: per-weekday average predicted risk this month.
      avgRiskByWeekday: (() => {
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const tally = labels.map((label) => ({ day: label, total: 0, count: 0 }));
        for (const r of rows) {
          if (typeof r.noShowRiskScore !== 'number' || !r.date) continue;
          const dow = new Date(r.date).getDay();
          tally[dow].total += r.noShowRiskScore;
          tally[dow].count += 1;
        }
        return tally.map((t) => ({
          day: t.day,
          count: t.count,
          avgRisk: t.count > 0 ? round2(t.total / t.count) : 0,
        }));
      })(),
    },
  });
});

// Phase ML-Monitoring: top upcoming appointments by predicted no-show risk.
// Admin-only. Populated with patient + optometrist names so the table can
// render without a follow-up fetch.
exports.getHighRiskUpcoming = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const today = moment().startOf('day').toDate();

  const rows = await Appointment.find({
    date: { $gte: today },
    status: { $nin: ['cancelled', 'no-show', 'completed'] },
    noShowRiskScore: { $ne: null },
  })
    .populate('patient', 'firstName lastName patientNumber')
    .populate('optometrist', 'firstName lastName')
    .sort({ noShowRiskScore: -1, date: 1 })
    .limit(limit)
    .lean();

  const data = rows.map((r) => ({
    appointmentId: r._id,
    date: r.date,
    startTime: r.startTime,
    appointmentType: r.appointmentType,
    status: r.status,
    noShowRiskScore: r.noShowRiskScore,
    patientName: r.patient
      ? `${r.patient.firstName || ''} ${r.patient.lastName || ''}`.trim()
      : 'Unknown',
    patientNumber: r.patient?.patientNumber || null,
    optometristName: r.optometrist
      ? `Dr. ${r.optometrist.firstName || ''} ${r.optometrist.lastName || ''}`.trim()
      : 'Unassigned',
  }));

  res.json({ success: true, count: data.length, data });
});
