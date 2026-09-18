const asyncHandler = require("../utils/asyncHandler");
const { findUserById } = require("./user.service");

const getMe = asyncHandler(
  async (req, res) => {
    const user = await findUserById(
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  }
);

module.exports = {
  getMe,
};