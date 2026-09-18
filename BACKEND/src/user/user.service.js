const { User } = require("./user.model");
const ApiError = require("../utils/ApiError");

const findUserById = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(
      404,
      "User not found"
    );
  }

  return user;
};

const findUserByEmail = async (
  email,
  includePassword = false
) => {
  let query = User.findOne({
    email: email.toLowerCase().trim(),
  });

  if (includePassword) {
    query = query.select(
      "+passwordHash"
    );
  }

  return query;
};

const updateLastLogin = async (
  userId
) => {
  return User.findByIdAndUpdate(
    userId,
    {
      lastLoginAt: new Date(),
    },
    {
      new: true,
    }
  );
};

module.exports = {
  findUserById,
  findUserByEmail,
  updateLastLogin,
};