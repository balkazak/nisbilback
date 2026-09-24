const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const neonUrl = 'postgresql://neondb_owner:npg_nweVL4mkvC8J@ep-still-mud-b47jx7nt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sqliteDbPath = path.join(__dirname, '..', 'backups', 'prod_live_database.sqlite');

const neonSequelize = new Sequelize(neonUrl, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// Define Models on Neon
const User = neonSequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'teacher', 'student'), allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    coins: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Course = neonSequelize.define('Course', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    thumbnail_url: { type: DataTypes.STRING }
});

const Lesson = neonSequelize.define('Lesson', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    video_urls: { type: DataTypes.JSON, defaultValue: [] },
    solution_video_urls: { type: DataTypes.JSON, defaultValue: [] },
    materials: { type: DataTypes.JSON, defaultValue: [] },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    CourseId: { type: DataTypes.INTEGER }
});

const Test = neonSequelize.define('Test', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    time_limit: { type: DataTypes.INTEGER, allowNull: true },
    is_standalone: { type: DataTypes.BOOLEAN, defaultValue: false },
    category: { type: DataTypes.ENUM('standard', 'bil'), defaultValue: 'standard' },
    is_trial: { type: DataTypes.BOOLEAN, defaultValue: false },
    coin_price: { type: DataTypes.INTEGER, defaultValue: 0 },
    lessonId: { type: DataTypes.INTEGER, allowNull: true }
});

const Question = neonSequelize.define('Question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    text: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING },
    options: { type: DataTypes.JSON, allowNull: false },
    correct_option_index: { type: DataTypes.INTEGER, allowNull: false },
    score_value: { type: DataTypes.INTEGER, defaultValue: 1 },
    TestId: { type: DataTypes.INTEGER }
});

const Result = neonSequelize.define('Result', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    score: { type: DataTypes.INTEGER, allowNull: false },
    max_score: { type: DataTypes.INTEGER, allowNull: false },
    details: { type: DataTypes.JSON },
    completed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    UserId: { type: DataTypes.INTEGER },
    TestId: { type: DataTypes.INTEGER }
});

const UserCourses = neonSequelize.define('UserCourses', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    UserId: { type: DataTypes.INTEGER, allowNull: false },
    CourseId: { type: DataTypes.INTEGER, allowNull: false }
});

const UserTests = neonSequelize.define('UserTests', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    UserId: { type: DataTypes.INTEGER, allowNull: false },
    TestId: { type: DataTypes.INTEGER, allowNull: false }
});

// Relationships
Course.hasMany(Lesson, { onDelete: 'CASCADE' });
Lesson.belongsTo(Course);

Lesson.hasOne(Test, { foreignKey: 'lessonId', onDelete: 'SET NULL' });
Test.belongsTo(Lesson, { foreignKey: 'lessonId' });

Test.hasMany(Question, { onDelete: 'CASCADE' });
Question.belongsTo(Test);

User.belongsToMany(Course, { through: UserCourses });
Course.belongsToMany(User, { through: UserCourses });

User.belongsToMany(Test, { through: UserTests });
Test.belongsToMany(User, { through: UserTests });

User.hasMany(Result);
Result.belongsTo(User);
Test.hasMany(Result);
Result.belongsTo(Test);

function querySqlite(db, query) {
    return new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function parseJsonFields(rows, jsonFields) {
    return rows.map(row => {
        const copy = { ...row };
        for (const field of jsonFields) {
            if (typeof copy[field] === 'string') {
                try {
                    copy[field] = JSON.parse(copy[field]);
                } catch (e) {
                    copy[field] = [];
                }
            }
        }
        return copy;
    });
}

async function migrate() {
    console.log('🚀 Starting migration from production SQLite to Neon Postgres...');
    const sqliteDb = new sqlite3.Database(sqliteDbPath);

    try {
        console.log('📦 Syncing schema on Neon (creating tables)...');
        await neonSequelize.sync({ force: true });
        console.log('✅ Tables created on Neon.');

        // 1. Users
        console.log('Migrating Users...');
        const users = await querySqlite(sqliteDb, 'SELECT * FROM Users');
        await User.bulkCreate(users, { validate: false });
        console.log(`✓ Migrated ${users.length} Users`);

        // 2. Courses
        console.log('Migrating Courses...');
        const courses = await querySqlite(sqliteDb, 'SELECT * FROM Courses');
        await Course.bulkCreate(courses, { validate: false });
        console.log(`✓ Migrated ${courses.length} Courses`);

        // 3. Lessons
        console.log('Migrating Lessons...');
        let lessons = await querySqlite(sqliteDb, 'SELECT * FROM Lessons');
        lessons = parseJsonFields(lessons, ['video_urls', 'solution_video_urls', 'materials']);
        await Lesson.bulkCreate(lessons, { validate: false });
        console.log(`✓ Migrated ${lessons.length} Lessons`);

        // 4. Tests
        console.log('Migrating Tests...');
        let tests = await querySqlite(sqliteDb, 'SELECT * FROM Tests');
        tests = tests.map(t => ({
            ...t,
            is_standalone: Boolean(t.is_standalone),
            is_trial: Boolean(t.is_trial)
        }));
        await Test.bulkCreate(tests, { validate: false });
        console.log(`✓ Migrated ${tests.length} Tests`);

        // 5. Questions
        console.log('Migrating Questions...');
        let questions = await querySqlite(sqliteDb, 'SELECT * FROM Questions');
        questions = parseJsonFields(questions, ['options']);
        // Batch insert questions because there are 1655
        const batchSize = 200;
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            await Question.bulkCreate(batch, { validate: false });
        }
        console.log(`✓ Migrated ${questions.length} Questions`);

        // 6. Results
        console.log('Migrating Results...');
        let results = await querySqlite(sqliteDb, 'SELECT * FROM Results');
        results = parseJsonFields(results, ['details']);
        for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            await Result.bulkCreate(batch, { validate: false });
        }
        console.log(`✓ Migrated ${results.length} Results`);

        // 7. UserCourses
        console.log('Migrating UserCourses...');
        const userCourses = await querySqlite(sqliteDb, 'SELECT * FROM UserCourses');
        await UserCourses.bulkCreate(userCourses, { validate: false });
        console.log(`✓ Migrated ${userCourses.length} UserCourses`);

        // 8. UserTests
        console.log('Migrating UserTests...');
        const userTests = await querySqlite(sqliteDb, 'SELECT * FROM UserTests');
        await UserTests.bulkCreate(userTests, { validate: false });
        console.log(`✓ Migrated ${userTests.length} UserTests`);

        // Fix PostgreSQL auto-increment sequences
        console.log('Resetting PostgreSQL sequences...');
        const tablesWithSequences = [
            'Users', 'Courses', 'Lessons', 'Tests', 'Questions', 'Results', 'UserCourses', 'UserTests'
        ];
        for (const tbl of tablesWithSequences) {
            await neonSequelize.query(`
                SELECT setval(pg_get_serial_sequence('"${tbl}"', 'id'), COALESCE(MAX(id), 1) + 1, false)
                FROM "${tbl}";
            `);
        }
        console.log('✅ Sequences reset.');

        // Verification
        console.log('\n--- VERIFYING DATA ON NEON ---');
        for (const tbl of tablesWithSequences) {
            const [res] = await neonSequelize.query(`SELECT COUNT(*) as count FROM "${tbl}"`);
            console.log(`Table ${tbl}: ${res[0].count} rows`);
        }

        console.log('\n🎉 ALL DATA MIGRATED TO NEON SUCCESSFULLY!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        sqliteDb.close();
        await neonSequelize.close();
    }
}

migrate();
