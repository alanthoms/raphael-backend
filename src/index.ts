import express from "express";
import acpsRouter from "./routes/acps";
import cors from "cors";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
const app = express();
const port = 8000;

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is not defined in environment variables");

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleware); // Apply security middleware globally

app.use("/api/acps", acpsRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
