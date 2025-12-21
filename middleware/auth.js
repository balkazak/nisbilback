const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    // Bearer <token>
    const tokenPart = token.split(' ')[1];
    if (!tokenPart) return res.status(403).json({ message: 'Malformed token' });

    jwt.verify(tokenPart, process.env.JWT_SECRET || 'secret_key_123', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Failed to authenticate token' });
        req.user = decoded; // { id, role }
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Require Admin Role' });
    next();
};

const isTeacherOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Require Teacher or Admin Role' });
    }
    next();
};

module.exports = { verifyToken, isAdmin, isTeacherOrAdmin };
