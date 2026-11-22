import { randomUUID } from "node:crypto";
import pino from "pino";
import pinoHttp from "pino-http";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "tracker-api" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (level) => ({ level }) },
});

function requestFields(req, res, { responseTime }) {
  return {
    event: "http.request",
    method: req.method,
    route: typeof req.route?.path === "string" ? req.baseUrl + req.route.path : undefined,
    statusCode: res.statusCode,
    durationMs: responseTime,
  };
}

export const requestLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  quietResLogger: true,
  genReqId(_req, res) {
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessObject: requestFields,
  customErrorObject: (req, res, _error, details) => requestFields(req, res, details),
});
