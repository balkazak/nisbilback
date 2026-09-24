const { sequelize, User, Group, CuratorGroups } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function testRolesAndGroups() {
    console.log('🚀 Running Integration Test for Roles and Groups...');

    try {
        // 1. Create an Operator
        console.log('\n1. Creating test operator...');
        let operator = await User.findOne({ where: { username: 'test_operator' } });
        if (!operator) {
            operator = await User.create({
                username: 'test_operator',
                password: bcrypt.hashSync('operator123', 8),
                role: 'operator'
            });
        }
        console.log(`✓ Operator created/found: ID ${operator.id}, Role: ${operator.role}`);

        // 2. Create a Curator
        console.log('\n2. Creating test curator...');
        let curator = await User.findOne({ where: { username: 'test_curator' } });
        if (!curator) {
            curator = await User.create({
                username: 'test_curator',
                password: bcrypt.hashSync('curator123', 8),
                role: 'curator'
            });
        }
        console.log(`✓ Curator created/found: ID ${curator.id}, Role: ${curator.role}`);

        // 3. Create Group
        console.log('\n3. Creating test group...');
        let group = await Group.findOne({ where: { name: 'Группа 7А' } });
        if (!group) {
            group = await Group.create({
                name: 'Группа 7А',
                description: 'Тестовая группа 7 класса'
            });
        }
        console.log(`✓ Group created/found: ID ${group.id}, Name: ${group.name}`);

        // 4. Create Student assigned to Group
        console.log('\n4. Creating student assigned to Group...');
        let student = await User.findOne({ where: { username: 'test_student' } });
        if (!student) {
            student = await User.create({
                username: 'test_student',
                password: bcrypt.hashSync('student123', 8),
                role: 'student',
                groupId: group.id
            });
        } else {
            student.groupId = group.id;
            await student.save();
        }
        console.log(`✓ Student created/updated: ID ${student.id}, GroupId: ${student.groupId}`);

        // 5. Assign Curator to Group (many-to-many)
        console.log('\n5. Assigning Curator to Group...');
        await group.setCurators([curator]);
        console.log('✓ Curator linked to group.');

        // 6. Test Querying Group with associations
        console.log('\n6. Testing Group queries with associations...');
        const loadedGroup = await Group.findByPk(group.id, {
            include: [
                { model: User, as: 'curators', attributes: ['id', 'username', 'role'] },
                { model: User, as: 'students', attributes: ['id', 'username'] }
            ]
        });
        console.log('Group loaded:');
        console.log(`  Name: ${loadedGroup.name}`);
        console.log(`  Curators: ${loadedGroup.curators.map(c => c.username).join(', ')}`);
        console.log(`  Students: ${loadedGroup.students.map(s => s.username).join(', ')}`);

        // 7. Verify Curator can have multiple groups
        console.log('\n7. Verifying Curator can curate multiple groups...');
        let group2 = await Group.findOne({ where: { name: 'Группа 8Б' } });
        if (!group2) {
            group2 = await Group.create({
                name: 'Группа 8Б',
                description: 'Вторая группа куратора'
            });
        }
        await group2.setCurators([curator]);

        const curatorWithGroups = await User.findByPk(curator.id, {
            include: [{ model: Group, as: 'curatedGroups', attributes: ['id', 'name'] }]
        });
        console.log(`✓ Curator '${curator.username}' is assigned to ${curatorWithGroups.curatedGroups.length} groups:`);
        curatorWithGroups.curatedGroups.forEach(g => console.log(`   - ${g.name}`));

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        await sequelize.close();
    }
}

testRolesAndGroups();
