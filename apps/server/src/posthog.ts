import { PostHog } from "posthog-node";
import { config } from "./config.js";

if (!config.posthog.projectToken) {
  throw new Error("POSTHOG_PROJECT_TOKEN is required");
}

if (!config.posthog.host) {
  throw new Error("POSTHOG_HOST is required");
}

export const posthogClient = new PostHog(config.posthog.projectToken, {
  host: config.posthog.host,
});
