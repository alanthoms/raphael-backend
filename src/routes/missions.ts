import express from "express";
import { db } from "../db/db";
import { missions } from "../db/schema/index.js";
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const [createdMission] = await db
      .insert(missions)
      .values({ ...req.body, schedules: [] })
      .returning({ id: missions.id });

    if (!createdMission) throw Error;

    res.status(201).json({ data: createdMission });
  } catch (e) {
    console.error(`POST /missions error ${e}`);
    res.status(500).json({ error: e });
  }
});

export default router;
