// Regenerates the 300-guest matching-simulation demo roster and its generated pairs.
// Deterministic (seeded). Run: node scripts/generate-demo-roster.mjs
// Writes public/demo/weft-demo-attendees-300.csv and src/modules/network/simulation/demo-matches-generated.ts.
// The first 24 rows are the hand-written guests from public/demo/weft-demo-attendees.csv; the pairs among them stay hand-written.
import { readFileSync, writeFileSync } from "node:fs";

const small = readFileSync("public/demo/weft-demo-attendees.csv", "utf8").trim().split("\n");
const header = small[0];
const rows = small.slice(1).map((line) => line.split(","));
const TOTAL = 300;
const GENERATED_PAIRS = 87; // 12 hand-written + 87 = 99, the simulator's cap

let seed = 20261020;
const random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (list) => list[Math.floor(random() * list.length)];
const shuffle = (list) => { const copy = [...list]; for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };

const firsts = "Aiden Beatriz Carlos Dalia Emeka Farah Gideon Helena Ismail Jasmine Kofi Leila Mateo Nora Omar Petra Quentin Rosa Samir Tessa Umar Valeria Wen Ximena Yusuf Zoe Anika Bruno Camila Dmitri Esra Felix Greta Hugo Imani Jonas Kira Leo Mina Nikolai Olive Pablo Rhea Sven Talia Uriel Vera Wyatt Yara Zane Ana Bilal Clara Dev Elena Finn Gia Hassan Ivy Jin".split(" ");
const lasts = "Abbott Banerjee Castillo Dumont Eriksen Fontaine Gallagher Hosseini Ibarra Jankowski Kovac Lindgren Mbeki Nakamura Okoye Petrov Quinn Rossi Salazar Takahashi Underhill Vasquez Winter Xu Yilmaz Zielinski Ahmadi Bergstrom Chaudhry Delacroix Eze Fitzgerald Gutierrez Hartmann Iyer Jovanovic Keller Lombardi Moreau Nasser Ostrowski Perrin Qureshi Reyes Santoro Thorne Uchida Varga Whitlock Yamada Zhou".split(" ");
const roles = {
  Founders: ["Founder", "Co-Founder & CEO", "Founder & CTO"], Investors: ["Partner", "Principal", "Investment Associate"], "Family Offices": ["Investment Director", "Head of Direct Investments"],
  Executives: ["Chief Operating Officer", "VP of Strategy", "Chief Financial Officer"], Brands: ["Brand Director", "Head of Partnerships", "Marketing Director"], Sponsors: ["Head of Sponsorships", "Partnerships Lead"],
  Creators: ["Creative Director", "Producer", "Founder"], Media: ["Editor", "Senior Correspondent", "Head of Content"], Athletes: ["Managing Director", "Team Principal", "Head of Partnerships"],
  Government: ["Policy Advisor", "Director of Trade", "Programme Lead"], "Service Providers": ["Managing Partner", "Principal Consultant", "Director"],
};
const stems = "Alder Beacon Cinder Drift Ember Fable Glade Harbor Indigo Juniper Kestrel Lantern Marlow Nimbus Orbit Prairie Quarry Ridge Sable Tundra Umber Vertex Willow Zephyr".split(" ");
const endings = { Founders: ["Labs", "Systems", "Works"], Investors: ["Capital", "Ventures", "Partners"], "Family Offices": ["Family Office", "Holdings"], Executives: ["Group", "Industries", "Global"], Brands: ["& Co", "Studio", "Collective"], Sponsors: ["Bank", "Payments", "Cloud"], Creators: ["Studios", "Media Lab", "Films"], Media: ["Media", "Press", "Network"], Athletes: ["Sports Group", "Athletics"], Government: ["Trade Office", "Agency"], "Service Providers": ["Advisors", "Consulting", "Legal"] };
const typeWeights = [["Founders", 6], ["Investors", 4], ["Family Offices", 1], ["Executives", 5], ["Brands", 3], ["Sponsors", 2], ["Creators", 3], ["Media", 2], ["Athletes", 1], ["Government", 1], ["Service Providers", 3]].flatMap(([type, weight]) => Array(weight).fill(type));
const kind = () => { const r = random(); return r < 0.07 ? "VIP" : r < 0.12 ? "Sponsor" : "Attendee"; };

const emails = new Set(rows.map((cells) => cells[2]));
const guests = rows.map((cells) => ({ first: cells[0], last: cells[1], email: cells[2], position: cells[5], company: cells[4], profile: cells[7], type: cells[8], line: cells.join(","), generated: false }));
const names = shuffle(firsts.flatMap((first) => lasts.map((last) => [first, last])));
while (guests.length < TOTAL) {
  const [first, last] = names.pop();
  const email = `${first}.${last}@demo.weft.example`.toLowerCase();
  if (emails.has(email)) continue;
  emails.add(email);
  const profile = pick(typeWeights);
  const type = profile === "Sponsors" ? "Sponsor" : kind();
  const company = `${pick(stems)} ${pick(endings[profile])}`;
  const position = pick(roles[profile]);
  const n = String(guests.length + 1).padStart(4, "0");
  const slug = `${first}-${last}`.toLowerCase();
  guests.push({ first, last, email, position, company, profile, type, generated: true,
    line: [first, last, email, `+1 202 556 ${n}`, company, position, `linkedin.com/in/demo-${slug}`, profile, type].join(",") });
}
writeFileSync("public/demo/weft-demo-attendees-300.csv", `${[header, ...guests.map((guest) => guest.line)].join("\n")}\n`);

const complement = {
  Founders: ["Investors", "Family Offices", "Executives"], Investors: ["Founders"], "Family Offices": ["Founders", "Executives"], Executives: ["Service Providers", "Founders", "Sponsors"],
  Brands: ["Creators", "Media", "Athletes"], Sponsors: ["Founders", "Brands", "Executives"], Creators: ["Brands", "Media"], Media: ["Creators", "Athletes", "Brands"],
  Athletes: ["Brands", "Service Providers", "Media"], Government: ["Service Providers", "Executives"], "Service Providers": ["Executives", "Government", "Athletes"],
};
// What `other` offers `me`, for every complementary pairing in both directions. Each entry gives:
// - benefit: for the organizer, why this introduction helps `me` (names both people and companies);
// - share: a sentence that could be told to `me`, written so it also reads on its own in the match list.
const who = (o) => `${o.first} (${o.position}, ${o.company})`;
const reasons = {
  "Founders>Investors": [(m, o) => `${who(o)} invests in young companies and can tell ${m.first} whether ${m.company} fits what ${o.company} backs.`, (m, o) => `${o.first} invests at ${o.company} and could be an early backer of ${m.company}.`],
  "Founders>Family Offices": [(m, o) => `${who(o)} invests family money for the long term, a patient kind of investor for ${m.company}.`, (m, o) => `${o.first} invests for ${o.company} with a long time horizon and could back ${m.company}.`],
  "Founders>Executives": [(m, o) => `${who(o)} helps run an established company that could become an early customer or pilot partner for ${m.company}.`, (m, o) => `${o.first}'s company ${o.company} could pilot or buy from ${m.company}.`],
  "Founders>Sponsors": [(m, o) => `${who(o)} runs partnerships for an event sponsor that supports young companies like ${m.company}.`, (m, o) => `${o.first}'s company ${o.company} partners with young companies like ${m.company}.`],
  "Investors>Founders": [(m, o) => `${who(o)} is building a young company, an early look for ${m.first} before it raises widely.`, (m, o) => `${o.first} is building ${o.company}, a company ${m.company} could back.`],
  "Family Offices>Founders": [(m, o) => `${who(o)} is building a young company that wants patient, long-term capital like ${m.company}'s.`, (m, o) => `${o.first} is building ${o.company} and wants long-term investors like ${m.company}.`],
  "Family Offices>Executives": [(m, o) => `${who(o)} helps run an established business that ${m.company} could take a long-term stake in.`, (m, o) => `${o.first} helps run ${o.company}, a mature business ${m.company} could invest in.`],
  "Executives>Founders": [(m, o) => `${who(o)} is building a product that could help ${m.company} work faster or cheaper.`, (m, o) => `${o.first}'s company ${o.company} builds something ${m.company} could use.`],
  "Executives>Service Providers": [(m, o) => `${who(o)} advises companies on projects that ${m.company} may not have the skills for in-house.`, (m, o) => `${o.first}'s firm ${o.company} advises companies like ${m.company}.`],
  "Executives>Sponsors": [(m, o) => `${who(o)} looks for business partners for an event sponsor; ${m.company} could be one.`, (m, o) => `${o.first}'s company ${o.company} looks for business partners like ${m.company}.`],
  "Executives>Family Offices": [(m, o) => `${who(o)} takes long-term stakes in established companies like ${m.company}.`, (m, o) => `${o.first} invests for ${o.company}, which backs established companies like ${m.company}.`],
  "Executives>Government": [(m, o) => `${who(o)} works on rules and trade programmes that affect ${m.company}.`, (m, o) => `${o.first} works on policy at ${o.company}, which affects businesses like ${m.company}.`],
  "Brands>Creators": [(m, o) => `${who(o)} makes creative work that could become campaign content for ${m.company}.`, (m, o) => `${o.first}'s studio ${o.company} makes content for brands like ${m.company}.`],
  "Brands>Media": [(m, o) => `${who(o)} works at a media outlet that could cover ${m.company}'s next launch.`, (m, o) => `${o.first} works at ${o.company}, which covers brands like ${m.company}.`],
  "Brands>Athletes": [(m, o) => `${who(o)} runs a sports business looking for brand partners; a sponsorship could put ${m.company} in front of fans.`, (m, o) => `${o.first}'s sports group ${o.company} looks for brand partners like ${m.company}.`],
  "Brands>Sponsors": [(m, o) => `${who(o)} runs partnerships for an event sponsor that could co-fund a campaign with ${m.company}.`, (m, o) => `${o.first}'s company ${o.company} runs joint campaigns with brands like ${m.company}.`],
  "Sponsors>Founders": [(m, o) => `${who(o)} is building a young company that ${m.company} could support and get early access to.`, (m, o) => `${o.first} is building ${o.company}, a young company ${m.company} could partner with.`],
  "Sponsors>Brands": [(m, o) => `${who(o)} runs a brand that ${m.company} could run a joint campaign with.`, (m, o) => `${o.first}'s brand ${o.company} is a possible campaign partner for ${m.company}.`],
  "Sponsors>Executives": [(m, o) => `${who(o)} helps run a company that could become a customer or partner of ${m.company}.`, (m, o) => `${o.first} helps run ${o.company}, a possible customer or partner of ${m.company}.`],
  "Creators>Brands": [(m, o) => `${who(o)} commissions creative work, so ${o.company} is a possible client for ${m.company}.`, (m, o) => `${o.first}'s brand ${o.company} hires studios like ${m.company}.`],
  "Creators>Media": [(m, o) => `${who(o)} works at a media outlet that could feature or distribute ${m.company}'s work.`, (m, o) => `${o.first}'s outlet ${o.company} features work by studios like ${m.company}.`],
  "Media>Creators": [(m, o) => `${who(o)} makes creative work that could be a story for ${m.company}.`, (m, o) => `${o.first}'s studio ${o.company} makes work ${m.company} could cover.`],
  "Media>Athletes": [(m, o) => `${who(o)} runs a sports business with stories and access ${m.company} could use.`, (m, o) => `${o.first}'s sports group ${o.company} has stories ${m.company} could cover.`],
  "Media>Brands": [(m, o) => `${who(o)} runs a brand with launches ${m.company} could cover.`, (m, o) => `${o.first}'s brand ${o.company} has news ${m.company} could cover.`],
  "Athletes>Brands": [(m, o) => `${who(o)} runs a brand that could sponsor ${m.company}.`, (m, o) => `${o.first}'s brand ${o.company} could sponsor ${m.company}.`],
  "Athletes>Service Providers": [(m, o) => `${who(o)} advises businesses and could help ${m.company} with contracts and growth.`, (m, o) => `${o.first}'s firm ${o.company} advises sports businesses like ${m.company}.`],
  "Athletes>Media": [(m, o) => `${who(o)} works at a media outlet that could cover ${m.company}.`, (m, o) => `${o.first}'s outlet ${o.company} could cover ${m.company}.`],
  "Government>Service Providers": [(m, o) => `${who(o)} sees day to day how rules affect companies, useful input for ${m.company}'s policy work.`, (m, o) => `${o.first}'s firm ${o.company} advises companies affected by the policy ${m.company} works on.`],
  "Government>Executives": [(m, o) => `${who(o)} can give ${m.company} a first-hand industry view on policy.`, (m, o) => `${o.first} helps run ${o.company} and can share an industry view with ${m.company}.`],
  "Service Providers>Executives": [(m, o) => `${who(o)} helps run a company that could hire ${m.company}.`, (m, o) => `${o.first} helps run ${o.company}, which may need ${m.company}'s services.`],
  "Service Providers>Government": [(m, o) => `${who(o)} shapes rules that ${m.company}'s clients must follow.`, (m, o) => `${o.first} works on policy at ${o.company}, which affects ${m.company}'s clients.`],
  "Service Providers>Athletes": [(m, o) => `${who(o)} runs a sports business that could become a client of ${m.company}.`, (m, o) => `${o.first}'s sports group ${o.company} could become a client of ${m.company}.`],
};
for (const [profile, partners] of Object.entries(complement)) for (const partner of partners) {
  for (const key of [`${profile}>${partner}`, `${partner}>${profile}`]) if (!reasons[key]) throw new Error(`No reason text for ${key}`);
}
// A smaller pool of guests gets several matches each (cap 2 to 5), so the demo shows busy and quiet guests.
const generated = shuffle(guests.filter((guest) => guest.generated));
const MAX_PER_GUEST = 5;
const pairs = [];
for (let poolSize = 60; pairs.length < GENERATED_PAIRS && poolSize <= generated.length; poolSize += 10) {
  pairs.length = 0;
  const pool = generated.slice(0, poolSize);
  const cap = new Map(pool.map((guest) => [guest.email, 2 + Math.floor(random() * (MAX_PER_GUEST - 1))]));
  const degree = new Map(pool.map((guest) => [guest.email, 0]));
  const candidates = shuffle(pool.flatMap((a, i) => pool.slice(i + 1).map((b) => [a, b])))
    .filter(([a, b]) => complement[a.profile].includes(b.profile) || complement[b.profile].includes(a.profile));
  for (const [a, b] of candidates) {
    if (pairs.length >= GENERATED_PAIRS) break;
    if (degree.get(a.email) >= cap.get(a.email) || degree.get(b.email) >= cap.get(b.email)) continue;
    degree.set(a.email, degree.get(a.email) + 1);
    degree.set(b.email, degree.get(b.email) + 1);
  const base = 60 + Math.floor(random() * 33);
  const side = (me, other) => ({
    score: Math.min(100, base + Math.floor(random() * 7) - 3),
    benefit: reasons[`${me.profile}>${other.profile}`][0](me, other),
    shareableReason: reasons[`${me.profile}>${other.profile}`][1](me, other),
    missingInformation: [`${me.first}'s own goals for the event (no profile saved yet)`],
  });
  pairs.push({ a: a.email, b: b.email, pairScore: base, uncertainty: "Based only on job titles and companies from the attendee list. Neither guest has a saved profile yet.",
    evidence: [{ who: "a", field: "position", quote: `${a.position}, ${a.company}` }, { who: "b", field: "position", quote: `${b.position}, ${b.company}` }],
    forA: side(a, b), forB: side(b, a) });
  }
}
if (pairs.length !== GENERATED_PAIRS) throw new Error(`Only ${pairs.length} pairs generated`);
writeFileSync("src/modules/network/simulation/demo-matches-generated.ts", `// Generated by scripts/generate-demo-roster.mjs for public/demo/weft-demo-attendees-300.csv. Do not edit by hand.\nimport type { DemoMatch } from "./demo-matches";\n\nexport const GENERATED_DEMO_MATCHES: readonly DemoMatch[] = ${JSON.stringify(pairs, null, 2)};\n`);
const perGuest = new Map(); for (const pair of pairs) for (const email of [pair.a, pair.b]) perGuest.set(email, (perGuest.get(email) ?? 0) + 1);
console.log(`${perGuest.size} guests in generated pairs, max ${Math.max(...perGuest.values())} each;`);
console.log(`${guests.length} guests, ${pairs.length} generated pairs, ${guests.filter((g) => g.type === "VIP").length} VIP, ${guests.filter((g) => g.type === "Sponsor").length} Sponsor`);
