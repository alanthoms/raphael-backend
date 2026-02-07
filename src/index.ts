import express from "express";
import acpsRouter from "./routes/acps";

const app = express();
const port = 8000;

app.use(express.json());

app.use("/api/acps", acpsRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
