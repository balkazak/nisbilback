const { User } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
    try {
        const hashedPassword = bcrypt.hashSync('admin123', 8);
        const [updatedRows] = await User.update(
            { password: hashedPassword },
            { where: { username: 'admin' } }
        );

        if (updatedRows > 0) {
            console.log('Admin password successfully reset to "admin123"');
        } else {
            console.log('Admin user not found. No changes made.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error resetting admin password:', error);
        process.exit(1);
    }
}

resetAdminPassword();
