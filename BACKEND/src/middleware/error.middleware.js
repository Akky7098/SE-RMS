const env = require("../config/env");

const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(err);

  let statusCode =
    err.statusCode || 500;

  let message =
    err.message ||
    "Internal server error";

  /*
   * Mongo duplicate key.
   */
  if (err.code === 11000) {
    statusCode = 409;

    const field =
      Object.keys(
        err.keyPattern || {}
      )[0];

    message =
      field
        ? `${field} already exists`
        : "Duplicate record";
  }

  /*
   * Invalid MongoDB ObjectId.
   */
  if (
    err.name === "CastError"
  ) {
    statusCode = 400;
    message =
      "Invalid resource ID";
  }

  /*
   * Mongoose validation.
   */
  if (
    err.name ===
    "ValidationError"
  ) {
    statusCode = 400;

    message =
      Object.values(
        err.errors
      )
        .map(
          (error) =>
            error.message
        )
        .join(", ");
  }

  const response = {
    success: false,
    message,
  };

  if (
    err.errors &&
    err.errors.length
  ) {
    response.errors =
      err.errors;
  }

  if (
    env.nodeEnv ===
    "development"
  ) {
    response.stack =
      err.stack;
  }

  res
    .status(statusCode)
    .json(response);
};

module.exports =
  errorHandler;