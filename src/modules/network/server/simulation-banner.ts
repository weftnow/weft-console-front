let announced = false;

/** Server log only, once per process, so a deployment running on demo data can be spotted. */
export function announceSimulation(): void {
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
