// Shared pair templates for the matching-simulation demo rosters. Used by generate-demo-roster.mjs and
// generate-demo-event-matches.mjs; changing the text or the order of random() calls changes every generated fixture.
export const complement = {
  Founders: ["Investors", "Family Offices", "Executives"], Investors: ["Founders"], "Family Offices": ["Founders", "Executives"], Executives: ["Service Providers", "Founders", "Sponsors"],
  Brands: ["Creators", "Media", "Athletes"], Sponsors: ["Founders", "Brands", "Executives"], Creators: ["Brands", "Media"], Media: ["Creators", "Athletes", "Brands"],
  Athletes: ["Brands", "Service Providers", "Media"], Government: ["Service Providers", "Executives"], "Service Providers": ["Executives", "Government", "Athletes"],
};
// What `other` offers `me`, for every complementary pairing in both directions. Each entry gives:
// - benefit: for the organizer, why this introduction helps `me` (names both people and companies);
// - share: a sentence that could be told to `me`, written so it also reads on its own in the match list.
export const who = (o) => `${o.first} (${o.position}, ${o.company})`;
export const reasons = {
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
// Spanish demo text for events whose language is Spanish. Job titles and company names are guest data and stay as-is.
export const reasonsEs = {
  "Founders>Investors": [(m, o) => `${who(o)} invierte en empresas jóvenes y puede decirle a ${m.first} si ${m.company} encaja con lo que respalda ${o.company}.`, (m, o) => `${o.first} invierte en ${o.company} y podría ser un inversionista temprano de ${m.company}.`],
  "Founders>Family Offices": [(m, o) => `${who(o)} invierte capital familiar a largo plazo, un tipo de inversionista paciente para ${m.company}.`, (m, o) => `${o.first} invierte para ${o.company} con un horizonte de largo plazo y podría respaldar a ${m.company}.`],
  "Founders>Executives": [(m, o) => `${who(o)} ayuda a dirigir una empresa consolidada que podría convertirse en cliente temprano o socio piloto de ${m.company}.`, (m, o) => `La empresa ${o.company} de ${o.first} podría hacer un piloto o comprarle a ${m.company}.`],
  "Founders>Sponsors": [(m, o) => `${who(o)} dirige las alianzas de un patrocinador del evento que apoya a empresas jóvenes como ${m.company}.`, (m, o) => `La empresa ${o.company} de ${o.first} se asocia con empresas jóvenes como ${m.company}.`],
  "Investors>Founders": [(m, o) => `${who(o)} está creando una empresa joven, una primera mirada para ${m.first} antes de que levante capital de forma amplia.`, (m, o) => `${o.first} está creando ${o.company}, una empresa que ${m.company} podría respaldar.`],
  "Family Offices>Founders": [(m, o) => `${who(o)} está creando una empresa joven que busca capital paciente y de largo plazo como el de ${m.company}.`, (m, o) => `${o.first} está creando ${o.company} y busca inversionistas de largo plazo como ${m.company}.`],
  "Family Offices>Executives": [(m, o) => `${who(o)} ayuda a dirigir un negocio consolidado en el que ${m.company} podría tomar una participación a largo plazo.`, (m, o) => `${o.first} ayuda a dirigir ${o.company}, un negocio maduro en el que ${m.company} podría invertir.`],
  "Executives>Founders": [(m, o) => `${who(o)} está desarrollando un producto que podría ayudar a ${m.company} a trabajar más rápido o con menos costo.`, (m, o) => `La empresa ${o.company} de ${o.first} desarrolla algo que ${m.company} podría usar.`],
  "Executives>Service Providers": [(m, o) => `${who(o)} asesora a empresas en proyectos para los que ${m.company} quizá no tenga las capacidades internas.`, (m, o) => `La firma ${o.company} de ${o.first} asesora a empresas como ${m.company}.`],
  "Executives>Sponsors": [(m, o) => `${who(o)} busca socios comerciales para un patrocinador del evento; ${m.company} podría ser uno.`, (m, o) => `La empresa ${o.company} de ${o.first} busca socios comerciales como ${m.company}.`],
  "Executives>Family Offices": [(m, o) => `${who(o)} toma participaciones a largo plazo en empresas consolidadas como ${m.company}.`, (m, o) => `${o.first} invierte para ${o.company}, que respalda a empresas consolidadas como ${m.company}.`],
  "Executives>Government": [(m, o) => `${who(o)} trabaja en normas y programas comerciales que afectan a ${m.company}.`, (m, o) => `${o.first} trabaja en políticas públicas en ${o.company}, lo que afecta a empresas como ${m.company}.`],
  "Brands>Creators": [(m, o) => `${who(o)} crea trabajo creativo que podría convertirse en contenido de campaña para ${m.company}.`, (m, o) => `El estudio ${o.company} de ${o.first} crea contenido para marcas como ${m.company}.`],
  "Brands>Media": [(m, o) => `${who(o)} trabaja en un medio que podría cubrir el próximo lanzamiento de ${m.company}.`, (m, o) => `${o.first} trabaja en ${o.company}, que cubre marcas como ${m.company}.`],
  "Brands>Athletes": [(m, o) => `${who(o)} dirige un negocio deportivo que busca socios de marca; un patrocinio podría poner a ${m.company} frente a los aficionados.`, (m, o) => `El grupo deportivo ${o.company} de ${o.first} busca socios de marca como ${m.company}.`],
  "Brands>Sponsors": [(m, o) => `${who(o)} dirige las alianzas de un patrocinador del evento que podría cofinanciar una campaña con ${m.company}.`, (m, o) => `La empresa ${o.company} de ${o.first} realiza campañas conjuntas con marcas como ${m.company}.`],
  "Sponsors>Founders": [(m, o) => `${who(o)} está creando una empresa joven a la que ${m.company} podría apoyar y obtener acceso temprano.`, (m, o) => `${o.first} está creando ${o.company}, una empresa joven con la que ${m.company} podría asociarse.`],
  "Sponsors>Brands": [(m, o) => `${who(o)} dirige una marca con la que ${m.company} podría hacer una campaña conjunta.`, (m, o) => `La marca ${o.company} de ${o.first} es un posible socio de campaña para ${m.company}.`],
  "Sponsors>Executives": [(m, o) => `${who(o)} ayuda a dirigir una empresa que podría convertirse en cliente o socia de ${m.company}.`, (m, o) => `${o.first} ayuda a dirigir ${o.company}, un posible cliente o socio de ${m.company}.`],
  "Creators>Brands": [(m, o) => `${who(o)} encarga trabajo creativo, por lo que ${o.company} es un posible cliente de ${m.company}.`, (m, o) => `La marca ${o.company} de ${o.first} contrata estudios como ${m.company}.`],
  "Creators>Media": [(m, o) => `${who(o)} trabaja en un medio que podría destacar o distribuir el trabajo de ${m.company}.`, (m, o) => `El medio ${o.company} de ${o.first} destaca el trabajo de estudios como ${m.company}.`],
  "Media>Creators": [(m, o) => `${who(o)} crea trabajo creativo que podría ser una historia para ${m.company}.`, (m, o) => `El estudio ${o.company} de ${o.first} crea trabajo que ${m.company} podría cubrir.`],
  "Media>Athletes": [(m, o) => `${who(o)} dirige un negocio deportivo con historias y acceso que ${m.company} podría aprovechar.`, (m, o) => `El grupo deportivo ${o.company} de ${o.first} tiene historias que ${m.company} podría cubrir.`],
  "Media>Brands": [(m, o) => `${who(o)} dirige una marca con lanzamientos que ${m.company} podría cubrir.`, (m, o) => `La marca ${o.company} de ${o.first} tiene novedades que ${m.company} podría cubrir.`],
  "Athletes>Brands": [(m, o) => `${who(o)} dirige una marca que podría patrocinar a ${m.company}.`, (m, o) => `La marca ${o.company} de ${o.first} podría patrocinar a ${m.company}.`],
  "Athletes>Service Providers": [(m, o) => `${who(o)} asesora a empresas y podría ayudar a ${m.company} con contratos y crecimiento.`, (m, o) => `La firma ${o.company} de ${o.first} asesora a negocios deportivos como ${m.company}.`],
  "Athletes>Media": [(m, o) => `${who(o)} trabaja en un medio que podría cubrir a ${m.company}.`, (m, o) => `El medio ${o.company} de ${o.first} podría cubrir a ${m.company}.`],
  "Government>Service Providers": [(m, o) => `${who(o)} ve día a día cómo las normas afectan a las empresas, un aporte útil para el trabajo de políticas de ${m.company}.`, (m, o) => `La firma ${o.company} de ${o.first} asesora a empresas afectadas por la política en la que trabaja ${m.company}.`],
  "Government>Executives": [(m, o) => `${who(o)} puede ofrecer a ${m.company} una visión directa de la industria sobre las políticas.`, (m, o) => `${o.first} ayuda a dirigir ${o.company} y puede compartir una visión de la industria con ${m.company}.`],
  "Service Providers>Executives": [(m, o) => `${who(o)} ayuda a dirigir una empresa que podría contratar a ${m.company}.`, (m, o) => `${o.first} ayuda a dirigir ${o.company}, que podría necesitar los servicios de ${m.company}.`],
  "Service Providers>Government": [(m, o) => `${who(o)} define normas que los clientes de ${m.company} deben cumplir.`, (m, o) => `${o.first} trabaja en políticas públicas en ${o.company}, lo que afecta a los clientes de ${m.company}.`],
  "Service Providers>Athletes": [(m, o) => `${who(o)} dirige un negocio deportivo que podría convertirse en cliente de ${m.company}.`, (m, o) => `El grupo deportivo ${o.company} de ${o.first} podría convertirse en cliente de ${m.company}.`],
};
for (const [profile, partners] of Object.entries(complement)) for (const partner of partners) {
  for (const key of [`${profile}>${partner}`, `${partner}>${profile}`]) if (!reasons[key] || !reasonsEs[key]) throw new Error(`No reason text for ${key}`);
}

/** Pairs complementary guests: a pool of guests gets 2 to 5 matches each, growing the pool until `count` pairs fit. */
export function buildPairs(guests, count, { random, shuffle }) {
  // A smaller pool of guests gets several matches each (cap 2 to 5), so the demo shows busy and quiet guests.
  const generated = shuffle(guests);
  const MAX_PER_GUEST = 5;
  const pairs = [];
  for (let poolSize = 60; pairs.length < count && poolSize <= generated.length; poolSize += 10) {
    pairs.length = 0;
    const pool = generated.slice(0, poolSize);
    const cap = new Map(pool.map((guest) => [guest.email, 2 + Math.floor(random() * (MAX_PER_GUEST - 1))]));
    const degree = new Map(pool.map((guest) => [guest.email, 0]));
    const candidates = shuffle(pool.flatMap((a, i) => pool.slice(i + 1).map((b) => [a, b])))
      .filter(([a, b]) => complement[a.profile].includes(b.profile) || complement[b.profile].includes(a.profile));
    for (const [a, b] of candidates) {
      if (pairs.length >= count) break;
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
    const sideEs = (me, other) => ({
      benefit: reasonsEs[`${me.profile}>${other.profile}`][0](me, other),
      shareableReason: reasonsEs[`${me.profile}>${other.profile}`][1](me, other),
      missingInformation: [`Los objetivos de ${me.first} para el evento (aún no hay un perfil guardado)`],
    });
    pairs.push({ a: a.email, b: b.email, pairScore: base, uncertainty: "Based only on job titles and companies from the attendee list. Neither guest has a saved profile yet.",
      es: { uncertainty: "Basado solo en los cargos y las empresas de la lista de asistentes. Ningún invitado tiene aún un perfil guardado.", forA: sideEs(a, b), forB: sideEs(b, a) },
      evidence: [{ who: "a", field: "position", quote: `${a.position}, ${a.company}` }, { who: "b", field: "position", quote: `${b.position}, ${b.company}` }],
      forA: side(a, b), forB: side(b, a) });
    }
  }
  if (pairs.length !== count) throw new Error(`Only ${pairs.length} pairs generated`);
  return pairs;
}
