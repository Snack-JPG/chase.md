import { router } from "./init";
import { clientsRouter } from "./routers/clients";
import { campaignsRouter } from "./routers/campaigns";
import { documentsRouter } from "./routers/documents";
import { practiceRouter } from "./routers/practice";
import { dashboardRouter } from "./routers/dashboard";
import { billingRouter } from "./routers/billing";

export const appRouter = router({
  clients: clientsRouter,
  campaigns: campaignsRouter,
  documents: documentsRouter,
  practice: practiceRouter,
  dashboard: dashboardRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
