import "server-only";
import type { MatchingFeedResult } from "../matching-feed-schemas";
import type { MatchingStatusResult } from "../matching-status-schemas";
import { announceSimulation } from "./simulation-banner";
import { readEngineMatchingStatus, type Environment } from "./matching-engine-client";
import { readEngineMatchingFeed } from "./matching-feed-client";
import { readSimulatedMatchingFeed, readSimulatedMatchingStatus } from "./simulated-engine";

export type MatchingEngineMode = "engine" | "simulation";
export type StatusReader = (input: { organizationId: string; eventId: string }) => Promise<MatchingStatusResult>;
export type FeedReader = (input: { organizationId: string; eventId: string; after: number; limit?: number }) => Promise<MatchingFeedResult>;

/** Simulation is a demo aid: the flag is ignored on Vercel production no matter how it is set. */
export function matchingEngineMode(env: Environment = process.env): MatchingEngineMode {
  return env.WEFT_ENGINE_MODE === "simulation" && env.VERCEL_ENV !== "production" ? "simulation" : "engine";
}

export function selectStatusReader(env: Environment = process.env): StatusReader {
  if (matchingEngineMode(env) !== "simulation") return readEngineMatchingStatus;
  announceSimulation();
  return readSimulatedMatchingStatus;
}

export function selectFeedReader(env: Environment = process.env): FeedReader {
  if (matchingEngineMode(env) !== "simulation") return readEngineMatchingFeed;
  announceSimulation();
  return readSimulatedMatchingFeed;
}
