// A/B test hook: "1 tip" (control) vs "3 tips" (test).
// The live split is switched on later with a PostHog feature flag called "tip-count".
// Until PostHog is loaded on the page, everyone gets 1 tip and events go nowhere.

type PostHogLike = {
  getFeatureFlag?: (key: string) => string | boolean | undefined;
  capture?: (event: string, props?: Record<string, unknown>) => void;
};

function posthog(): PostHogLike | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { posthog?: PostHogLike }).posthog;
}

export function tipCount(): 1 | 3 {
  return posthog()?.getFeatureFlag?.("tip-count") === "three" ? 3 : 1;
}

// Events for the activation metric and the A/B test.
export function track(event: "analysis_started" | "first_score_shown" | "tried_again", props?: Record<string, unknown>) {
  posthog()?.capture?.(event, { ...props, tip_count: tipCount() });
}
