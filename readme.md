# OptiBook – Claude Code Instruction README (Full Specification)

## 🚀 Project Overview

OptiBook is a full-stack smart scheduling web application designed specifically for optical clinics.

The system automates appointment booking, reduces no-show rates, and optimises clinic efficiency by intelligently matching patients with the most suitable optometrist and recommending optimal time slots.

This project focuses on:

* eliminating manual scheduling inefficiencies
* reducing appointment no-shows
* improving clinician utilisation
* providing data-driven scheduling decisions

---

## 🧱 Repository Structure (Monorepo)

```bash
optibook/
├── frontend/        # React (Vite) frontend
├── backend/         # Node.js (Express + MongoDB) backend
├── README.md        # This instruction file
├── .env.example
└── package.json
```

---

## ⚙️ Development Setup

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:
`http://localhost:5173`

Backend runs on:
`http://localhost:5000/api`

---

## 👥 User Roles

* Patient
* Optometrist
* Admin

All functionality must respect role-based access control.

---

# ❗ CRITICAL RULES (DO NOT IGNORE)

Claude MUST follow these rules:

* DO NOT rewrite the entire project
* DO NOT delete existing working code
* DO NOT change project structure unnecessarily
* ALWAYS inspect existing code before modifying
* ALWAYS extend functionality rather than replacing it
* PRESERVE all working features

---

## 🧾 Output Requirements for Claude

For every implementation step, Claude MUST:

1. Explain what is being implemented
2. List all files being modified
3. Provide complete code changes (not partial fragments)
4. Avoid unrelated refactoring
5. Ensure code remains runnable after changes

---

# 📅 Core Feature: Scheduling Diary System

Claude must implement a **fully functional scheduling diary** similar to real-world booking systems.

### Required Features:

* Day view and Week view
* Multi-optometrist calendar (admin)
* Individual optometrist diary
* Appointment blocks displayed visually
* Drag-and-drop rescheduling
* Conflict detection
* Appointment status indicators:

  * booked
  * confirmed
  * completed
  * cancelled
  * no-show
* Real-time updates (state-based is acceptable)
* Filtering by clinician and date
* Smart slot highlighting (AI recommendations)

---

# 🤖 AI Features (Scoring-Based Only)

Claude MUST implement AI features using **deterministic scoring logic** (NOT external AI APIs).

---

## 1. Smart Optometrist Recommendation

### Input:

* patient age
* appointment type
* language preference
* accessibility needs
* patient history
* preferred time

### Output:

* top 3 optometrists
* recommendation score (0–100)
* compatibility score (0–100)
* explanation array

---

## 2. No-Show Prediction

### Factors:

* booking lead time
* patient attendance rate
* past cancellations
* time of day
* day of week

### Output:

* riskScore (0–1)
* riskLevel (low/medium/high)
* explanation factors

---

## 3. Smart Slot Recommendation

Rank slots based on:

* low no-show risk
* clinician suitability
* patient preference match
* clinic load balancing

---

## 4. Compatibility Score

Return a score (0–100) based on:

* specialty match
* history match
* preference match
* availability

---

# 🔌 API ENDPOINTS (FULL SPECIFICATION)

Claude must follow these exactly unless extending existing routes.

---

## AUTHENTICATION

### POST `/api/auth/register`

Creates a new user.

### POST `/api/auth/login`

Returns JWT token.

### GET `/api/auth/me`

Returns current user.

---

## APPOINTMENTS

### POST `/api/appointments`

Creates appointment.

Request:

```json
{
  "patientId": "",
  "optometristId": "",
  "date": "",
  "startTime": "",
  "duration": 30,
  "appointmentType": ""
}
```

---

### GET `/api/appointments`

Returns appointments (filtered by role)

---

### PUT `/api/appointments/:id/reschedule`

Reschedules appointment with conflict validation.

---

### PUT `/api/appointments/:id/cancel`

Cancels appointment.

---

### GET `/api/appointments/diary`

Returns structured data for calendar UI.

---

## AI

### POST `/api/ai/recommend-optometrist`

Returns ranked clinicians.

### POST `/api/ai/no-show-prediction`

Returns risk score.

### POST `/api/ai/recommend-slots`

Returns best slots.

### GET `/api/ai/compatibility/:patientId/:optometristId`

Returns compatibility score.

---

## ANALYTICS

### GET `/api/analytics/dashboard`

Returns:

* appointments today
* no-shows
* utilisation
* total patients

---

## WAITLIST

### POST `/api/waitlist`

Adds patient to waitlist.

### POST `/api/waitlist/auto-fill`

Fills cancelled slots automatically.

---

# 🗄️ DATA MODELS (FULL DETAIL)

Claude must implement these using Mongoose.

---

## User

```json
{
  "name": "",
  "email": "",
  "password": "",
  "role": ""
}
```

---

## Patient

```json
{
  "userId": "",
  "phone": "encrypted",
  "address": "encrypted",
  "attendanceRate": 0
}
```

---

## Optometrist

```json
{
  "specialty": "",
  "yearsExperience": 0,
  "workingHours": {}
}
```

---

## Appointment

```json
{
  "patientId": "",
  "optometristId": "",
  "date": "",
  "status": ""
}
```

---

## Waitlist

```json
{
  "patientId": "",
  "preferredDates": []
}
```

---

## AuditLog

```json
{
  "userId": "",
  "action": "",
  "entityId": ""
}
```

---

# 📊 ADMIN DASHBOARD

Must include:

* appointments today
* no-show rate
* clinician utilisation
* workload distribution
* booking trends
* AI insights

---

# 🔐 SECURITY REQUIREMENTS

* JWT authentication
* bcrypt password hashing
* role-based access control
* rate limiting
* helmet middleware
* input validation
* encrypted patient data

---

# 🧠 IMPLEMENTATION PLAN

Claude must follow this order:

1. Monorepo setup
2. Backend cleanup
3. Auth/security
4. Models
5. Booking flow
6. Diary system
7. Waitlist
8. AI features
9. Analytics dashboard
10. Notifications
11. Audit logs
12. UI polish
13. Testing

---

# 🚫 CONSTRAINTS

* No external AI APIs
* No full rewrites
* Must remain runnable locally
* Must not break existing functionality

---

# 🎯 FINAL GOAL

A fully working system with:

* booking system
* diary
* AI recommendations
* analytics dashboard
* secure authentication

The system must be demonstrable, stable, and complete.
