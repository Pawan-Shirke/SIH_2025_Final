import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON bodies
app.use(express.json());

// Fix for ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// --- MOCK DATA STORES (New Additions) ---
// =======================================================

const mockDoctors = [
    { name: "S. Varma", availability: "Available Now", zone: "North" },
    { name: "R. Shetty", availability: "Available in 15 min", zone: "North" },
    { name: "A. Khan", availability: "On Call", zone: "South" }
];

// Stores new and old emergency requests
let mockEmergencies = [
    { id: 101, patient: 'Sham Sharma', zone: 'North', area: 'Sector 5', timestamp: '10:30 AM', reason: 'Sudden high fever and chills.', status: 'Awaiting Doctor Response', isAttended: false }
];

// Stores pending doctor appointments (used by doctor.html)
let mockAppointments = [
    { id: 1, patient: 'Ram Singh', date: '2025-10-01', reason: 'Follow up for Jwara', doctor: 'Dr. Sharma', age: 45, gender: 'M', contact: '98765-XXXXX' },
    { id: 2, patient: 'Priya Verma', date: '2025-10-02', reason: 'New skin rash', doctor: 'Dr. Sharma', age: 28, gender: 'F', contact: '99887-XXXXX' }
];


// --- DATA STRUCTURE: NAMASTE Codes Only (Simulating Terminology Service) ---
const namasteMorbidityCodes = [
    // NAMASTE/Ayurveda Code Example: Jwara (Fever)
    { 
        NAMASTE_CODE: "AYA0001", 
        NAMASTE_TERM: "Jwara (ज्वर)", 
        Short_definition: "Fever, a symptom of imbalance (Ayurveda).",
        system: "Ayurveda"
    },
    // NAMASTE/Ayurveda Code Example: Amlapitta (Hyperacidity)
    { 
        NAMASTE_CODE: "AYA0002", 
        NAMASTE_TERM: "Amlapitta (अम्लपित्त)", 
        Short_definition: "Hyperacidity/Dyspepsia (Ayurveda).",
        system: "Ayurveda"
    },
    // NAMASTE/Siddha Code Example: Gunmam (Abdominal mass)
    {
        NAMASTE_CODE: "SID0003",
        NAMASTE_TERM: "Gunmam (குன்மம்)", 
        Short_definition: "Abdominal mass/Gaseous distension (Siddha).",
        system: "Siddha"
    },
    // NAMASTE/Unani Example
    {
        NAMASTE_CODE: "UNI0004",
        NAMASTE_TERM: "Nazla (نزلہ)", 
        Short_definition: "Common Cold/Catarrh (Unani).",
        system: "Unani"
    }
];

// --- MODIFIED PATIENT DATA STORE (Now with 10 records) ---
const patients = [
    // Your original patient data remains here
    { name: "Ram Singh", email: "ram@test.com", password: "password123", record: [{ date: "2025-09-20", diagnosis: "Jwara (ज्वर)", code: "AAY.2.3.1", NAMASTE_CODE: "AYA0001", shortDefinition: "Fever, coded using NAMASTE: AYA0001." }, { date: "2025-09-10", diagnosis: "Atisara", code: "AAY.2.3.2", NAMASTE_CODE: null, shortDefinition: "Diarrhea, linked to impaired digestive function (Legacy Code)." } ] },
    { name: "Shyam Sharma", email: "shyam@test.com", password: "password123", record: [{ date: "2025-09-25", diagnosis: "Amlapitta (अम्लपित्त)", code: "AAY.2.1.1", NAMASTE_CODE: "AYA0002", shortDefinition: "Hyperacidity, coded using NAMASTE: AYA0002." } ] },
    { name: "Priya Verma", email: "priya@test.com", password: "password123", record: [{ date: "2025-10-01", diagnosis: "Amlapitta (अम्लपित्त)", code: "AAY.2.1.2", NAMASTE_CODE: "AYA0002", shortDefinition: "Hyperacidity, coded using NAMASTE: AYA0002." } ] },
    { name: "Rohan Gupta", email: "rohan@test.com", password: "password123", record: [{ date: "2025-10-05", diagnosis: "Jwara (ज्वर)", code: "AAY.2.3.3", NAMASTE_CODE: "AYA0001", shortDefinition: "Fever, coded using NAMASTE: AYA0001." } ] },
    { name: "Fatima Khan", email: "fatima@test.com", password: "password123", record: [{ date: "2025-10-10", diagnosis: "Gunmam (குன்மம்)", code: "SID.3.1.1", NAMASTE_CODE: "SID0003", shortDefinition: "Abdominal mass/Gaseous distension, coded using NAMASTE: SID0003." } ] },
    { name: "David Raj", email: "david@test.com", password: "password123", record: [{ date: "2025-10-15", diagnosis: "Nazla (نزلہ)", code: "UNI.4.1.1", NAMASTE_CODE: "UNI0004", shortDefinition: "Common Cold/Catarrh, coded using NAMASTE: UNI0004." } ] },
    { name: "Anita Desai", email: "anita@test.com", password: "password123", record: [{ date: "2025-10-18", diagnosis: "Jwara (ज्वर)", code: "AAY.2.3.4", NAMASTE_CODE: "AYA0001", shortDefinition: "Fever, coded using NAMASTE: AYA0001." } ] },
    { name: "Vikram Joshi", email: "vikram@test.com", password: "password123", record: [{ date: "2025-10-22", diagnosis: "Amlapitta (अम्लपित्त)", code: "AAY.2.1.3", NAMASTE_CODE: "AYA0002", shortDefinition: "Hyperacidity, coded using NAMASTE: AYA0002." } ] },
    { name: "Sneha Nair", email: "sneha@test.com", password: "password123", record: [{ date: "2025-10-25", diagnosis: "Gunmam (குன்மம்)", code: "SID.3.1.2", NAMASTE_CODE: "SID0003", shortDefinition: "Abdominal mass/Gaseous distension, coded using NAMASTE: SID0003." } ] },
    { name: "Anish Singh", email: "anish@test.com", password: "password123", record: [{ date: "2025-10-28", diagnosis: "Nazla (نزلہ)", code: "UNI.4.1.2", NAMASTE_CODE: "UNI0004", shortDefinition: "Common Cold/Catarrh, coded using NAMASTE: UNI0004." } ] }
];

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(__dirname));

// =======================================================
// --- NEW EMERGENCY PORTAL API ENDPOINTS (for index.html) ---
// =======================================================

// API endpoint for patient emergency registration
app.post('/api/register-emergency', (req, res) => {
    const { patientName, zone, area, reason } = req.body;
    
    if (!patientName || !zone || !reason) {
        return res.status(400).json({ message: "Missing required emergency details." });
    }
    
    const newEmergency = {
        id: Date.now(),
        patient: patientName,
        zone,
        area,
        reason,
        timestamp: new Date().toLocaleTimeString(),
        status: "Awaiting Doctor Response",
        isAttended: false
    };
    
    mockEmergencies.push(newEmergency);
    console.log(`🚨 New Emergency Registered: ${patientName} in ${zone}`);
    
    res.json({ message: "Emergency registered successfully! Searching for available doctors." });
});

// API endpoint for finding available doctors in a zone
app.get('/api/available-doctors', (req, res) => {
    const zone = req.query.zone;
    
    if (!zone) {
        return res.status(400).json({ message: "Zone parameter is required." });
    }

    // Filter mock doctors by the requested zone
    const availableDoctors = mockDoctors.filter(d => 
        d.zone.toLowerCase() === zone.toLowerCase()
    ).map(d => ({ name: d.name, availability: d.availability }));
    
    res.json(availableDoctors);
});

// API endpoint to simulate notifying a doctor
app.post('/api/emergency-notification', (req, res) => {
    const { emergencyId, doctorName } = req.body;
    
    // In a real app, this would send a push notification.
    console.log(`🔔 Doctor Notification: Emergency ID ${emergencyId} notified to Dr. ${doctorName}`);
    
    res.json({ message: `Dr. ${doctorName} has been notified.` });
});


// =======================================================
// --- NEW DOCTOR DASHBOARD API ENDPOINTS (for doctor.html) ---
// =======================================================

// API endpoint to fetch all pending appointments
app.get('/api/pending-appointments', (req, res) => {
    // Returns the mock appointments list
    res.json(mockAppointments);
});

// API endpoint to fetch all UN-ATTENDED emergency requests
app.get('/api/emergency-requests', (req, res) => {
    // Only return un-attended emergencies to match frontend logic
    const pendingEmergencies = mockEmergencies.filter(e => !e.isAttended);
    res.json(pendingEmergencies);
});


// =======================================================
// --- ORIGINAL/EXISTING API ENDPOINTS (with modifications) ---
// =======================================================

// API ENDPOINT for NAMASTE Coding Lookup
app.get("/api/diagnosis-lookup", (req, res) => {
    const searchTerm = req.query.term ? req.query.term.toLowerCase() : '';
    
    let results = namasteMorbidityCodes;

    if (searchTerm.length > 0) {
        results = namasteMorbidityCodes.filter(code => 
            code.NAMASTE_TERM.toLowerCase().includes(searchTerm) ||
            code.NAMASTE_CODE.toLowerCase().includes(searchTerm) ||
            code.Short_definition.toLowerCase().includes(searchTerm)
        );
    }
    
    // Format the result for the EMR UI
    const formattedResults = results.map(code => ({
        display: `${code.NAMASTE_TERM} (${code.system})`,
        namasteCode: code.NAMASTE_CODE,
        definition: code.Short_definition
    }));

    res.json(formattedResults);
});


// API endpoint for patient registration
app.post("/api/patient-register", (req, res) => {
    const { name, email, password } = req.body;
    // ... (rest of registration logic) ...
    
    if (!name || !email || !password) {
        return res.status(400).send({ message: "All fields are required for registration." });
    }

    if (patients.some(p => p.email === email)) {
        return res.status(409).send({ message: "User with this email already exists." });
    }

    const newPatient = {
        name,
        email,
        password, 
        record: []
    };

    patients.push(newPatient);
    console.log(`✅ New patient registered: ${name} (${email})`);
    res.status(201).send({ message: "Registration successful." });
});


// API endpoint for patient login
app.post("/api/patient-login", (req, res) => {
    const { email, password } = req.body;

    const patient = patients.find(
        (p) => p.email === email && p.password === password
    );

    if (patient) {
        const { password, ...patientData } = patient;
        res.json(patientData); 
    } else {
        res.status(401).send({ message: "Invalid email or password." });
    }
});

// API endpoint to fetch patient history
app.get("/api/patient-history", (req, res) => {
    const patientName = req.query.patientName;
    const patient = patients.find((p) => p.name === patientName);

    if (patient) {
        res.json(patient);
    } else {
        res.status(404).send({ message: "Patient not found." });
    }
});

// API endpoint to handle doctor diagnosis and approval (MODIFIED to remove appointment)
app.post("/api/approve-appointment", (req, res) => {
    const { patientName, namasteCode } = req.body;

    if (!patientName || !namasteCode) {
        return res.status(400).send({ message: "Patient name and NAMASTE code are required." });
    }

    const diagnosis = namasteMorbidityCodes.find(
        (code) => code.NAMASTE_CODE === namasteCode
    );

    if (!diagnosis) {
        return res.status(404).send({ message: "NAMASTE Code not found in the terminology service." });
    }

    const patient = patients.find((p) => p.name === patientName);

    if (patient) {
        // Add new record to patient history
        patient.record.push({
            date: new Date().toISOString().split("T")[0],
            diagnosis: diagnosis.NAMASTE_TERM,
            code: namasteCode,
            NAMASTE_CODE: namasteCode,
            shortDefinition: `NAMASTE Code: ${diagnosis.Short_definition}`,
        });
        
        // --- NEW MODIFICATION: Remove the approved appointment from the pending list ---
        const initialLength = mockAppointments.length;
        mockAppointments = mockAppointments.filter(app => app.patient !== patientName);
        if (mockAppointments.length < initialLength) {
            console.log(`Appointment for ${patientName} removed from pending list.`);
        }
        // --- END MODIFICATION ---

        console.log(`✅ NAMASTE Diagnosis for ${patientName}: ${diagnosis.NAMASTE_TERM} (Code: ${namasteCode})`);
        res.json({ message: `NAMASTE diagnosis '${diagnosis.NAMASTE_TERM}' added for ${patientName}. Appointment marked complete.` });
    } else {
        res.status(404).send({ message: "Patient not found." });
    }
});


// --- Server Routes ---
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/patient.html", (req, res) => {
    res.sendFile(path.join(__dirname, "patient.html"));
});

app.get("/doctor.html", (req, res) => {
    res.sendFile(path.join(__dirname, "doctor.html"));
});

app.get("/staff.html", (req, res) => {
    res.sendFile(path.join(__dirname, "staff.html"));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Arogya Portal running at http://localhost:${PORT}`);
});
