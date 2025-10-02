import * as schema from "./schema";
import { Pool } from "pg";
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
//# sourceMappingURL=db.d.ts.map