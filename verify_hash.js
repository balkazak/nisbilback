const bcrypt = require('bcryptjs');

const passwords = ['admin123', 'admin', 'password', '123456'];
const hash = '$2b$08$3AAQ1nfPAmprNErUnLLjm.Gf7L0DDztBDegwxOgOciMzY8W39G3PO';

passwords.forEach(pw => {
    const match = bcrypt.compareSync(pw, hash);
    console.log(`Password "${pw}" match:`, match);
});
