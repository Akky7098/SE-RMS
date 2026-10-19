const net = require("net");

/*
 * ============================================================
 * OMRON CP2E - MACHINE COMMUNICATION SERVICE
 * ============================================================
 *
 * CURRENT PHASE:
 * Network diagnostics only.
 *
 * IMPORTANT:
 * - No PLC memory is written.
 * - No PLC configuration is changed.
 * - No machine command is sent.
 * - TCP connection tests only.
 *
 * Once the PLC communication details and memory map are received,
 * actual READ-ONLY FINS/Modbus reads will be added here.
 * ============================================================
 */

const PLC_CONFIG = {
  ip: (process.env.PLC_IP || "").trim(),

  ports: {
    modbusTcp: Number(process.env.PLC_MODBUS_PORT || 502),
    finsTcp: Number(process.env.PLC_FINS_PORT || 9600),
  },

  timeout: Number(process.env.PLC_CONNECTION_TIMEOUT || 2000),
};

/*
 * Validate IPv4 address.
 */
function isValidIPv4(ip) {
  if (!ip) return false;

  const parts = ip.split(".");

  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;

    const value = Number(part);

    return value >= 0 && value <= 255;
  });
}

/*
 * Validate TCP port.
 */
function isValidPort(port) {
  return (
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535
  );
}

/*
 * Generic READ-ONLY TCP connectivity test.
 *
 * This does NOT send a PLC command.
 * It only attempts to establish a TCP connection.
 */
function testTcpPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    let finished = false;

    const startedAt = Date.now();

    const finish = (result) => {
      if (finished) return;

      finished = true;

      const responseTimeMs = Date.now() - startedAt;

      socket.destroy();

      resolve({
        port,
        ...result,
        responseTimeMs,
      });
    };

    socket.setTimeout(timeout);

    socket.once("connect", () => {
      finish({
        reachable: true,
        reason: null,
      });
    });

    socket.once("timeout", () => {
      finish({
        reachable: false,
        reason: "TIMEOUT",
      });
    });

    socket.once("error", (error) => {
      finish({
        reachable: false,
        reason: error.code || error.message,
      });
    });

    try {
      socket.connect({
        host,
        port,
      });
    } catch (error) {
      finish({
        reachable: false,
        reason: error.message,
      });
    }
  });
}

/*
 * Check PLC configuration before attempting communication.
 */
function validateConfiguration() {
  const errors = [];

  if (!PLC_CONFIG.ip) {
    errors.push("PLC_IP is not configured.");
  } else if (!isValidIPv4(PLC_CONFIG.ip)) {
    errors.push("PLC_IP is not a valid IPv4 address.");
  }

  if (!isValidPort(PLC_CONFIG.ports.modbusTcp)) {
    errors.push("PLC_MODBUS_PORT is invalid.");
  }

  if (!isValidPort(PLC_CONFIG.ports.finsTcp)) {
    errors.push("PLC_FINS_PORT is invalid.");
  }

  if (
    !Number.isFinite(PLC_CONFIG.timeout) ||
    PLC_CONFIG.timeout <= 0
  ) {
    errors.push("PLC_CONNECTION_TIMEOUT is invalid.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/*
 * Main machine diagnostic.
 */
async function getMachineStatus() {
  const timestamp = new Date().toISOString();

  const validation = validateConfiguration();

  /*
   * PLC IP not available yet.
   */
  if (!PLC_CONFIG.ip) {
    return {
      configured: false,

      plc: {
        manufacturer: "OMRON",
        family: "CP2E",
      },

      mode: "READ_ONLY",

      networkReachable: false,

      dataReadable: false,

      message:
        "Waiting for PLC IP and communication details.",

      timestamp,
    };
  }

  /*
   * Configuration exists but is invalid.
   */
  if (!validation.valid) {
    return {
      configured: true,

      plc: {
        manufacturer: "OMRON",
        family: "CP2E",
        ip: PLC_CONFIG.ip,
      },

      mode: "READ_ONLY",

      networkReachable: false,

      dataReadable: false,

      configurationErrors: validation.errors,

      timestamp,
    };
  }

  /*
   * Test possible TCP services in parallel.
   *
   * NOTE:
   *
   * Port 502:
   * Possible Modbus TCP server.
   *
   * Port 9600:
   * Possible FINS/TCP service.
   *
   * FINS/UDP is NOT tested here because this is a TCP
   * connectivity diagnostic.
   */
  const [modbusTcp, finsTcp] = await Promise.all([
    testTcpPort(
      PLC_CONFIG.ip,
      PLC_CONFIG.ports.modbusTcp,
      PLC_CONFIG.timeout
    ),

    testTcpPort(
      PLC_CONFIG.ip,
      PLC_CONFIG.ports.finsTcp,
      PLC_CONFIG.timeout
    ),
  ]);

  const networkReachable =
    modbusTcp.reachable ||
    finsTcp.reachable;

  /*
   * IMPORTANT:
   *
   * dataReadable stays false until we successfully perform
   * an actual READ operation against a confirmed PLC address.
   */
  const dataReadable = false;

  return {
    configured: true,

    plc: {
      manufacturer: "OMRON",
      family: "CP2E",
      ip: PLC_CONFIG.ip,
    },

    mode: "READ_ONLY",

    networkReachable,

    dataReadable,

    protocols: {
      modbusTcp: {
        port: PLC_CONFIG.ports.modbusTcp,
        status: modbusTcp.reachable
          ? "PORT_OPEN"
          : "PORT_NOT_REACHABLE",
        ...modbusTcp,
      },

      finsTcp: {
        port: PLC_CONFIG.ports.finsTcp,
        status: finsTcp.reachable
          ? "PORT_OPEN"
          : "PORT_NOT_REACHABLE",
        ...finsTcp,
      },

      finsUdp: {
        port: PLC_CONFIG.ports.finsTcp,
        status: "NOT_TESTED",
        message:
          "FINS/UDP requires protocol-level testing after PLC network details are confirmed.",
      },
    },

    message: networkReachable
      ? "PLC network service detected. PLC memory read has not yet been verified."
      : "No tested TCP PLC service is currently reachable.",

    timestamp,
  };
}

module.exports = {
  getMachineStatus,
};