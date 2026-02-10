const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'teacher', 'student'), allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true }, // ID of admin or teacher who created this user
    coins: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Course = sequelize.define('Course', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    thumbnail_url: { type: DataTypes.STRING }
});

const Lesson = sequelize.define('Lesson', {
    title: { type: DataTypes.STRING, allowNull: false },
    video_urls: { type: DataTypes.JSON, defaultValue: [] }, // Array of YouTube links
    solution_video_urls: { type: DataTypes.JSON, defaultValue: [] }, // Array of solution links
    materials: { type: DataTypes.JSON, defaultValue: [] }, // Array of { name, url } for PDF files
    order: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Test = sequelize.define('Test', {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    time_limit: { type: DataTypes.INTEGER, allowNull: true }, // In minutes, null for no limit
    is_standalone: { type: DataTypes.BOOLEAN, defaultValue: false }, // True if not attached to a specific video
    category: { type: DataTypes.ENUM('standard', 'bil'), defaultValue: 'standard' },
    is_trial: { type: DataTypes.BOOLEAN, defaultValue: false },
    coin_price: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING }, // Optional image for the question
    options: { type: DataTypes.JSON, allowNull: false }, // Array of { text, image_url }
    correct_option_index: { type: DataTypes.INTEGER, allowNull: false },
    score_value: { type: DataTypes.INTEGER, defaultValue: 1 }
});

const Result = sequelize.define('Result', {
    score: { type: DataTypes.INTEGER, allowNull: false },
    max_score: { type: DataTypes.INTEGER, allowNull: false },
    details: { type: DataTypes.JSON }, // Store user answers: { questionId: answerIndex }
    completed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const UserCourses = sequelize.define('UserCourses', {
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        allowNull: false,
        unique: false
    },
    CourseId: {
        type: DataTypes.INTEGER,
        references: { model: 'Courses', key: 'id' },
        allowNull: false,
        unique: false
    }
}, {
    indexes: [
        {
            unique: false,
            fields: ['UserId']
        },
        {
            unique: false,
            fields: ['CourseId']
        }
    ]
});

const UserTests = sequelize.define('UserTests', {
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        allowNull: false,
        unique: false
    },
    TestId: {
        type: DataTypes.INTEGER,
        references: { model: 'Tests', key: 'id' },
        allowNull: false,
        unique: false
    }
}, {
    indexes: [
        {
            unique: false,
            fields: ['UserId']
        },
        {
            unique: false,
            fields: ['TestId']
        }
    ]
});

// Relationships
Course.hasMany(Lesson, { onDelete: 'CASCADE' });
Lesson.belongsTo(Course);

// Tests can be attached to lessons or be standalone
Lesson.hasOne(Test, { foreignKey: 'lessonId', onDelete: 'SET NULL' });
Test.belongsTo(Lesson, { foreignKey: 'lessonId' });

// Tests have questions
Test.hasMany(Question, { onDelete: 'CASCADE' });
Question.belongsTo(Test);

// User Access (Courses)
User.belongsToMany(Course, { through: UserCourses });
Course.belongsToMany(User, { through: UserCourses });

// User Access (Tests)
User.belongsToMany(Test, { through: UserTests });
Test.belongsToMany(User, { through: UserTests });

// Results
User.hasMany(Result);
Result.belongsTo(User);
Test.hasMany(Result);
Result.belongsTo(Test);

module.exports = {
    sequelize,
    User,
    Course,
    Lesson,
    Test,
    Question,
    Result,
    UserCourses,
    UserTests
};
