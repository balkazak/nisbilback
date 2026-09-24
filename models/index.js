const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM('admin', 'curator', 'operator', 'teacher', 'student'), allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: true }, // ID of admin/curator/operator who created this user
    coins: { type: DataTypes.INTEGER, defaultValue: 0 },
    groupId: { type: DataTypes.INTEGER, allowNull: true } // For student: assigned group
});

const Group = sequelize.define('Group', {
    name: { type: DataTypes.STRING, unique: true, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true }
});

const CuratorGroups = sequelize.define('CuratorGroups', {
    UserId: {
        type: DataTypes.INTEGER,
        references: { model: 'Users', key: 'id' },
        allowNull: false
    },
    GroupId: {
        type: DataTypes.INTEGER,
        references: { model: 'Groups', key: 'id' },
        allowNull: false
    }
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
    category: { type: DataTypes.ENUM('standard', 'bil', 'nis'), defaultValue: 'standard' },
    is_trial: { type: DataTypes.BOOLEAN, defaultValue: false },
    coin_price: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Question = sequelize.define('Question', {
    text: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING }, // Optional image for the question
    options: { type: DataTypes.JSON, allowNull: false }, // Array of { text, image_url }
    correct_option_index: { type: DataTypes.INTEGER, allowNull: false },
    score_value: { type: DataTypes.INTEGER, defaultValue: 1 },
    question_type: { type: DataTypes.ENUM('standard', 'sandyk_sippattama'), defaultValue: 'standard' }
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

// Group & Student (1-to-many: student belongs to exactly one group)
Group.hasMany(User, { as: 'students', foreignKey: 'groupId' });
User.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });

// Group & Curator (many-to-many: curator can manage multiple groups)
Group.belongsToMany(User, { through: CuratorGroups, as: 'curators', foreignKey: 'GroupId' });
User.belongsToMany(Group, { through: CuratorGroups, as: 'curatedGroups', foreignKey: 'UserId' });

module.exports = {
    sequelize,
    User,
    Course,
    Lesson,
    Test,
    Question,
    Result,
    UserCourses,
    UserTests,
    Group,
    CuratorGroups
};
