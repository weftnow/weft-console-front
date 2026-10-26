import { GENERATED_DEMO_MATCHES } from "./demo-matches-generated";

/**
 * Demo-only pairs for the matching simulation. Every email is a fictional guest in `public/demo/weft-demo-attendees-300.csv`;
 * the first 24 rows of that file are `public/demo/weft-demo-attendees.csv`. The 12 pairs below are written by hand and the rest
 * are templated by `scripts/generate-demo-roster.mjs`. Evidence quotes only repeat CSV fields.
 * Order matters: a pair's `seq` in the simulated feed is its index + 1, so append new pairs and keep at most 99.
 */
export const MAX_DEMO_MATCHES = 99;

type SideText = { benefit: string; shareableReason: string | null; missingInformation: string[] };
type Side = SideText & { score: number };
/** Text shown when the event language is Spanish; quotes and guest data stay as written in the roster. */
export type SpanishText = { uncertainty: string; forA: SideText; forB: SideText };
export type DemoMatch = {
  a: string;
  b: string;
  pairScore: number;
  uncertainty: string;
  /** `who` names the pair member the quote is about. */
  evidence: { who: "a" | "b"; field: string; quote: string }[];
  forA: Side;
  forB: Side;
  es: SpanishText;
};

const e = (name: string) => `${name}@demo.weft.example`;

const HAND_WRITTEN_MATCHES: readonly Omit<DemoMatch, "es">[] = [
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

const HAND_WRITTEN_SPANISH: Readonly<Record<string, SpanishText>> = {
  [`${e("nadia.rahman")}|${e("marcus.teo")}`]: {
    uncertainty: "La etapa y el tamaño de ronda de Marcus no están en la lista de asistentes, así que no se confirma si encaja con el tamaño de cheque de Helio.",
    forA: { benefit: "Marcus está creando una empresa de robótica y es el tipo de fundador en etapa temprana que un socio de capital de riesgo quiere conocer antes de que se anuncie una ronda.", shareableReason: "Marcus está creando Lumen Robotics, una empresa de hardware en etapa temprana que Helio Ventures podría respaldar.", missingInformation: ["Etapa de inversión preferida"] },
    forB: { benefit: "Nadia dirige inversiones en Helio Ventures y puede explicar qué espera un fondo de capital de riesgo de un fundador de robótica.", shareableReason: "Nadia invierte en Helio Ventures y podría ser una inversionista temprana de Lumen Robotics.", missingInformation: ["Ronda de financiamiento actual"] },
  },
  [`${e("hana.sato")}|${e("sofia.marchetti")}`]: {
    uncertainty: "Es posible que el family office de Hana no invierta en salud en esta etapa; solo se conoce su cargo.",
    forA: { benefit: "Sofia fundó una empresa de salud y ofrece una mirada directa a un sector que los family offices respaldan cada vez más a largo plazo.", shareableReason: "Sofia está creando Orchard Health y busca inversionistas pacientes y de largo plazo como Tidewater.", missingInformation: ["Sectores en los que invierte Tidewater"] },
    forB: { benefit: "Hana asigna capital para un family office, un tipo de inversionista paciente que le conviene a una fundadora que no busca una salida rápida.", shareableReason: "Hana invierte para Tidewater Family Office con un horizonte de largo plazo y podría respaldar a Orchard Health.", missingInformation: ["Necesidades de financiamiento"] },
  },
  [`${e("kwame.mensah")}|${e("ingrid.solberg")}`]: {
    uncertainty: "No se indica el mercado de enfoque de Ingrid, así que el vínculo con un fondo panafricano se asume por el nombre del fondo.",
    forA: { benefit: "Ingrid fundó una empresa de energía, y la infraestructura energética es un tema prioritario para los fondos de crecimiento con mandato en mercados emergentes.", shareableReason: "La empresa de Ingrid, Nordlys Energy, trabaja en energía, un sector prioritario para Pan-Africa Growth Fund.", missingInformation: ["Mercados objetivo de Ingrid"] },
    forB: { benefit: "Kwame dirige inversiones en un fondo de crecimiento y puede explicar cómo evalúan estos fondos a las empresas de energía que se expanden a nuevas regiones.", shareableReason: "Kwame invierte en Pan-Africa Growth Fund y podría respaldar a Nordlys Energy en su expansión.", missingInformation: ["Planes de expansión"] },
  },
  [`${e("daniel.okafor")}|${e("meilin.chan")}`]: {
    uncertainty: "No está claro si Quill Analytics vende a bancos o solo a otros equipos de software.",
    forA: { benefit: "Mei Lin dirige la tecnología de una empresa de análisis de datos, lo que la convierte en una socia natural para un banco que busca herramientas de datos.", shareableReason: "La empresa de Mei Lin, Quill Analytics, crea herramientas de datos que Meridian Bank podría usar.", missingInformation: ["Clientes de Quill en servicios financieros"] },
    forB: { benefit: "Daniel está a cargo de las alianzas de un banco, por lo que puede describir cómo una institución financiera evalúa e incorpora a un proveedor de tecnología.", shareableReason: "Daniel dirige las alianzas de Meridian Bank, un posible cliente de Quill Analytics.", missingInformation: ["Requisitos de cumplimiento para proveedores"] },
  },
  [`${e("henrik.larsen")}|${e("elias.brandt")}`]: {
    uncertainty: "Las dos empresas podrían ser competidoras directas en algunas rutas; ninguna lo ha indicado.",
    forA: { benefit: "Elias dirige las operaciones de una empresa de carga y puede comparar experiencias sobre rutas, capacidad y alianzas con alguien que ve el mismo mercado desde la operación.", shareableReason: "Elias dirige las operaciones de Cobalt Freight, un posible socio de Fjordworks Logistics en rutas y capacidad.", missingInformation: ["Regiones que atiende cada empresa"] },
    forB: { benefit: "Henrik es director ejecutivo de una empresa de logística y puede abrir una conversación sobre capacidad compartida o rutas conjuntas.", shareableReason: "Henrik dirige Fjordworks Logistics, un posible socio de Cobalt Freight en rutas y capacidad.", missingInformation: ["Interés actual en alianzas"] },
  },
  [`${e("zara.patel")}|${e("yuki.tanaka")}`]: {
    uncertainty: "No se sabe si Kite Mobility procesa pagos directamente.",
    forA: { benefit: "Yuki está a cargo del producto de una empresa de movilidad, donde los pagos dentro de la app son una función central que un negocio de pagos quiere atender.", shareableReason: "Yuki dirige el producto de Kite Mobility, que necesita los pagos dentro de la app que ofrece Ardent Payments.", missingInformation: ["Proveedor de pagos actual de Kite"] },
    forB: { benefit: "Zara dirige el área comercial de una empresa de pagos y puede hablar de opciones de integración para un producto de movilidad.", shareableReason: "Zara dirige el área comercial de Ardent Payments, un posible socio de pagos para Kite Mobility.", missingInformation: ["Funciones de pago en el plan de producto"] },
  },
  [`${e("priya.venkataraman")}|${e("noah.whitaker")}`]: {
    uncertainty: "No se indica la etapa de la empresa de Noah, y el enfoque del fondo de Priya se deduce de su cargo.",
    forA: { benefit: "Noah fundó una empresa de educación, un negocio en etapa temprana que una directora de una firma de capital puede evaluar de primera mano.", shareableReason: "Noah está creando Brightpath Learning, una empresa que Fieldstone Capital podría respaldar.", missingInformation: ["Sectores en los que se enfoca Fieldstone"] },
    forB: { benefit: "Priya trabaja en una firma de inversión y puede decir qué buscan los inversionistas en una empresa de tecnología educativa.", shareableReason: "Priya invierte en Fieldstone Capital y podría ser una inversionista temprana de Brightpath Learning.", missingInformation: ["Planes de financiamiento de Brightpath"] },
  },
  [`${e("lucas.ferreira")}|${e("chloe.beaumont")}`]: {
    uncertainty: "Se desconocen las relaciones actuales de Maison Aube con agencias.",
    forA: { benefit: "Chloe dirige una marca y encarga trabajo creativo, lo que la convierte en una vía directa a un proyecto para un estudio.", shareableReason: "La marca de Chloe, Maison Aube, contrata estudios creativos como Pixelwharf Studios.", missingInformation: ["Próximas campañas"] },
    forB: { benefit: "Lucas dirige un estudio creativo y puede mostrarle a una directora de marca lo que un socio visual podría entregar para un lanzamiento.", shareableReason: "El estudio de Lucas, Pixelwharf Studios, podría crear contenido de campaña para Maison Aube.", missingInformation: ["Rango de presupuesto"] },
  },
  [`${e("amara.nwosu")}|${e("viktor.novak")}`]: {
    uncertainty: "Viktor no ha dicho si quiere cobertura de prensa.",
    forA: { benefit: "Viktor fundó una empresa de audio, así que podría tener una historia de producto y un punto de vista de fundador que valga la pena cubrir.", shareableReason: "Viktor está creando Halcyon Audio, una historia de producto que Northgate Media podría cubrir.", missingInformation: ["Si Viktor quiere cobertura"] },
    forB: { benefit: "Amara dirige un medio de comunicación y puede explicar cómo una empresa joven de audio llama la atención de la prensa.", shareableReason: "Amara dirige Northgate Media, que podría cubrir el lanzamiento de Halcyon Audio.", missingInformation: ["Fecha del lanzamiento"] },
  },
  [`${e("tariq.haddad")}|${e("isabel.duarte")}`]: {
    uncertainty: "No se indica la jurisdicción de Isabel, así que la coincidencia regulatoria con los clientes de Tariq es una suposición.",
    forA: { benefit: "Isabel es asesora en políticas públicas, por lo que puede hablar de los cambios regulatorios que preguntan los clientes de asesoría de Tariq.", shareableReason: "Isabel asesora en políticas en Harbor Regulatory Group, lo que afecta a los clientes de Cedar Point Advisors.", missingInformation: ["Jurisdicciones que cubre Isabel"] },
    forB: { benefit: "Tariq dirige una firma de asesoría y puede presentarle a Isabel clientes que necesitan orientación regulatoria.", shareableReason: "La firma de Tariq, Cedar Point Advisors, tiene clientes que necesitan la asesoría en políticas que ofrece Harbor Regulatory Group.", missingInformation: ["Tipos de clientes que asesora Tariq"] },
  },
  [`${e("rafael.ortiz")}|${e("amelia.hart")}`]: {
    uncertainty: "Ninguno ha indicado una necesidad concreta, así que la coincidencia se basa solo en sus cargos.",
    forA: { benefit: "Amelia es directora de una consultora y podría asesorar a un grupo deportivo en alianzas y operaciones.", shareableReason: "La firma de Amelia, Brightwell Consulting, asesora a organizaciones como Vantage Sports Group.", missingInformation: ["Necesidades de asesoría actuales"] },
    forB: { benefit: "Rafael dirige un grupo deportivo y podría convertirse en cliente o en referencia para una consultora que quiere trabajar en el deporte.", shareableReason: "Rafael dirige Vantage Sports Group, un posible cliente de Brightwell Consulting.", missingInformation: ["Clientes del sector deportivo con los que ha trabajado Amelia"] },
  },
  [`${e("meilin.chan")}|${e("yuki.tanaka")}`]: {
    uncertainty: "Ambos son líderes técnicos; no está claro si tienen un proyecto en común o solo un interés compartido.",
    forA: { benefit: "Yuki dirige el producto de una empresa de movilidad que genera grandes volúmenes de datos de uso, una buena opción para un negocio de análisis.", shareableReason: "Kite Mobility, la empresa de Yuki, recopila datos de uso que las herramientas de Quill Analytics podrían aprovechar.", missingInformation: ["Infraestructura de datos de Kite"] },
    forB: { benefit: "Mei Lin es directora de tecnología y crea software de análisis; puede explicar cómo un equipo de producto puede usarlo.", shareableReason: "Mei Lin crea en Quill Analytics software de análisis que el equipo de producto de Kite Mobility podría usar.", missingInformation: ["Herramientas de análisis que Kite usa hoy"] },
  },
};

const withSpanish = (match: Omit<DemoMatch, "es">): DemoMatch => {
  const es = HAND_WRITTEN_SPANISH[`${match.a}|${match.b}`];
  if (!es) throw new Error(`Missing Spanish demo text for ${match.a}`);
  return { ...match, es };
};

export const DEMO_MATCHES: readonly DemoMatch[] = [...HAND_WRITTEN_MATCHES.map(withSpanish), ...GENERATED_DEMO_MATCHES];
