// ** import types
import type { Context, Next } from "hono"

// ** import validation
import { ZodError } from "zod"

// ** import config
import { logger } from "../config"

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    logger.error("Request error", error)

    if (error instanceof ZodError) {
      return c.json({
        error: "Validation error",
        details: error.errors
      }, 400)
    }

    if (error instanceof Error) {
      return c.json({
        error: error.message
      }, 500)
    }

    return c.json({
      error: "Internal server error"
    }, 500)
  }
}