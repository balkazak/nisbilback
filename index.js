const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uploadRoutes = require('./routes/upload');

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('Educational Platform API - VERSION 2.1 (NEW ROUTES)');
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const testRoutes = require('./routes/tests');
const resultRoutes = require('./routes/results');
const lessonRoutes = require('./routes/lessons');
const { User } = require('./models');
const bcrypt = require('bcryptjs');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/upload', uploadRoutes);
console.log('Routes mounted: /api/lessons');

// Sync Database and Start Server
sequelize.sync().then(async () => {
    console.log('Database synced');

    // Seed Admin
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
        console.log('Creating default admin user...');
        const hashedPassword = bcrypt.hashSync('admin123', 8);
        await User.create({
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        });
        console.log('Default admin created: admin / admin123');
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Database sync failed:', err);
});
