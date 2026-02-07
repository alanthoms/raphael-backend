import { desc, relations } from "drizzle-orm";
import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const squadrons = pgTable("squadrons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 500 }),
  ...timestamps,
});

export const acps = pgTable("acps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  squadronId: integer("squadron_id")
    .notNull()
    .references(() => squadrons.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  ...timestamps,
});

export const squadronRelations = relations(squadrons, ({ many }) => ({
  acps: many(acps),
}));

export const acpRelations = relations(acps, ({ one, many }) => ({
  squadron: one(squadrons, {
    fields: [acps.squadronId],
    references: [squadrons.id],
  }),
}));

//type inference from database schema, useful for type safety in the rest of the application
export type Squadron = typeof squadrons.$inferSelect;
export type NewSquadron = typeof squadrons.$inferInsert;

export type Acp = typeof acps.$inferSelect;
export type NewAcp = typeof acps.$inferInsert;
