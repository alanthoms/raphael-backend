import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { acps, squadrons } from "../db/schema";
import { db } from "../db/db";
import { get } from "node:http";

const router = express.Router();

//get all subjects with optional search, filtering, pagination
router.get("/", async (req, res) => {
  try {
    //inputs passed in query params, 1 is default page and 10 is default limit
    const { search, squadron, page = 1, limit = 10 } = req.query;
    //validate and sanitize page and limit inputs
    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 10),
      100,
    );
    //calculate offset for pagination
    const offset = (currentPage - 1) * limitPerPage;
    const filterConditions = [];
    //search by name or code of acp and name of squadron
    if (search) {
      filterConditions.push(
        //ilike is used for case-insensitive search, % is used for wildcard search
        or(
          ilike(acps.name, `%${search}%`),
          ilike(acps.serialNumber, `%${search}%`),
          ilike(acps.type, `%${search}%`),
        ),
      );
    }

    if (squadron) {
      //escape % characters in squadron name to prevent SQL injection and ensure correct search results
      const squadronPattern = `%${String(squadron).replace(/%/g, "\\$&")}%`;
      filterConditions.push(ilike(squadrons.name, squadronPattern));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(acps)
      .leftJoin(squadrons, eq(acps.squadronId, squadrons.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;
    //get table columns dynamically and adds squadron columns
    const acpsList = await db
      .select({
        ...getTableColumns(acps),
        squadron: { ...getTableColumns(squadrons) },
      })
      .from(acps)
      .leftJoin(squadrons, eq(acps.squadronId, squadrons.id))
      .where(whereClause)
      .orderBy(desc(acps.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: acpsList,
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
