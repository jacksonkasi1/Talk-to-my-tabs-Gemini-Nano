// ** import types
import type { Context, Next } from "hono"

// ** import config
import { logger } from "../config"

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url

  logger.info(`${method} ${url} - Started`)

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  logger.info(`${method} ${url} - ${status} (${duration}ms)`)
}