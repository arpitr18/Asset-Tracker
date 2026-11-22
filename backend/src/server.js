import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { logger, requestLogger } from "./logger.js";
import { z, ZodError } from "zod";
import { db, databaseHealth } from "./db.js";
import { authenticate, issueToken } from "./auth.js";
import { stores } from "./modules/stores.js";
import { rd } from "./modules/rd.js";
import { surveys } from "./modules/surveys.js";
import { verifyPassword } from './password.js';
import { account } from './modules/account.js';
import { fieldSurveys } from './modules/fieldSurveys.js';
import { activity } from './modules/activity.js';
import { admin } from './modules/admin.js';
import { mobileSettings } from './modules/runtime.js';

export const app = express();
app.use(requestLogger);
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "6mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
app.get("/live", (_req, res) => {
  res.set("Cache-Control", "no-store").json({ ok: true, status: "ok", api: "running", live: true });
});

app.get("/health", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    await databaseHealth.check();
    res.json({ ok: true, status: "ok", api: "running", live: true, database: "connected" });
  } catch (error) {
    req.log.error({ event: "health.database_unavailable", code: error.code ?? error.errorCode }, "Database check failed");
    res.status(503).json({ ok: false, status: "degraded", api: "running", live: true, database: "disconnected" });
  }
});
app.post("/auth/demo", rateLimit({windowMs:60000,limit:25}), async (req, res, next) => {
  try {
    const p = z
      .object({ email: z.string().email().max(254), password: z.string().max(256) })
      .parse(req.body);
    const [user] = await db.$queryRaw`SELECT id,name,"jobTitle",role,"passwordHash","sessionVersion" FROM "Employee"
      WHERE email=${p.email.toLowerCase()} AND enabled`;
    if (!user || !(await verifyPassword(p.password,user.passwordHash)))
      return res.status(401).json({ error: "Invalid credentials" });
    const updated=await db.$executeRaw`UPDATE "Employee" SET "lastLogin"=now()
      WHERE id=${user.id}::uuid AND enabled AND "passwordHash"=${user.passwordHash} AND "sessionVersion"=${user.sessionVersion}`;
    if(!updated)return res.status(401).json({error:'Account changed. Sign in again.'});
    res.json({
      token: issueToken(user),
      employee: { id: user.id, name: user.name, jobTitle: user.jobTitle, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});
app.use(authenticate);
app.get("/me", (req, res) => res.json(req.employee));
app.get('/runtime-settings',async(_req,res,next)=>{try{res.set('Cache-Control','no-store').json(await mobileSettings());}catch(error){next(error);}});
app.use('/admin',admin);
app.use(fieldSurveys, account, activity, stores, rd, surveys);
app.use((err, req, res, _next) => {
  if (err instanceof ZodError)
    return res
      .status(400)
      .json({ error: "Invalid request", issues: err.issues });
  if(err.code==='P2002')return res.status(409).json({error:'A record with that identifier or email already exists.'});
  if(err.name==='MulterError')return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Workbook exceeds 3 MB.':'Upload one workbook at a time.'});
  if(err.status>=400&&err.status<500)return res.status(err.status).json({error:err.message});
  req.log.error({type:err.name,code:err.code},'Request failed');
  res.status(500).json({ error: "Internal server error" });
});
if (process.argv[1]?.endsWith("server.js")) {
  const port = Number(process.env.PORT || 4000);
  const host = "0.0.0.0";
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  const server = app.listen(port, host, () => {
    logger.info({ event: "api.listening", host, port, baseUrl, healthUrl: `${baseUrl}/health` }, "API running");
  });
  server.on("error", (error) => {
    logger.error({ event: "api.listen_failed", host, port, code: error.code }, "API failed to start");
    process.exitCode = 1;
  });
}
