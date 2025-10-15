// ** import lib
import { Hono } from "hono"
import { db, schema } from "../db"

const app = new Hono()

app.get("/", async (c) => {
  const notifications = await db.select().from(schema.notifications)
  return c.json({ notifications })
})

export default app