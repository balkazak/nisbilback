const bcrypt = require('bcryptjs');
const { User, Course, Test, Group, CuratorGroups } = require('../models');

exports.createUser = async (req, res) => {
    try {
        const { username, password, phone, role, groupId, curatedGroupIds } = req.body;

        const validRoles = ['admin', 'curator', 'operator', 'student', 'teacher'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Неверная роль' });
        }

        // Role creation permission checks
        if (req.user.role === 'operator') {
            if (role === 'admin' || role === 'operator') {
                return res.status(403).json({ message: 'Оператор не может создавать администраторов или других операторов' });
            }
        } else if (req.user.role === 'curator' || req.user.role === 'teacher') {
            if (role !== 'student') {
                return res.status(403).json({ message: 'Куратор может создавать только аккаунты учеников' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Недостаточно прав для создания пользователей' });
        }

        const hashedPassword = bcrypt.hashSync(password, 8);

        // Prepare user data
        const userData = {
            username: username.trim(),
            password: hashedPassword,
            phone: phone ? phone.trim() : null,
            role,
            created_by: req.user.id
        };

        if (role === 'student' && groupId) {
            userData.groupId = groupId;
        }

        const user = await User.create(userData);

        // If curator and groups are provided, link them
        if ((role === 'curator' || role === 'teacher') && Array.isArray(curatedGroupIds) && curatedGroupIds.length > 0) {
            const groups = await Group.findAll({ where: { id: curatedGroupIds } });
            await user.setCuratedGroups(groups);
        }

        const reloaded = await User.findByPk(user.id, {
            attributes: ['id', 'username', 'phone', 'role', 'created_by', 'coins', 'groupId', 'createdAt'],
            include: [
                { model: Group, as: 'group', attributes: ['id', 'name'] },
                { model: Group, as: 'curatedGroups', attributes: ['id', 'name'], through: { attributes: [] } }
            ]
        });

        res.status(201).json({ message: 'Пользователь успешно создан!', user: reloaded });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, phone, role, groupId, curatedGroupIds } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        // Role permission checks
        if (req.user.role === 'operator') {
            if (user.role === 'admin' || user.role === 'operator') {
                return res.status(403).json({ message: 'Оператор не может редактировать администратора или оператора' });
            }
            if (role && (role === 'admin' || role === 'operator')) {
                return res.status(403).json({ message: 'Оператор не может назначать роль администратора или оператора' });
            }
        } else if (req.user.role === 'curator' || req.user.role === 'teacher') {
            if (user.role !== 'student') {
                return res.status(403).json({ message: 'Куратор может редактировать только учеников' });
            }
            if (role && role !== 'student') {
                return res.status(403).json({ message: 'Куратор не может менять роль ученика' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Недостаточно прав для редактирования пользователя' });
        }

        if (username && username.trim() && username.trim() !== user.username) {
            const existing = await User.findOne({ where: { username: username.trim() } });
            if (existing && existing.id !== user.id) {
                return res.status(400).json({ message: 'Пользователь с таким логином уже существует' });
            }
            user.username = username.trim();
        }

        if (password && password.trim()) {
            user.password = bcrypt.hashSync(password.trim(), 8);
        }

        if (phone !== undefined) {
            user.phone = phone ? phone.trim() : null;
        }

        if (role && ['admin', 'curator', 'operator', 'student', 'teacher'].includes(role)) {
            // Curator cannot change role
            if (req.user.role === 'admin' || req.user.role === 'operator') {
                user.role = role;
            }
        }

        if (user.role === 'student') {
            user.groupId = groupId !== undefined ? groupId : user.groupId;
        } else {
            user.groupId = null;
        }

        await user.save();

        if (user.role === 'curator' || user.role === 'teacher') {
            if (Array.isArray(curatedGroupIds)) {
                const groups = await Group.findAll({ where: { id: curatedGroupIds } });
                await user.setCuratedGroups(groups);
            }
        }

        const reloaded = await User.findByPk(user.id, {
            attributes: ['id', 'username', 'phone', 'role', 'created_by', 'coins', 'groupId', 'createdAt'],
            include: [
                { model: Group, as: 'group', attributes: ['id', 'name'] },
                { model: Group, as: 'curatedGroups', attributes: ['id', 'name'], through: { attributes: [] } }
            ]
        });

        res.status(200).json({ message: 'Данные пользователя успешно обновлены', user: reloaded });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const whereClause = {};
        if (req.query.role) {
            whereClause.role = req.query.role;
        }
        if (req.query.groupId) {
            whereClause.groupId = req.query.groupId;
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'username', 'phone', 'role', 'created_by', 'coins', 'groupId', 'createdAt'],
            include: [
                { model: Group, as: 'group', attributes: ['id', 'name'] },
                { model: Group, as: 'curatedGroups', attributes: ['id', 'name'], through: { attributes: [] } }
            ],
            order: [['id', 'DESC']]
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
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        if (courseIds && Array.isArray(courseIds)) {
            const uniqueCourseIds = [...new Set(courseIds)];
            const courses = await Course.findAll({ where: { id: uniqueCourseIds } });
            await user.setCourses(courses);
        }
        if (testIds && Array.isArray(testIds)) {
            const uniqueTestIds = [...new Set(testIds)];
            const tests = await Test.findAll({ where: { id: uniqueTestIds } });
            await user.setTests(tests);
        }

        res.status(200).json({ message: 'Доступы успешно обновлены' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUserAccess = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [Course, Test]
        });
        if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

        res.status(200).json({
            courses: user.Courses ? user.Courses.map(c => c.id) : [],
            tests: user.Tests ? user.Tests.map(t => t.id) : []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findByPk(req.params.id);
        if (!userToDelete) return res.status(404).json({ message: 'Пользователь не найден' });

        if (userToDelete.username === 'admin') {
            return res.status(403).json({ message: 'Главного администратора нельзя удалить' });
        }

        // Operator restrictions: can delete students and curators, but not admin/operator
        if (req.user.role === 'operator') {
            if (userToDelete.role === 'admin' || userToDelete.role === 'operator') {
                return res.status(403).json({ message: 'Оператор не может удалять администраторов или операторов' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Недостаточно прав для удаления' });
        }

        await userToDelete.destroy();
        res.status(200).json({ message: 'Пользователь удален' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
