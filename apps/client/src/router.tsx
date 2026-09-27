import {
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from "@tanstack/react-router";
import App from "@/App";
import {
  ConversationsPage,
  ConversationDetailPage,
} from "@/pages/conversations-page";
import { OverviewPage } from "@/pages/overview-page";

const rootRoute = createRootRoute({
  component: App,
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: OverviewPage,
});

const conversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conversations",
  component: ConversationsPage,
});

const ConversationDetailRoute = () => {
  const params = useParams({ strict: false });

  const conversationId = Number(params.conversationId);

  return <ConversationDetailPage conversationId={conversationId} />;
};

const conversationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conversations/$conversationId",
  component: ConversationDetailRoute,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  conversationsRoute,
  conversationDetailRoute,
]);

export const router = createRouter({ routeTree });

// for type checking and autofilling of routes
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
