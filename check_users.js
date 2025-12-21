const { User } = require('./models');

async function checkUsers() {
    try {
        const users = await User.findAll();
        console.log('Users found:', JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
