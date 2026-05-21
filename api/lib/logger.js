"use strict";

const pino = require("pino");

const isDev = process.env.NODE_ENV !== "production";

// Campos que NUNCA devem aparecer no log (senha, token, api key, cookie de sessão)
const REDACT_PATHS = [
    "req.headers.authorization",
    "req.headers.cookie",
    'req.headers["x-api-key"]',
    "*.senha",
    "*.password",
    "*.token",
    "*.api_key",
    "req.body.senha",
    "req.body.password",
    "req.body.token",
    "res.headers['set-cookie']",
];

const logger = pino({
    level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
    redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    // Em dev, formata legível para humano; em prod, JSON puro (vai pro stdout do container)
    transport: isDev
        ? {
              target: "pino-pretty",
              options: {
                  colorize: true,
                  translateTime: "yyyy-mm-dd HH:MM:ss.l",
                  ignore: "pid,hostname",
              },
          }
        : undefined,
});

module.exports = logger;
