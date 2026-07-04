require("dotenv").config();

// Configuration for ZKTeco Device
let ZK_IP   = process.env.ZKTECO_IP   || "192.168.68.100";
let ZK_PORT = parseInt(process.env.ZKTECO_PORT || "8010", 10);

module.exports = { get ZK_IP() { return ZK_IP; }, set ZK_IP(v) { ZK_IP = v; },
                   get ZK_PORT() { return ZK_PORT; }, set ZK_PORT(v) { ZK_PORT = v; } };
