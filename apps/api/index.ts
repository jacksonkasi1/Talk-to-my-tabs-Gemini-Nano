// ** import lib
import { Hono } from "hono"
import helloRoutes from "./routes/hello"
import notificationRoutes from "./routes/notifications"

const app = new Hono()

app.route("/hello", helloRoutes)
app.route("/notifications", notificationRoutes)

app.get("/", (c) => {
  return c.json({ message: "API is running!" })
})

export default {
  port: 5000,
  fetch: app.fetch,
}