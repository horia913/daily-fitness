import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET missing");
  process.exit(1);
}

const res = await fetch("http://localhost:3000/api/cron/daily-sync", {
  headers: { Authorization: `Bearer ${secret}` },
});
const text = await res.text();
console.log(res.status, text);
