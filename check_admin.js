const { User } = require('./models');

async function checkAdmin() {
    try {
        const user = await User.findOne({ where: { username: 'admin' } });
        if (user) {
            console.log('Admin user found:');
            console.log('ID:', user.id);
            console.log('Username:', user.username);
            console.log('Role:', user.role);
            console.log('Password Hash:', user.password);
        } else {
            console.log('Admin user not found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAdmin();
