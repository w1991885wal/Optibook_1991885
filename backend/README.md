# OptiBook Backend API

## Quick Start

```bash
# Install dependencies
npm install

# Create .env file with:
PORT=5000
MONGODB_URI=mongodb://localhost:27017/optibook
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173

# Seed database with sample data
npm run seed

# Start server
npm start
```

## API Endpoints

### Authentication

- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- GET /api/auth/me - Get current user

### Appointments

- GET /api/appointments - Get all appointments
- POST /api/appointments - Create appointment
- GET /api/appointments/available - Get available slots
- PUT /api/appointments/:id - Update appointment
- DELETE /api/appointments/:id - Cancel appointment

### Patients

- GET /api/patients - Get all patients
- GET /api/patients/:id - Get patient details
- PUT /api/patients/:id - Update patient

### Optometrists

- GET /api/optometrists - Get all optometrists
- GET /api/optometrists/:id - Get optometrist details

### Waitlist

- GET /api/waitlist - Get waitlist
- POST /api/waitlist - Add to waitlist
- DELETE /api/waitlist/:id - Remove from waitlist

### Analytics

- GET /api/analytics/dashboard - Get dashboard stats
- GET /api/analytics/optometrists - Get optometrist stats

## Default Login Credentials

After running `npm run seed`:

**Patient:**

- Email: sarah.j@email.com
- Password: password123

**Optometrist:**

- Email: emma.wilson@optibook.com
- Password: password123

**Admin:**

- Email: admin@optibook.com
- Password: password123
