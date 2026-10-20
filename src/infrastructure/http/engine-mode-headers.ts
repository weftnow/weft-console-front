import "server-only";
import { matchingEngineMode } from "@/modules/network/server/engine-mode";

/** Not shown in the UI: lets anyone inspecting the network tab or running `curl -i` see that matching is simulated. */
export function engineModeHeaders(): Record<string, string> {
  return matchingEngineMode() === "simulation" ? { "X-Weft-Engine-Mode": "simulation" } : {};
}
