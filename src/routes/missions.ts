import express from "express";
import { db } from "../db/db";
import { missions, user } from "../db/schema/index.js";

import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const [createdMission] = await db
      .insert(missions)
      .values({
        ...req.body,
        schedules: [],
        authCode: `TAC-${Math.random().toString(36).substring(7).toUpperCase()}`,
      })
      .returning({ id: missions.id });

    if (!createdMission) throw Error;

    res.status(201).json({ data: createdMission });
  } catch (e) {
    console.error(`POST /missions error ${e}`);
    res.status(500).json({ error: e });
  }
});

//get all missions with optional search, filtering, pagination
router.get("/", async (req, res) => {
  try {
    //inputs passed in query params, 1 is default page and 10 is default limit
    const { search, commander, page = 1, limit = 10 } = req.query;
    //validate and sanitize page and limit inputs
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );

    //calculate offset for pagination
    const offset = (currentPage - 1) * limitPerPage;
    const filterConditions = [];

    //search by name or code of mission
    if (search) {
      filterConditions.push(
        //ilike is used for case-insensitive search, % is used for wildcard search
        ilike(missions.name, `%${search}%`),
      );
    }

    if (commander) {
      //escape % characters in squadron name to prevent SQL injection and ensure correct search results
      const squadronPattern = `%${String(commander).replace(/%/g, "\\$&")}%`;
      filterConditions.push(ilike(user.name, squadronPattern));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(missions)
      .leftJoin(user, eq(missions.commanderId, user.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;
    //get table columns dynamically and adds squadron columns
    const missionsList = await db
      .select({
        ...getTableColumns(missions),
        commander: { name: user.name },
      })
      .from(missions)
      .leftJoin(user, eq(missions.commanderId, user.id))
      .where(whereClause)
      .orderBy(desc(missions.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: missionsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
