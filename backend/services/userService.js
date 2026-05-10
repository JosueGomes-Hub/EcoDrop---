const authService = require("./authService");

async function getProfile(userId) {
  return authService.getAuthenticatedUser(userId);
}

async function updateProfile(userId, payload) {
  return authService.updateAuthenticatedUser(userId, payload);
}

async function changePassword(userId, payload) {
  return authService.changeAuthenticatedUserPassword(userId, payload);
}

module.exports = {
  changePassword,
  getProfile,
  updateProfile,
};
