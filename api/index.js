// Vercel's Node.js runtime accepts a plain Express app as the default export.
// No serverless-http adapter needed — Vercel wraps it natively.
import { app } from "../server/index.js";
export default app;
