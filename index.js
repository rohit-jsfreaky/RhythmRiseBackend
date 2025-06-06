import express from "express";
import cors from "cors";
import { musicRouter } from "./routes/music.js";

const app = express();
app.use(cors());

app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Welcome to the Music API");
});

app.use("/api/music",musicRouter)