import { router } from "./init";
import { clientsRouter } from "./routers/clients";
import { campaignsRouter } from "./routers/campaigns";
import { documentsRouter } from "./routers/documents";

export const appRouter = router({
  clients: clientsRouter,
  campaigns: campaignsRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
