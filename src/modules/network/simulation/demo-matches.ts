import { GENERATED_DEMO_MATCHES } from "./demo-matches-generated";

/**
 * Demo-only pairs for the matching simulation. Every email is a fictional guest in `public/demo/weft-demo-attendees-300.csv`;
 * the first 24 rows of that file are `public/demo/weft-demo-attendees.csv`. The 12 pairs below are written by hand and the rest
 * are templated by `scripts/generate-demo-roster.mjs`. Evidence quotes only repeat CSV fields.
 * Order matters: a pair's `seq` in the simulated feed is its index + 1, so append new pairs and keep at most 99.
 */
export const MAX_DEMO_MATCHES = 99;

type Side = { benefit: string; shareableReason: string | null; missingInformation: string[]; score: number };
export type DemoMatch = {
  a: string;
  b: string;
  pairScore: number;
  uncertainty: string;
  /** `who` names the pair member the quote is about. */
  evidence: { who: "a" | "b"; field: string; quote: string }[];
  forA: Side;
  forB: Side;
};

const e = (name: string) => `${name}@demo.weft.example`;

const HAND_WRITTEN_MATCHES: readonly DemoMatch[] = [
  {
    a: e("nadia.rahman"), b: e("marcus.teo"), pairScore: 91,
    uncertainty: "Marcus’s stage and round size aren’t in the attendee list, so fit with Helio’s cheque size is unconfirmed.",
    evidence: [
      { who: "a", field: "position", quote: "General Partner, Helio Ventures" },
      { who: "b", field: "position", quote: "Founder & CEO, Lumen Robotics" },
    ],
    forA: { score: 90, benefit: "Marcus is building a robotics company and is the kind of early-stage founder a venture partner wants to see before a round is announced.", shareableReason: "Marcus is building Lumen Robotics, an early-stage hardware company Helio Ventures could back.", missingInformation: ["Preferred investment stage"] },
    forB: { score: 92, benefit: "Nadia leads investments at Helio Ventures and can speak to what a venture fund expects from a robotics founder.", shareableReason: "Nadia invests at Helio Ventures and could be an early backer of Lumen Robotics.", missingInformation: ["Current funding round"] },
  },
  {
    a: e("hana.sato"), b: e("sofia.marchetti"), pairScore: 86,
    uncertainty: "Hana’s family office may not invest in health at this stage; only her title is known.",
    evidence: [
      { who: "a", field: "position", quote: "Chief Investment Officer, Tidewater Family Office" },
      { who: "b", field: "company", quote: "Orchard Health" },
    ],
    forA: { score: 84, benefit: "Sofia founded a health company and offers a direct look at a sector family offices increasingly back for the long term.", shareableReason: "Sofia is building Orchard Health and wants patient, long-term investors like Tidewater.", missingInformation: ["Sectors Tidewater invests in"] },
    forB: { score: 88, benefit: "Hana allocates capital for a family office, a patient kind of investor that suits a founder who is not chasing a fast exit.", shareableReason: "Hana invests for Tidewater Family Office with a long time horizon and could back Orchard Health.", missingInformation: ["Funding needs"] },
  },
  {
    a: e("kwame.mensah"), b: e("ingrid.solberg"), pairScore: 83,
    uncertainty: "Ingrid’s market focus is not stated, so the link to a pan-African fund is assumed from the fund’s name.",
    evidence: [
      { who: "a", field: "company", quote: "Pan-Africa Growth Fund" },
      { who: "b", field: "company", quote: "Nordlys Energy" },
    ],
    forA: { score: 81, benefit: "Ingrid founded an energy company, and energy infrastructure is a priority theme for growth funds with an emerging-market mandate.", shareableReason: "Ingrid's company Nordlys Energy works in energy, a priority sector for Pan-Africa Growth Fund.", missingInformation: ["Ingrid’s target markets"] },
    forB: { score: 85, benefit: "Kwame directs investments at a growth fund and can explain how such funds assess energy companies expanding into new regions.", shareableReason: "Kwame invests at Pan-Africa Growth Fund and could back Nordlys Energy as it expands.", missingInformation: ["Expansion plans"] },
  },
  {
    a: e("daniel.okafor"), b: e("meilin.chan"), pairScore: 80,
    uncertainty: "It is unclear whether Quill Analytics sells to banks or only to other software teams.",
    evidence: [
      { who: "a", field: "position", quote: "Head of Partnerships, Meridian Bank" },
      { who: "b", field: "position", quote: "Chief Technology Officer, Quill Analytics" },
    ],
    forA: { score: 79, benefit: "Mei Lin leads technology at an analytics company, which makes her a natural partner for a bank looking for data tooling.", shareableReason: "Mei Lin's company Quill Analytics builds data tools Meridian Bank could use.", missingInformation: ["Quill’s customers in financial services"] },
    forB: { score: 81, benefit: "Daniel owns partnerships at a bank, so he can describe how a financial institution evaluates and onboards a technology supplier.", shareableReason: "Daniel runs partnerships at Meridian Bank, a possible customer for Quill Analytics.", missingInformation: ["Compliance requirements for suppliers"] },
  },
  {
    a: e("henrik.larsen"), b: e("elias.brandt"), pairScore: 88,
    uncertainty: "The two companies may be direct competitors in some lanes; neither has said.",
    evidence: [
      { who: "a", field: "position", quote: "Chief Executive Officer, Fjordworks Logistics" },
      { who: "b", field: "position", quote: "Chief Operating Officer, Cobalt Freight" },
    ],
    forA: { score: 87, benefit: "Elias runs operations at a freight company and can compare notes on routes, capacity and partnerships with someone who sees the same market from the operating side.", shareableReason: "Elias runs operations at Cobalt Freight, a possible partner for Fjordworks Logistics on routes and capacity.", missingInformation: ["Regions each company serves"] },
    forB: { score: 89, benefit: "Henrik is the chief executive of a logistics company and can open a conversation about shared capacity or joint routes.", shareableReason: "Henrik leads Fjordworks Logistics, a possible partner for Cobalt Freight on routes and capacity.", missingInformation: ["Current partnership appetite"] },
  },
  {
    a: e("zara.patel"), b: e("yuki.tanaka"), pairScore: 77,
    uncertainty: "Whether Kite Mobility takes payments directly is not known.",
    evidence: [
      { who: "a", field: "position", quote: "Chief Commercial Officer, Ardent Payments" },
      { who: "b", field: "position", quote: "Head of Product, Kite Mobility" },
    ],
    forA: { score: 76, benefit: "Yuki owns product for a mobility company, where in-app payments are a core feature a payments business wants to serve.", shareableReason: "Yuki leads product at Kite Mobility, which needs in-app payments that Ardent Payments provides.", missingInformation: ["Kite’s payment provider today"] },
    forB: { score: 78, benefit: "Zara leads commercial work at a payments company and can speak to integration options for a mobility product.", shareableReason: "Zara runs commercial work at Ardent Payments, a possible payments partner for Kite Mobility.", missingInformation: ["Payment features on the roadmap"] },
  },
  {
    a: e("priya.venkataraman"), b: e("noah.whitaker"), pairScore: 74,
    uncertainty: "Noah’s company stage is not stated, and Priya’s fund focus is inferred from her title.",
    evidence: [
      { who: "a", field: "position", quote: "Principal, Fieldstone Capital" },
      { who: "b", field: "position", quote: "Founder, Brightpath Learning" },
    ],
    forA: { score: 73, benefit: "Noah founded a learning company, an early-stage business a principal at a capital firm can evaluate first-hand.", shareableReason: "Noah is building Brightpath Learning, a company Fieldstone Capital could back.", missingInformation: ["Fieldstone’s sector focus"] },
    forB: { score: 75, benefit: "Priya works at an investment firm and can say what investors look for in an education-technology company.", shareableReason: "Priya invests at Fieldstone Capital and could be an early backer of Brightpath Learning.", missingInformation: ["Brightpath’s funding plans"] },
  },
  {
    a: e("lucas.ferreira"), b: e("chloe.beaumont"), pairScore: 85,
    uncertainty: "Maison Aube’s current agency relationships are unknown.",
    evidence: [
      { who: "a", field: "position", quote: "Creative Director, Pixelwharf Studios" },
      { who: "b", field: "position", quote: "Brand Director, Maison Aube" },
    ],
    forA: { score: 84, benefit: "Chloe directs a brand and commissions creative work, which makes her a direct route to a project for a studio.", shareableReason: "Chloe's brand Maison Aube hires creative studios like Pixelwharf Studios.", missingInformation: ["Upcoming campaigns"] },
    forB: { score: 86, benefit: "Lucas directs a creative studio and can show a brand director what a visual partner could deliver for a launch.", shareableReason: "Lucas's studio Pixelwharf Studios could make campaign content for Maison Aube.", missingInformation: ["Budget range"] },
  },
  {
    a: e("amara.nwosu"), b: e("viktor.novak"), pairScore: 72,
    uncertainty: "Viktor has not said whether he wants press coverage.",
    evidence: [
      { who: "a", field: "position", quote: "Editor-in-Chief, Northgate Media" },
      { who: "b", field: "position", quote: "Founder, Halcyon Audio" },
    ],
    forA: { score: 71, benefit: "Viktor founded an audio company, so he may have a product story and a founder’s point of view worth covering.", shareableReason: "Viktor is building Halcyon Audio, a product story Northgate Media could cover.", missingInformation: ["Whether Viktor wants coverage"] },
    forB: { score: 73, benefit: "Amara edits a media outlet and can explain how a young audio company gets noticed by the press.", shareableReason: "Amara edits Northgate Media, which could cover Halcyon Audio's launch.", missingInformation: ["Launch timing"] },
  },
  {
    a: e("tariq.haddad"), b: e("isabel.duarte"), pairScore: 70,
    uncertainty: "Isabel’s jurisdiction is not stated, so regulatory overlap with Tariq’s clients is a guess.",
    evidence: [
      { who: "a", field: "position", quote: "Managing Partner, Cedar Point Advisors" },
      { who: "b", field: "position", quote: "Policy Counsel, Harbor Regulatory Group" },
    ],
    forA: { score: 69, benefit: "Isabel is policy counsel, so she can speak about regulatory changes that Tariq’s advisory clients ask about.", shareableReason: "Isabel advises on policy at Harbor Regulatory Group, which affects Cedar Point Advisors' clients.", missingInformation: ["Jurisdictions Isabel covers"] },
    forB: { score: 71, benefit: "Tariq leads an advisory firm and can introduce Isabel to clients who need regulatory guidance.", shareableReason: "Tariq's firm Cedar Point Advisors has clients who need the policy advice Harbor Regulatory Group gives.", missingInformation: ["Types of client Tariq advises"] },
  },
  {
    a: e("rafael.ortiz"), b: e("amelia.hart"), pairScore: 68,
    uncertainty: "Neither has listed a concrete need, so the match rests on roles alone.",
    evidence: [
      { who: "a", field: "position", quote: "Managing Director, Vantage Sports Group" },
      { who: "b", field: "position", quote: "Principal, Brightwell Consulting" },
    ],
    forA: { score: 67, benefit: "Amelia is a consulting principal who could advise a sports group on partnerships and operations.", shareableReason: "Amelia's firm Brightwell Consulting advises organizations like Vantage Sports Group.", missingInformation: ["Current advisory needs"] },
    forB: { score: 69, benefit: "Rafael runs a sports group and could become a client or a reference for a consultancy that wants sports work.", shareableReason: "Rafael runs Vantage Sports Group, a possible client for Brightwell Consulting.", missingInformation: ["Sports clients Amelia has worked with"] },
  },
  {
    a: e("meilin.chan"), b: e("yuki.tanaka"), pairScore: 76,
    uncertainty: "Both are technical leads; it is unclear whether they have a shared project or only a shared interest.",
    evidence: [
      { who: "a", field: "position", quote: "Chief Technology Officer, Quill Analytics" },
      { who: "b", field: "position", quote: "Head of Product, Kite Mobility" },
    ],
    forA: { score: 75, benefit: "Yuki leads product at a mobility company that generates large amounts of usage data, a good fit for an analytics business.", shareableReason: "Yuki's company Kite Mobility collects usage data that Quill Analytics' tools could make use of.", missingInformation: ["Kite’s data stack"] },
    forB: { score: 77, benefit: "Mei Lin is a chief technology officer building analytics software and can explain how a product team can use it.", shareableReason: "Mei Lin builds analytics software at Quill Analytics that Kite Mobility's product team could use.", missingInformation: ["Analytics tools Kite uses today"] },
  },
];

export const DEMO_MATCHES: readonly DemoMatch[] = [...HAND_WRITTEN_MATCHES, ...GENERATED_DEMO_MATCHES];
