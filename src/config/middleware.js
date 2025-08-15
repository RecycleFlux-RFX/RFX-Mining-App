const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Rate limiting
const limiter = rateLimit({
  windowMs: 40 * 60 * 10000, // 40 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 40 minutes',
  skip: (req) => {
    return req.path === '/health-check' || req.ip === '44.226.145.213';
  }
});

// Request slow-down
const speedLimiter = slowDown({
  windowMs: 40 * 60 * 10000, // 40 minutes
  delayAfter: 500,
  delayMs: () => 500,
  skip: (req) => {
    return req.path === '/health-check';
  }
});

module.exports = { limiter, speedLimiter };