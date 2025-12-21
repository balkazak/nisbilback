const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let adminToken = '';
let studentToken = '';
let courseId = null;
let studentId = null;

async function run() {
    try {
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, { username: 'admin', password: 'admin123' });
        adminToken = loginRes.data.token;
        console.log('Admin logged in.');

        console.log('2. Creating a Course...');
        const courseRes = await axios.post(`${API_URL}/courses`, {
            title: 'Test Course',
            description: 'A course for testing access'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        courseId = courseRes.data.id;
        console.log('Course created. ID:', courseId);

        console.log('3. Creating a Student...');
        const randomInt = Math.floor(Math.random() * 10000);
        const studentRes = await axios.post(`${API_URL}/users`, {
            username: `student_${randomInt}`,
            password: 'password123',
            role: 'student'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        studentId = studentRes.data.userId; // userController returns { userId: ... }
        console.log('Student created. ID:', studentId);

        console.log('4. Logging in as Student (to get token)...');
        const sLoginRes = await axios.post(`${API_URL}/auth/login`, { username: `student_${randomInt}`, password: 'password123' });
        studentToken = sLoginRes.data.token;
        console.log('Student logged in.');

        console.log('5. Checking Student Access BEFORE assignment...');
        try {
            const res1 = await axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${studentToken}` } });
            console.log('Courses visible to student:', res1.data.length);
        } catch (e) { console.error('Error fetching courses:', e.message); }

        console.log('6. Assigning Course to Student...');
        await axios.post(`${API_URL}/users/${studentId}/access`, {
            courseIds: [courseId]
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('Access assigned.');

        console.log('7. Checking Student Access AFTER assignment...');
        const res2 = await axios.get(`${API_URL}/courses`, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log('Courses visible to student:', res2.data.length);

        if (res2.data.length === 1 && res2.data[0].id === courseId) {
            console.log('SUCCESS: Student can see the assigned course.');
        } else {
            console.log('FAILURE: Student cannot see the course.');
            console.log('Response:', JSON.stringify(res2.data, null, 2));
        }

    } catch (error) {
        console.error('An error occurred:', error.response ? error.response.data : error.message);
    }
}

run();
