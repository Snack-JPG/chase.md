import { router } from "./init";
import { clientsRouter } from "./routers/clients";
import { campaignsRouter } from "./routers/campaigns";
import { documentsRouter } from "./routers/documents";
import { practiceRouter } from "./routers/practice";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  clients: clientsRouter,
  campaigns: campaignsRouter,
  documents: documentsRouter,
  practice: practiceRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
