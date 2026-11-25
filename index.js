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
const groupRoutes = require('./routes/groups');
const questionCategoryRoutes = require('./routes/questionCategories');
const { User, QuestionCategory, QuestionSubcategory } = require('./models');
const questionCategoriesSeed = require('./data/questionCategoriesSeed');
const bcrypt = require('bcryptjs');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/question-categories', questionCategoryRoutes);
app.use('/api/upload', uploadRoutes);
console.log('Routes mounted: /api/lessons, /api/groups, /api/question-categories');

// Sync Database and Start Server
sequelize.sync().then(async () => {
    console.log('Database synced');
    
    // Auto-Migration for missing columns (Only for SQLite)
    if (sequelize.getDialect() === 'sqlite') {
        try {
            const columns = await sequelize.query("PRAGMA table_info(Users);", { type: sequelize.QueryTypes.SELECT });
            const hasCoins = columns.some(c => c.name === 'coins');
            if (!hasCoins) {
                console.log('Adding missing coins column to Users table...');
                await sequelize.query('ALTER TABLE Users ADD COLUMN coins INTEGER DEFAULT 0;');
                console.log('Coins column added.');
            }

            const hasGroupId = columns.some(c => c.name === 'groupId');
            if (!hasGroupId) {
                console.log('Adding missing groupId column to Users table...');
                await sequelize.query('ALTER TABLE Users ADD COLUMN groupId INTEGER;');
                console.log('groupId column added.');
            }

            const hasPhone = columns.some(c => c.name === 'phone');
            if (!hasPhone) {
                console.log('Adding missing phone column to Users table...');
                await sequelize.query('ALTER TABLE Users ADD COLUMN phone VARCHAR(50);');
                console.log('phone column added.');
            }

            await sequelize.query("DROP TABLE IF EXISTS Users_backup;");

            const lessonColumns = await sequelize.query("PRAGMA table_info(Lessons);", { type: sequelize.QueryTypes.SELECT });
            const hasMaterials = lessonColumns.some(c => c.name === 'materials');
            if (!hasMaterials) {
                console.log('Adding missing materials column to Lessons table...');
                await sequelize.query('ALTER TABLE Lessons ADD COLUMN materials JSON DEFAULT "[]";');
                console.log('Materials column added.');
            }

            const questionColumns = await sequelize.query("PRAGMA table_info(Questions);", { type: sequelize.QueryTypes.SELECT });
            const hasSubcategoryId = questionColumns.some(c => c.name === 'subcategoryId');
            if (!hasSubcategoryId) {
                console.log('Adding missing subcategoryId column to Questions table...');
                await sequelize.query('ALTER TABLE Questions ADD COLUMN subcategoryId INTEGER REFERENCES QuestionSubcategories(id) ON DELETE SET NULL;');
                console.log('subcategoryId column added.');
            }
        } catch (err) {
            console.error('Migration error (Users/Lessons/Questions):', err.message);
        }
    } else if (sequelize.getDialect() === 'postgres') {
        try {
            await sequelize.query(`
                ALTER TABLE "Questions"
                ADD COLUMN IF NOT EXISTS "subcategoryId" INTEGER
                REFERENCES "QuestionSubcategories"("id") ON DELETE SET NULL;
            `);
        } catch (err) {
            console.error('Migration error (Postgres Questions.subcategoryId):', err.message);
        }
    }

    // Seed Question Categories if empty
    try {
        const catCount = await QuestionCategory.count();
        if (catCount === 0) {
            console.log('Seeding bilingual QuestionCategories and QuestionSubcategories...');
            for (const catItem of questionCategoriesSeed) {
                const category = await QuestionCategory.create({
                    name_kk: catItem.name_kk,
                    name_ru: catItem.name_ru,
                    sort_order: catItem.sort_order
                });
                const subs = catItem.subcategories.map((sub, idx) => ({
                    categoryId: category.id,
                    name_kk: sub.name_kk,
                    name_ru: sub.name_ru,
                    sort_order: idx + 1
                }));
                await QuestionSubcategory.bulkCreate(subs);
            }
            console.log('QuestionCategories seed complete.');
        }
    } catch (seedErr) {
        console.error('QuestionCategories seed error:', seedErr.message);
    }

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


    // Auto-Migration for Schema Fix (Only for SQLite)
    if (sequelize.getDialect() === 'sqlite') {
        try {
            const checkOld = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='UserAccess';", { type: sequelize.QueryTypes.SELECT });
            if (checkOld.length > 0) {
                console.log('Found legacy UserAccess table. Migrating data to UserCourses...');
                await sequelize.query('INSERT OR IGNORE INTO UserCourses (UserId, CourseId, createdAt, updatedAt) SELECT UserId, CourseId, createdAt, updatedAt FROM UserAccess');
                console.log('Migration to UserCourses complete.');
            }

            const checkOldTests = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='UserTestAccess';", { type: sequelize.QueryTypes.SELECT });
            if (checkOldTests.length > 0) {
                console.log('Found legacy UserTestAccess table. Migrating data to UserTests...');
                await sequelize.query('INSERT OR IGNORE INTO UserTests (UserId, TestId, createdAt, updatedAt) SELECT UserId, TestId, createdAt, updatedAt FROM UserTestAccess');
                console.log('Migration to UserTests complete.');
            }
        } catch (migErr) {
            console.error('Migration warning (non-critical):', migErr.message);
        }
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Database sync failed:', err);
});
