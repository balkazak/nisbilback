const { Group, User, CuratorGroups } = require('../models');

exports.getAllGroups = async (req, res) => {
    try {
        let whereClause = {};

        // If Curator, only show their own curated groups
        if (req.user.role === 'curator' || req.user.role === 'teacher') {
            const curator = await User.findByPk(req.user.id, {
                include: [{ model: Group, as: 'curatedGroups', attributes: ['id'] }]
            });
            const curatedGroupIds = curator && curator.curatedGroups
                ? curator.curatedGroups.map(g => g.id)
                : [];
            whereClause = { id: curatedGroupIds };
        }

        const groups = await Group.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'curators',
                    attributes: ['id', 'username', 'phone', 'role'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'students',
                    attributes: ['id', 'username', 'phone', 'createdAt']
                }
            ],
            order: [['name', 'ASC']]
        });

        const formatted = groups.map(g => {
            const json = g.toJSON();
            json.studentsCount = json.students ? json.students.length : 0;
            return json;
        });

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getGroupById = async (req, res) => {
    try {
        // If Curator, verify access to this group
        if (req.user.role === 'curator' || req.user.role === 'teacher') {
            const curator = await User.findByPk(req.user.id, {
                include: [{ model: Group, as: 'curatedGroups', attributes: ['id'] }]
            });
            const curatedGroupIds = curator && curator.curatedGroups
                ? curator.curatedGroups.map(g => g.id)
                : [];
            if (!curatedGroupIds.includes(Number(req.params.id))) {
                return res.status(403).json({ message: 'У вас нет доступа к этой группе' });
            }
        }

        const group = await Group.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'curators',
                    attributes: ['id', 'username', 'phone', 'role'],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'students',
                    attributes: ['id', 'username', 'phone', 'createdAt']
                }
            ],
            order: [[{ model: User, as: 'students' }, 'id', 'ASC']]
        });

        if (!group) return res.status(404).json({ message: 'Группа не найдена' });

        const json = group.toJSON();
        json.studentsCount = json.students ? json.students.length : 0;
        res.status(200).json(json);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { name, description, curatorIds } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Название группы обязательно' });
        }

        const existing = await Group.findOne({ where: { name: name.trim() } });
        if (existing) {
            return res.status(400).json({ message: 'Группа с таким названием уже существует' });
        }

        const group = await Group.create({
            name: name.trim(),
            description: description ? description.trim() : null
        });

        if (curatorIds && Array.isArray(curatorIds) && curatorIds.length > 0) {
            const curators = await User.findAll({
                where: {
                    id: curatorIds,
                    role: ['curator', 'teacher', 'admin']
                }
            });
            await group.setCurators(curators);
        }

        const reloaded = await Group.findByPk(group.id, {
            include: [{ model: User, as: 'curators', attributes: ['id', 'username', 'phone', 'role'], through: { attributes: [] } }]
        });

        res.status(201).json(reloaded);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateGroup = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ message: 'Группа не найдена' });

        const { name, description, curatorIds } = req.body;

        if (name && name.trim()) {
            const existing = await Group.findOne({ where: { name: name.trim() } });
            if (existing && existing.id !== group.id) {
                return res.status(400).json({ message: 'Группа с таким названием уже существует' });
            }
            group.name = name.trim();
        }

        if (description !== undefined) {
            group.description = description ? description.trim() : null;
        }

        await group.save();

        if (curatorIds && Array.isArray(curatorIds)) {
            const curators = await User.findAll({
                where: {
                    id: curatorIds,
                    role: ['curator', 'teacher', 'admin']
                }
            });
            await group.setCurators(curators);
        }

        const reloaded = await Group.findByPk(group.id, {
            include: [
                { model: User, as: 'curators', attributes: ['id', 'username', 'phone', 'role'], through: { attributes: [] } },
                { model: User, as: 'students', attributes: ['id', 'username', 'phone', 'createdAt'] }
            ]
        });

        res.status(200).json(reloaded);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ message: 'Группа не найдена' });

        // Detach all students first
        await User.update({ groupId: null }, { where: { groupId: group.id } });

        // Destroy group
        await group.destroy();

        res.status(200).json({ message: 'Группа успешно удалена' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.assignStudents = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).json({ message: 'Группа не найдена' });

        const { studentIds } = req.body;
        if (!studentIds || !Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'Список studentIds обязателен' });
        }

        await User.update({ groupId: group.id }, {
            where: {
                id: studentIds,
                role: 'student'
            }
        });

        res.status(200).json({ message: 'Ученики успешно добавлены в группу' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.removeStudent = async (req, res) => {
    try {
        const { id, studentId } = req.params;
        const student = await User.findOne({ where: { id: studentId, groupId: id } });
        if (!student) return res.status(404).json({ message: 'Ученик не найден в этой группе' });

        student.groupId = null;
        await student.save();

        res.status(200).json({ message: 'Ученик исключен из группы' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
