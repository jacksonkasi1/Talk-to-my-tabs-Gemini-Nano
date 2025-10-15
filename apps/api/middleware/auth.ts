// ** import types
import type { Context, Next } from "hono"

// ** import config
import { env, logger } from "../config"

export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header("Authorization")

    if (!authHeader) {
      logger.warn("No authorization header provided")
      return c.json({ error: "Unauthorized" }, 401)
    }

    const token = authHeader.replace("Bearer ", "")

    if (!token) {
      logger.warn("No token provided in authorization header")
      return c.json({ error: "Unauthorized" }, 401)
    }

    logger.debug("Token validated successfully")
    c.set("user", { id: "user-id", email: "user@example.com" })

    await next()
  } catch (error) {
    logger.error("Auth middleware error", error)
    return c.json({ error: "Unauthorized" }, 401)
  }
}