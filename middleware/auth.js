const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    const tokenPart = token.split(' ')[1];
    if (!tokenPart) return res.status(403).json({ message: 'Malformed token' });

    jwt.verify(tokenPart, process.env.JWT_SECRET || 'secret_key_123', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Failed to authenticate token' });
        req.user = decoded; // { id, role }
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Require Admin Role' });
    }
    next();
};

const isOperatorOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'operator') {
        return res.status(403).json({ message: 'Require Operator or Admin Role' });
    }
    next();
};

const isStaff = (req, res, next) => {
    const staffRoles = ['admin', 'operator', 'curator', 'teacher'];
    if (!staffRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Require Staff Role' });
    }
    next();
};

// Kept for backward compatibility
const isTeacherOrAdmin = (req, res, next) => {
    const allowed = ['admin', 'curator', 'teacher', 'operator'];
    if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access Denied' });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    isOperatorOrAdmin,
    isStaff,
    isTeacherOrAdmin
};
