const mongoose =
  require("mongoose");

const passwordResetOtpSchema =
  new mongoose.Schema(
    {
      user: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      email: {
        type:
          String,

        required:
          true,

        lowercase:
          true,

        trim:
          true,

        index:
          true,
      },

      otpHash: {
        type:
          String,

        required:
          true,

        select:
          false,
      },

      expiresAt: {
        type:
          Date,

        required:
          true,

        index: {
          expires:
            0,
        },
      },

      attempts: {
        type:
          Number,

        default:
          0,
      },

      maxAttempts: {
        type:
          Number,

        default:
          5,
      },

      verifiedAt: {
        type:
          Date,

        default:
          null,
      },

      usedAt: {
        type:
          Date,

        default:
          null,
      },

      requestIp:
  req?.ip ||
  null,

      userAgent: {
        type:
          String,

        default:
          null,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

passwordResetOtpSchema.index(
  {
    user:
      1,

    createdAt:
      -1,
  }
);

const PasswordResetOtp =
  mongoose.model(
    "PasswordResetOtp",
    passwordResetOtpSchema
  );

module.exports =
  PasswordResetOtp;