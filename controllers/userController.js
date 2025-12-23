const bcrypt = require('bcryptjs');
const { User, Course, Test } = require('../models');

exports.createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validation
        if (!['admin', 'teacher', 'student'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Only Admin can create Teachers/Admins. Teachers can only create Students.
        if (req.user.role === 'teacher' && role !== 'student') {
            return res.status(403).json({ message: 'Teachers can only create Student accounts' });
        }

        const hashedPassword = bcrypt.hashSync(password, 8);
        const user = await User.create({
            username,
            password: hashedPassword,
            role,
            created_by: req.user.id
        });

        res.status(201).json({ message: 'User registered successfully!', userId: user.id });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const whereClause = {};
        if (req.query.role) {
            whereClause.role = req.query.role;
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'username', 'role', 'created_by', 'createdAt']
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateUserAccess = async (req, res) => {
    try {
        const { userId } = req.params;
        const { courseIds, testIds } = req.body;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (courseIds) {
            await user.setCourses(courseIds);
        }
        if (testIds) {
            await user.setTests(testIds);
        }

        res.status(200).json({ message: 'Access updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserAccess = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [Course, Test]
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            courses: user.Courses.map(c => c.id),
            tests: user.Tests.map(t => t.id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findByPk(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        if (userToDelete.username === 'admin') {
            return res.status(403).json({ message: 'Главного администратора нельзя удалить' });
        }

        await userToDelete.destroy();
        res.status(200).json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
