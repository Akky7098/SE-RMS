const mongoose =
  require(
    "mongoose"
  );

const counterSchema =
  new mongoose.Schema(
    {
      key: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,
      },

      sequence: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

const ManpowerCounter =
  mongoose.models
    .ManpowerCounter ||
  mongoose.model(
    "ManpowerCounter",
    counterSchema
  );

module.exports = {
  ManpowerCounter,
};