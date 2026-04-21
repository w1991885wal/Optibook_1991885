export const weekDays = [
  { key: "mon", label: "Monday, Jan 13" },
  { key: "tue", label: "Tuesday, Jan 14" },
  { key: "wed", label: "Wednesday, Jan 15" },
  { key: "thu", label: "Thursday, Jan 16" },
  { key: "fri", label: "Friday, Jan 17" },
  { key: "sat", label: "Saturday, Jan 18" },
];

export const timeSlots = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export const appointments = {
  mon: {
    "9:00 AM": { patient: "John Smith", type: "Standard Eye Test" },
    "11:00 AM": {
      patient: "John Smith",
      type: "Comprehensive Eye Examination",
    },
    "12:00 PM": { type: "Lunch Break", isBreak: true },
    "2:00 PM": { patient: "John Smith", type: "Consultation" },
    "3:00 PM": { patient: "John Smith B", type: "Follow-up " },
  },
  tue: {
    "9:00 AM": { patient: "David A", type: "Standard Eye Test" },
    "11:00 AM": { patient: "Abraham ", type: "Standard Eye Test" },
    "11:00 PM": { type: "Lunch Break", isBreak: true },
  },
};

export const patients = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    age: 36,
    phone: "+44 7700 900123",
    lastVisit: "Nov 10, 2025",
    visits: 12,
    imageSrc: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    type: "Regular",
    status: false,
  },
  {
    id: 2,
    name: "John Smith",
    email: "john.j@email.com",
    age: 36,
    phone: "+44 7700 900123",
    lastVisit: "Nov 10, 2025",
    visits: 12,
    imageSrc: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
    type: "New",
    status: true,
  },
  {
    id: 3,
    name: "Mary Johnson",
    email: "marry.j@email.com",
    age: 36,
    phone: "+44 7700 900123",
    lastVisit: "Nov 10, 2025",
    visits: 12,
    imageSrc: "https://api.dicebear.com/7.x/avataaars/svg?seed=mary",
    type: "New",
    status: true,
  },
  {
    id: 3,
    name: "David Brown",
    email: "dvid.j@email.com",
    age: 36,
    phone: "+44 7700 900123",
    lastVisit: "Nov 10, 2025",
    visits: 12,
    imageSrc: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    type: "Regular",
    status: true,
  },
];

export const waitlistPatients = [
  {
    id: 1,
    name: "Robert Lee",
    addDate: "Added: Jan 10, 2026",
    appointmentType: "Contact Lens Follow-up",
    type: "High Priority",
  },
  {
    id: 2,
    name: "Emily Davis",
    addDate: "Added: Jan 10, 2026",
    appointmentType: "Standard Eye Test",
    type: "Low Priority",
  },
  {
    id: 3,
    name: "Michael Chen",
    addDate: "Added: Jan 10, 2026",
    appointmentType: "PCO Test",
    type: "High Priority",
  },
  {
    id: 4,
    name: "Abraham ",
    addDate: "Added: Jan 10, 2026",
    appointmentType: "PCO Test",
    type: "Medium Priority",
  },

  {
    id: 5,
    name: "David A",
    addDate: "Added: Jan 10, 2026",
    appointmentType: "PCO Test",
    type: "Low Priority",
  },
];

// Clinic diary mock data

export const doctors = [
  {
    id: "emma",
    name: "Dr. Emma Wilson",
    room: "Room 2",
    schedule: [
      { time: "9:00 AM", patient: "John Smith" },
      { time: "10:00 AM", patient: "Mary Johnson" },
      { time: "12:00 PM", isLunch: true },
      { time: "2:00 PM", patient: "Sarah Johnson" },
      { time: "3:00 PM", patient: "David Brown" },
      { time: "4:00 PM", patient: "Sara Ali" },
    ],
  },
  {
    id: "james",
    name: "Dr. James Chen",
    room: "Room 1",
    schedule: [
      { time: "9:00 AM", patient: "John Smith" },
      { time: "10:00 AM", patient: "Mary Johnson" },
      { time: "11:00 AM", patient: "Sarah Johnson" },
      { time: "12:30 PM", isLunch: true },
      { time: "3:00 PM", patient: "David Brown" },
    ],
  },
  {
    id: "sarah",
    name: "Dr. Sarah Miller",
    room: "Room 3",
    schedule: [
      { time: "9:00 AM", patient: "John Smith" },
      { time: "10:00 AM", patient: "Mary Johnson" },
      { time: "12:00 PM", isLunch: true },
      { time: "2:00 PM", patient: "Sarah Johnson" },
      { time: "3:00 PM", patient: "David Brown" },
      { time: "4:00 PM", patient: "Sara Ali" },
    ],
  },
];

//Staff data:
export const staffData = [
  {
    id: 1,
    name: "Dr. Emma Wilson",
    role: "Senior Optometrist",
    room: "Room 2",
    experience: "5 years",
    today: 8,
    week: 42,
    utilization: 87,
    status: true,
  },
  {
    id: 2,
    name: "Dr. James Chen",
    role: "Contact Lens Specialist",
    room: "Room 1",
    experience: "7 years",
    today: 9,
    week: 48,
    utilization: 92,
    status: true,
  },
  {
    id: 3,
    name: "Dr. Sarah Miller",
    role: "Pediatric Specialist",
    room: "Room 3",
    experience: "4 years",
    today: 7,
    week: 38,
    utilization: 85,
    status: true,
  },
];

//mock stats for patient admin
export const patientTabStatsAdmin = {
  totalPatients: 892,
  activePatients: 420,
  totalOptometrists: 12,
  duePatient: 127,
  thisMonth: 34,

  totalPatientsLabel: "Registered in system",
  activePatientsLabel: "↗ 83% of total",
  duePatientLabel: "Needs follow-up",
  thisMonthLabel: "↗ 12% increase",
};

export const noShowData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  rates: [6, 9, 5, 11, 7, 4], // percentages
};
