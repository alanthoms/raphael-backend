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

router.post("/", async (req, res) => {
  try {
    const { name, type, serialNumber, squadronId, description } = req.body;

    // Validation
    if (!name || !type || !serialNumber || !squadronId) {
      return res.status(400).json({
        error: "Missing required fields: name, type, serialNumber, squadronId",
      });
    }

    // Validate ACP type
    const validTypes = ["viper", "ghost_eye", "sentinel", "electronic_warfare"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid ACP type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Validate serial number format (uppercase letters, numbers, hyphens only)
    const serialNumberRegex = /^[A-Z0-9-]+$/;
    if (!serialNumberRegex.test(serialNumber)) {
      return res.status(400).json({
        error:
          "Serial number must contain only uppercase letters, numbers, and hyphens",
      });
    }

    // Check if serial number already exists
    const existingAcp = await db
      .select()
      .from(acps)
      .where(eq(acps.serialNumber, serialNumber))
      .limit(1);

    if (existingAcp.length > 0) {
      return res.status(409).json({
        error: "Serial number already exists",
      });
    }

    // Verify squadron exists
    const squadron = await db
      .select()
      .from(squadrons)
      .where(eq(squadrons.id, Number(squadronId)))
      .limit(1);

    if (squadron.length === 0) {
      return res.status(404).json({
        error: "Squadron not found",
      });
    }

    // Create the ACP
    const newAcp = await db
      .insert(acps)
      .values({
        name,
        type,
        serialNumber,
        squadronId: Number(squadronId),
        description: description || null,
      })
      .returning();

    // Fetch the complete ACP with squadron details
    const createdAcp = await db
      .select({
        ...getTableColumns(acps),
        squadron: { ...getTableColumns(squadrons) },
      })
      .from(acps)
      .leftJoin(squadrons, eq(acps.squadronId, squadrons.id))
      .where(eq(acps.id, newAcp[0].id))
      .limit(1);

    res.status(201).json({
      data: createdAcp[0],
    });
  } catch (err) {
    console.error("Error creating ACP:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
