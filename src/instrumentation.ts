/** Runs once when the server starts, so the simulation banner appears at boot instead of on the first matching request. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ matchingEngineMode }, { announceSimulation }] = await Promise.all([
    import("@/modules/network/server/engine-mode"),
    import("@/modules/network/server/simulation-banner"),
  ]);
  if (matchingEngineMode() === "simulation") announceSimulation();
}
