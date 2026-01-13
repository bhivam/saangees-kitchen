"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./src/db/db");
const drizzle_orm_1 = require("drizzle-orm");
async function checkDuplicates() {
    const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT date, menu_item_id, COUNT(*) as count
    FROM menus_entries
    GROUP BY date, menu_item_id
    HAVING COUNT(*) > 1
  `);
    console.log("Duplicates:", result.rows.length > 0 ? JSON.stringify(result.rows, null, 2) : "None found");
    // Also clean up duplicates by keeping only the first one
    if (result.rows.length > 0) {
        console.log("Cleaning up duplicates...");
        await db_1.db.execute((0, drizzle_orm_1.sql) `
      DELETE FROM menus_entries a
      USING menus_entries b
      WHERE a.id > b.id
        AND a.date = b.date
        AND a.menu_item_id = b.menu_item_id
    `);
        console.log("Duplicates cleaned up!");
    }
}
checkDuplicates()
    .then(() => process.exit(0))
    .catch((e) => {
    console.error(e);
    process.exit(1);
});
