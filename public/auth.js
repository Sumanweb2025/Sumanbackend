const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const hashCompare = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const createToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
};

module.exports = {
  hashPassword,
  hashCompare,
  createToken,
};
