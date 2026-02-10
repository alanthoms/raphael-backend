import express from "express";
import { db } from "../db/db";
import {
  acps,
  missions,
  squadrons,
  user,
  missionAssignments,
} from "../db/schema/index.js";

import {
  aliasedTable,
  and,
  desc,
  eq,
  getTableColumns,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import { get } from "node:http";

const router = express.Router();
const operators = aliasedTable(user, "operators");
router.post("/", async (req, res) => {
  const { operatorId, ...missionData } = req.body;

  try {
    // 1. Insert the mission first
    const [createdMission] = await db
      .insert(missions)
      .values({
        ...missionData,
        authCode: `TAC-${Math.random().toString(36).substring(7).toUpperCase()}`,
      })
      .returning({ id: missions.id });

    if (!createdMission) {
      return res
        .status(500)
        .json({ error: "Failed to create mission record." });
    }

    // 2. Insert the assignment if an operator was picked
    if (operatorId) {
      await db.insert(missionAssignments).values({
        missionId: createdMission.id,
        operatorId: operatorId,
      });
    }

    res.status(201).json({ data: createdMission });
  } catch (e) {
    console.error(`POST /missions error: ${e}`);
    res.status(500).json({ error: "Internal server error during creation." });
  }
});

//get all missions with optional search, filtering, pagination
router.get("/", async (req, res) => {
  try {
    //inputs passed in query params, 1 is default page and 10 is default limit
    const {
      search,
      commander,
      operatorId,
      page = 1,
      limit = 10,
      filters,
    } = req.query;
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

    const parsedFilters =
      typeof filters === "string" ? JSON.parse(filters) : filters;

    // Extract operatorId from Refine's filter format
    const operatorIdFromRefine = Array.isArray(parsedFilters)
      ? parsedFilters.find((f) => f.field === "operatorId")?.value
      : null;

    // Use either direct query param OR the one from filters
    const finalOperatorId = operatorId || operatorIdFromRefine;

    if (finalOperatorId) {
      filterConditions.push(
        eq(missionAssignments.operatorId, String(finalOperatorId)),
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
      .leftJoin(
        missionAssignments,
        eq(missions.id, missionAssignments.missionId),
      )
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;
    //get table columns dynamically and adds squadron columns
    const missionsList = await db
      .select({
        ...getTableColumns(missions),
        commander: { name: user.name },
        operator: { name: operators.name, id: operators.id },
      })
      .from(missions)
      .leftJoin(user, eq(missions.commanderId, user.id))
      .leftJoin(
        missionAssignments,
        eq(missions.id, missionAssignments.missionId),
      )
      .leftJoin(operators, eq(missionAssignments.operatorId, operators.id))
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

//gets mission details
router.get("/:id", async (req, res) => {
  //has to turn into number as req params is string from the url
  const missionId = Number(req.params.id);

  if (!Number.isFinite(missionId))
    return res.status(400).json({ error: "no class found." });

  const [missionDetails] = await db
    .select({
      ...getTableColumns(missions),
      acp: {
        ...getTableColumns(acps),
      },
      squadron: {
        ...getTableColumns(squadrons),
      },
      commander: {
        ...getTableColumns(user),
      },
      operator: { name: operators.name },
    })
    .from(missions)
    .leftJoin(acps, eq(missions.acpId, acps.id))
    .leftJoin(user, eq(missions.commanderId, user.id))
    .leftJoin(squadrons, eq(acps.squadronId, squadrons.id))
    .leftJoin(missionAssignments, eq(missions.id, missionAssignments.missionId))
    .leftJoin(operators, eq(missionAssignments.operatorId, operators.id))
    .where(eq(missions.id, missionId));

  if (!missionDetails)
    return res.status(404).json({ error: "No mission found" });

  res.status(200).json({ data: missionDetails });
});

export default router;
