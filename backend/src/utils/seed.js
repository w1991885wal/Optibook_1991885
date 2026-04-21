const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Patient = require('../models/Patient');
const Optometrist = require('../models/Optometrist');
const Appointment = require('../models/Appointment');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Optometrist.deleteMany({});
    await Appointment.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create users
    const patientUser = await User.create({
      email: 'sarah.j@email.com',
      password: 'password123',
      role: 'patient'
    });
    
    const optomUser1 = await User.create({
      email: 'emma.wilson@optibook.com',
      password: 'password123',
      role: 'optometrist'
    });
    
    const optomUser2 = await User.create({
      email: 'james.chen@optibook.com',
      password: 'password123',
      role: 'optometrist'
    });
    
    const adminUser = await User.create({
      email: 'admin@optibook.com',
      password: 'password123',
      role: 'admin'
    });
    
    console.log('✓ Users created');
    
    // Create patient
    const patient = await Patient.create({
      user: patientUser._id,
      firstName: 'Sarah',
      lastName: 'Johnson',
      dateOfBirth: new Date('1988-05-15'),
      phone: '+44 7700 900123',
      address: '123 High Street, London, UK',
      languagePreference: 'English',
      visitCount: 12,
      attendanceRate: 92
    });
    
    console.log('✓ Patient created');
    
    // Create optometrists
    const optom1 = await Optometrist.create({
      user: optomUser1._id,
      firstName: 'Emma',
      lastName: 'Wilson',
      specialty: 'General',
      roomNumber: 'Room 2',
      yearsExperience: 5,
      workingHours: {
        monday: { start: '09:00', end: '17:00', working: true },
        tuesday: { start: '09:00', end: '17:00', working: true },
        wednesday: { start: '09:00', end: '17:00', working: true },
        thursday: { start: '09:00', end: '17:00', working: true },
        friday: { start: '09:00', end: '17:00', working: true }
      }
    });
    
    const optom2 = await Optometrist.create({
      user: optomUser2._id,
      firstName: 'James',
      lastName: 'Chen',
      specialty: 'Contact Lens',
      roomNumber: 'Room 1',
      yearsExperience: 7,
      workingHours: {
        monday: { start: '09:00', end: '17:00', working: true },
        tuesday: { start: '09:00', end: '17:00', working: true },
        wednesday: { start: '09:00', end: '17:00', working: true },
        thursday: { start: '09:00', end: '17:00', working: true },
        friday: { start: '09:00', end: '17:00', working: true }
      }
    });
    
    console.log('✓ Optometrists created');
    
    // Create sample appointments
    await Appointment.create({
      patient: patient._id,
      optometrist: optom1._id,
      appointmentType: 'Standard Eye Test',
      date: new Date('2026-01-16'),
      startTime: '14:00',
      duration: 30,
      status: 'confirmed'
    });
    
    console.log('✓ Sample appointment created');
    console.log('\n✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Patient: sarah.j@email.com / password123');
    console.log('Optometrist: emma.wilson@optibook.com / password123');
    console.log('Admin: admin@optibook.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
