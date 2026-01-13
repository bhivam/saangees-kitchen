"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/db/db");
const drizzle_orm_1 = require("drizzle-orm");
async function addConstraint() {
    // First make date and sort_order not null
    console.log("Setting date column to NOT NULL...");
    await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE menus_entries ALTER COLUMN date SET NOT NULL`);
    console.log("Setting sort_order column to NOT NULL...");
    await db_1.db.execute((0, drizzle_orm_1.sql) `ALTER TABLE menus_entries ALTER COLUMN sort_order SET NOT NULL`);
    // Then add the unique constraint
    console.log("Adding unique constraint on (date, menu_item_id)...");
    await db_1.db.execute((0, drizzle_orm_1.sql) `
    ALTER TABLE menus_entries
    ADD CONSTRAINT menu_entry_date_item
    UNIQUE (date, menu_item_id)
  `);
    console.log("Done!");
}
addConstraint()
    .then(() => process.exit(0))
    .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
});
