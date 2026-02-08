import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth"; // Keeping your auth link

// Enums for strict status control
export const missionStatusEnum = pgEnum("mission_status", [
  "active",
  "completed",
  "aborted",
]);
export const acpTypeEnum = pgEnum("acp_type", [
  "viper",
  "ghost_eye",
  "sentinel",
  "electronic_warfare",
]);

// Common timestamps for all tables
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// Squadrons table
export const squadrons = pgTable("squadrons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  ...timestamps,
});

// ACPs table
export const acps = pgTable("acps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  squadronId: integer("squadron_id")
    .notNull()
    .references(() => squadrons.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: acpTypeEnum("type").notNull(),
  serialNumber: varchar("serial_number", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  ...timestamps,
});

// Missions table
export const missions = pgTable(
  "missions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    acpId: integer("acp_id")
      .notNull()
      .references(() => acps.id, { onDelete: "cascade" }),
    commanderId: text("commander_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    authCode: text("auth_code").notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: missionStatusEnum("status").default("active").notNull(),
    missionWindows: jsonb("mission_windows")
      .$type<any[]>()
      .default([])
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("missions_acp_id_idx").on(table.acpId),
    index("missions_commander_id_idx").on(table.commanderId),
  ],
);

// Mission Assignments table
export const missionAssignments = pgTable(
  "mission_assignments",
  {
    operatorId: text("operator_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    missionId: integer("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.operatorId, table.missionId] }),
    unique("mission_assignments_unique").on(table.operatorId, table.missionId),
    index("assignments_operator_idx").on(table.operatorId),
    index("assignments_mission_idx").on(table.missionId),
  ],
);

// Define relations for easier querying
export const squadronRelations = relations(squadrons, ({ many }) => ({
  acps: many(acps),
}));

export const acpRelations = relations(acps, ({ one, many }) => ({
  squadron: one(squadrons, {
    fields: [acps.squadronId],
    references: [squadrons.id],
  }),
  missions: many(missions),
}));

export const missionRelations = relations(missions, ({ one, many }) => ({
  acp: one(acps, {
    fields: [missions.acpId],
    references: [acps.id],
  }),
  commander: one(user, {
    fields: [missions.commanderId],
    references: [user.id],
  }),
  assignments: many(missionAssignments),
}));

export const assignmentRelations = relations(missionAssignments, ({ one }) => ({
  operator: one(user, {
    fields: [missionAssignments.operatorId],
    references: [user.id],
  }),
  mission: one(missions, {
    fields: [missionAssignments.missionId],
    references: [missions.id],
  }),
}));

// type inference for TypeScript
export type Squadron = typeof squadrons.$inferSelect;
export type ACP = typeof acps.$inferSelect;
export type Mission = typeof missions.$inferSelect;
export type MissionAssignment = typeof missionAssignments.$inferSelect;
