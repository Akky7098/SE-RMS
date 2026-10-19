const machineService = require("./machine.service");

const getStatus = async (req, res) => {
  try {
    const data =
      await machineService.getMachineStatus();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Machine status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getStatus,
};