import Surge from "@surgeapi/node";
import { env } from "../env";

export const surgeClient = new Surge({
  apiKey: env.SURGE_API_KEY,
});

