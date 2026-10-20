import "server-only";
import type { MatchingFeedResult } from "../matching-feed-schemas";
import type { MatchingStatusResult } from "../matching-status-schemas";
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

let announced = false;
/** Server log only, once per process, so a deployment running on demo data can be spotted. */
function announceSimulation() {
  if (announced) return;
  announced = true;
  // The first line keeps the plain token so the log stays greppable; the rest is just easy to spot.
  console.info([
    "",
    "weft_matching_simulation_active",
    "",
    "  ╭────────────────────────────────────────────╮",
    "  │   ✦ ✧   D E M O   M O D E   ✧ ✦            │",
    "  │                                            │",
    "  │   (っ◔◡◔)っ ♥  matching is simulated        │",
    "  │   fictional guests, no real engine,        │",
    "  │   no real matches                          │",
    "  ╰────────────────────────────────────────────╯",
    "",
    "  how to run the demo",
    "  1. create an event, with or without the CSV",
    "  2. import /demo/weft-demo-attendees-300.csv in ONE import",
    "     (24 guests: /demo/weft-demo-attendees.csv)",
    "  3. Overview > Matching status: waiting ~6s, running ~14s,",
    "     then finished",
    "  4. Matches tab: pairs appear on their own",
    "  5. exclude a guest or block a pair: that match is revoked",
    "     after the next run (~20s)",
    "  tip: a new event reruns the demo from scratch",
    "",
  ].join("\n"));
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
