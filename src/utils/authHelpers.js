const jwt = require('jsonwebtoken');

function generateAuthToken(user) {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin || 
        (user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
         user.email === process.env.SUPER_ADMIN_EMAIL_2)
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function formatUserResponse(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    walletAddress: user.walletAddress,
    isAdmin: user.isAdmin,
    isSuperAdmin: user.isSuperAdmin || 
      (user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
       user.email === process.env.SUPER_ADMIN_EMAIL_2),
    earnings: user.earnings,
    referralLink: `${process.env.FRONTEND_URL}/signup?ref=${user._id}`
  };
}

module.exports = {
  generateAuthToken,
  formatUserResponse
};