import type { MatchDiscussion } from "../match-discussion";
import type { DemoMatch } from "./demo-matches";

export type CuratedDemoMatch = DemoMatch & {
  discussion: MatchDiscussion;
  es: DemoMatch["es"] & { discussion: MatchDiscussion };
};

export const EXECUTIVE_OPERATIONS_MATCHES: readonly CuratedDemoMatch[] = [
  {
    a: "elena.park@harborlineprecisionworks.example",
    b: "marcus.bell@northcovefacilityservices.example",
    pairScore: 94,
    uncertainty:
      "Elena is two years away from her planned handover while Marcus is getting ready to open a second hub; check whether Elena wants to talk through board setup or manager communication first.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "We are considering employee ownership before a leadership transition in two years. I want to understand which decisions about governance, valuation and the management handover need to come first.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We reduced production changeover time by 18% on a line running multiple shifts. I can talk through the changes and share the one-page operating report we used.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to open a second service hub. Before we do, I need to decide which responsibilities belong to a local manager and which stay with our operations director. Overtime at remote sites is already a concern.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We went through an employee-ownership transition. I can share how we handled manager communication and board setup, plus our checklist for handing over responsibilities.",
      },
    ],
    forA: {
      score: 96,
      benefit:
        "Marcus is CEO & Owner of Northcove Facility Services and has already taken his company through an employee-ownership transition, complete with a board setup plan and a handover checklist.",
      shareableReason:
        "Marcus has been through an employee-ownership transition at Northcove Facility Services and can share how he handled board setup, manager communication, and handing over daily responsibilities.",
      missingInformation: [
        "Whether Elena is set on employee ownership or still weighing other handover options",
        "Which board or management handover decision she needs to make first",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Elena is CEO of Harborline Precision Works and uses a simple one-page operating report across multi-shift lines that cut changeover time by 18% and made shift responsibilities clear.",
      shareableReason:
        "Elena runs multi-shift production at Harborline Precision Works and can share the one-page operating report her team uses to keep local shift responsibilities clear.",
      missingInformation: [
        "Which daily calls Marcus already expects the new hub manager to own on day one",
        "When Marcus plans to open the second service hub",
      ],
    },
    discussion: {
      why: "A two-way trade: Elena has built the one-page shift report Marcus needs to run a second service hub, and Marcus has already completed the employee-ownership handover Elena is planning.",
      forA: {
        heading: "Employee Ownership Handover",
        problem:
          "Elena is considering moving her company to employee ownership before she steps back in two years. She needs to know which decisions on board setup, valuation, and management handover come first.",
        whyMatch:
          "Marcus already took his company through an employee-ownership transition and has a checklist for setting up the board, talking to managers, and handing over responsibilities.",
        business:
          "Ask Marcus which board and valuation decisions he had to lock in first, and how he explained the handover to his managers.",
        life: "How to pace a two-year leadership handover so your managers start thinking like owners before you step back.",
      },
      forB: {
        heading: "Opening a Second Service Hub",
        problem:
          "Marcus wants to open a second service hub without overloading his operations director or driving up overtime at remote sites. He needs to decide what a local manager owns versus what stays central.",
        whyMatch:
          "Elena runs multi-shift production lines with a one-page operating report that spells out who owns each daily decision and cut changeover times by 18%.",
        business:
          "Ask Elena how her one-page operating report works and how she decides which daily calls belong to local managers.",
        life: "How to keep your operations director from burning out when running two locations at once.",
      },
    },
    es: {
      uncertainty:
        "Elena está a dos años de su relevo mientras Marcus prepara su segundo centro de servicio; conviene confirmar si Elena prefiere empezar por el armado del directorio o por la comunicación con los gerentes.",
      forA: {
        benefit:
          "Marcus es CEO y propietario de Northcove Facility Services y ya pasó por una transición a propiedad de los empleados, con experiencia directa armando el directorio y delegando funciones.",
        shareableReason:
          "Marcus completó una transición a propiedad de los empleados en Northcove Facility Services y puede contar cómo armaron el directorio, hablaron con los gerentes y traspasaron responsabilidades.",
        missingInformation: [
          "Si la propiedad de los empleados ya es el camino elegido por Elena o una opción entre varias",
          "Qué decisión sobre el directorio o el traspaso de mando necesita resolver primero",
        ],
      },
      forB: {
        benefit:
          "Elena es CEO de Harborline Precision Works y usa un reporte operativo de una página en líneas de varios turnos con el que redujo un 18% los tiempos de cambio y dejó claras las tareas de cada jefe.",
        shareableReason:
          "Elena dirige operaciones de varios turnos en Harborline Precision Works y puede compartir el reporte de una página que usan para dejar claro qué decide cada responsable de turno.",
        missingInformation: [
          "Qué decisiones diarias espera Marcus que tome el nuevo gerente local desde el primer día",
          "En qué fecha planea abrir el segundo centro de servicio",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Elena tiene el reporte operativo de una página que Marcus necesita para su segundo centro de servicio, mientras Marcus ya completó el traspaso a propiedad de los empleados que Elena está planeando.",
        forA: {
          heading: "Traspaso a propiedad de empleados",
          problem:
            "Elena evalúa pasar su empresa a manos de los empleados antes de dar un paso al costado en dos años. Necesita saber qué decisiones sobre directorio, valuación y traspaso de mando van primero.",
          whyMatch:
            "Marcus ya hizo esa misma transición en su empresa y tiene una lista práctica para armar el directorio, hablar con los gerentes y delegar tareas paso a paso.",
          business:
            "Pregúntale a Marcus qué decisiones sobre el directorio y la valuación tuvo que cerrar primero y cómo les explicó el cambio a sus gerentes.",
          life: "Cómo llevar un relevo de dos años con calma para que tus gerentes empiecen a decidir como dueños antes de que te retires.",
        },
        forB: {
          heading: "Abrir un segundo centro operativo",
          problem:
            "Marcus quiere abrir un segundo centro de servicio sin saturar a su director de operaciones ni disparar las horas extra en sitios lejanos. Necesita definir qué decide el gerente local y qué queda en la oficina central.",
          whyMatch:
            "Elena coordina varios turnos de producción con un reporte de una sola página que deja claro quién decide cada cosa y le permitió bajar un 18% los tiempos de cambio.",
          business:
            "Pregúntale a Elena cómo usa su reporte de una página para separar las decisiones del gerente local de las del director de operaciones.",
          life: "Cómo evitar que tu director de operaciones se queme cuando la empresa pasa de una sede a dos.",
        },
      },
    },
  },
  {
    a: "priya.nair@redwoodcarecollective.example",
    b: "james.calder@beaconlineveterinarypartners.example",
    pairScore: 95,
    uncertainty:
      "Both run multi-site clinical groups in different fields (outpatient care and veterinary clinics); check whether Priya already measures clinic schedules the same way at every site and how soon James needs his first new clinic managers in place.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "We plan to open two outpatient locations. I want to compare appointment availability and clinician utilization across sites before we commit. How should those measures inform the decision to open?",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We built site dashboards and coached clinical managers on when to act on the numbers. I can share the one-page scorecard and discuss how we used it in site reviews.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "We need to develop successors for ten clinic managers over the next year. I want advice on deciding when someone is ready to take responsibility for a clinic.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We expanded from four to seventeen veterinary clinics. I can walk through our checks before opening in a new market and how we tracked doctor utilization and client retention.",
      },
    ],
    forA: {
      score: 95,
      benefit:
        "James is President of Beaconline Veterinary Partners and grew his group from four to seventeen clinics using clear pre-opening checks on doctor schedules and client retention.",
      shareableReason:
        "James helped grow Beaconline Veterinary Partners from four to seventeen clinics and can share the exact checks on doctor workloads and client retention they used before opening a new site.",
      missingInformation: [
        "Whether Priya's existing clinics all measure appointment availability and clinician schedules the same way",
        "When Priya needs to make the final call on the two new locations",
      ],
    },
    forB: {
      score: 95,
      benefit:
        "Priya is CEO of Redwood Care Collective and built a one-page clinic scorecard paired with coaching routines that teach clinic managers when to act on the numbers.",
      shareableReason:
        "Priya built a one-page site scorecard at Redwood Care Collective and coached clinic managers on how to act on their numbers during site reviews.",
      missingInformation: [
        "Whether James already has internal people in mind for the ten clinic-manager jobs",
        "Which day-to-day clinic decisions new managers struggle with most",
      ],
    },
    discussion: {
      why: "A two-way trade: James has the pre-opening checklist Priya needs before committing to two new clinics, and Priya has the one-page scorecard and coaching routine James needs to get ten new clinic managers ready.",
      forA: {
        heading: "Deciding When to Open Clinics",
        problem:
          "Priya plans to open two new outpatient locations. Before signing off, she wants to know how appointment wait times and clinician schedules at her current sites should guide the decision.",
        whyMatch:
          "James grew his veterinary group from four to seventeen clinics and used a clear checklist on doctor schedules and client retention before entering any new market.",
        business:
          "Ask James which numbers on doctor schedules and client retention had to look right before he approved opening a new clinic.",
        life: "How to hold off on opening new locations until your current clinics are running smoothly.",
      },
      forB: {
        heading: "Training New Clinic Managers",
        problem:
          "James needs to get ten new clinic managers ready over the next year and wants a reliable way to tell when someone is truly ready to run a clinic on their own.",
        whyMatch:
          "Priya built a one-page site scorecard and used it in regular reviews to coach clinical managers on when and how to act on the numbers.",
        business:
          "Ask Priya how she uses her one-page scorecard in site reviews to see if a manager knows when to step in and fix a problem.",
        life: "How to coach ten rising clinic managers at once without micromanaging their daily work.",
      },
    },
    es: {
      uncertainty:
        "Ambos dirigen redes de clínicas en rubros distintos (atención ambulatoria y veterinaria); conviene confirmar si Priya ya mide igual la agenda en todas sus sedes y qué tan pronto necesita James cubrir las primeras gerencias.",
      forA: {
        benefit:
          "James es Presidente de Beaconline Veterinary Partners y pasó de cuatro a diecisiete clínicas usando reglas claras sobre agenda médica y retención de clientes antes de cada apertura.",
        shareableReason:
          "James participó en el crecimiento de Beaconline Veterinary Partners de cuatro a diecisiete clínicas y puede contar qué revisaban en la agenda de los doctores antes de abrir una nueva sede.",
        missingInformation: [
          "Si todas las clínicas actuales de Priya miden del mismo modo los turnos disponibles y la ocupación médica",
          "En qué fecha debe decidir Priya la apertura de los dos nuevos centros",
        ],
      },
      forB: {
        benefit:
          "Priya es CEO de Redwood Care Collective y armó un tablero de una página por sede con el que entrenó a los gerentes clínicos para saber cuándo intervenir según los números.",
        shareableReason:
          "Priya diseñó un tablero de una página en Redwood Care Collective y lo usó en las reuniones de sede para enseñar a los gerentes clínicos a tomar decisiones por su cuenta.",
        missingInformation: [
          "Si James ya tiene candidatos internos elegidos para las diez gerencias de clínica",
          "Qué decisiones del día a día les cuestan más a los nuevos gerentes de clínica",
        ],
      },
      discussion: {
        why: "Un intercambio directo: James tiene los criterios previos de apertura que Priya necesita para evaluar sus dos nuevas clínicas, mientras Priya tiene el tablero de una página y el método de entrenamiento que James busca para formar a diez gerentes de clínica.",
        forA: {
          heading: "Cuándo abrir nuevas clínicas",
          problem:
            "Priya planea abrir dos centros ambulatorios. Antes de comprometerse, quiere saber cómo usar la disponibilidad de turnos y la ocupación de los médicos en sus sedes actuales para tomar la decisión.",
          whyMatch:
            "James creció de cuatro a diecisiete clínicas veterinarias revisando siempre la ocupación de los doctores y la retención de clientes antes de aprobar una nueva sede.",
          business:
            "Pregúntale a James qué números de agenda médica y retención de pacientes tenían que cumplirse antes de dar luz verde a una clínica nueva.",
          life: "Cómo frenar el impulso de abrir más sedes hasta que las clínicas actuales tengan un ritmo parejo y sostenible.",
        },
        forB: {
          heading: "Formar a diez gerentes clínicos",
          problem:
            "James necesita preparar a diez futuros gerentes de clínica durante el próximo año y quiere una forma práctica de saber cuándo alguien ya está listo para hacerse cargo de una sede.",
          whyMatch:
            "Priya creó un tablero de una página por sede y lo usa en las revisiones periódicas para entrenar a los gerentes clínicos sobre cuándo actuar ante los números.",
          business:
            "Pregúntale a Priya cómo usa su tablero de una página en las reuniones de sede para comprobar si un gerente sabe detectar y corregir un problema solo.",
          life: "Cómo acompañar el crecimiento de diez nuevos jefes de clínica sin caer en estar encima de cada decisión diaria.",
        },
      },
    },
  },
  {
    a: "vivian.ortiz@solsticecomponents.example",
    b: "noah.kapur@valleycrestfoodproducts.example",
    pairScore: 91,
    uncertainty:
      "Vivian makes electronic components while Noah runs a packaged food company; check when Vivian's OEM customer contracts come up for renewal and which suppliers cause Noah's biggest delivery swings.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "We depend on two critical overseas suppliers. Before our OEM customer contracts renew, I need to decide whether qualifying alternative sources is worth the cost and time.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We rebuilt supplier scorecards and production planning around delivery performance. I can share the scorecard and explain how we reviewed delivery reliability alongside component failure rates.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to make service more reliable when delivery times are unpredictable. Timing: within six months.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We checked alternative supply options before switching in stages.",
      },
    ],
    forA: {
      score: 90,
      benefit:
        "Noah is President & CEO of Valleycrest Food Products and has hands-on experience testing backup suppliers and moving orders over in small stages.",
      shareableReason:
        "Noah runs Valleycrest Food Products and can share how his team tested backup suppliers and shifted volume in stages before committing to a full switch.",
      missingInformation: [
        "How soon Vivian's OEM customer contracts come up for renewal",
        "Whether she has already found candidate backup suppliers to test",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Vivian is CEO of Solstice Components and rebuilt her supplier scorecards and production schedule around delivery reliability and failure rates.",
      shareableReason:
        "Vivian rebuilt supplier scorecards and production planning around delivery reliability at Solstice Components and can share the scorecard her team uses to keep customer orders on track.",
      missingInformation: [
        "Which ingredients or packaging suppliers cause the biggest delivery delays for Noah",
        "How Noah currently tracks on-time service for his customers",
      ],
    },
    discussion: {
      why: "A two-way trade: Noah has tested backup suppliers in small stages the way Vivian needs to before her contracts renew, and Vivian has built the delivery-reliability scorecard Noah needs to keep customer orders steady.",
      forA: {
        heading: "Testing Backup Suppliers in Stages",
        problem:
          "Vivian relies on two critical overseas suppliers. Before her OEM customer contracts renew, she needs to decide if finding and qualifying backup suppliers is worth the cost and time.",
        whyMatch:
          "Noah already went through checking backup supply options and moving orders over in small stages so he didn't have to bet everything on a pricey switch up front.",
        business:
          "Ask Noah how he tested backup suppliers in small steps before committing real money and volume to a switch.",
        life: "How to make time for backup-supplier work when your team is already busy filling current customer orders.",
      },
      forB: {
        heading: "Planning Around Unpredictable Deliveries",
        problem:
          "Noah wants to make customer service more reliable over the next six months, even when his own suppliers have unpredictable delivery times.",
        whyMatch:
          "Vivian rebuilt her supplier scorecards and production schedule around delivery reliability and part failure rates so late shipments don't blindside the plant.",
        business:
          "Ask Vivian how she built supplier delivery reliability straight into her production schedule and what she tracks on her scorecard.",
        life: "How to stop spending your week chasing late shipments and run calm, predictable supplier reviews instead.",
      },
    },
    es: {
      uncertainty:
        "Vivian fabrica componentes electrónicos mientras Noah produce alimentos envasados; conviene confirmar cuándo se renuevan los contratos con clientes OEM de Vivian y qué insumos le generan más atrasos a Noah.",
      forA: {
        benefit:
          "Noah es Presidente y CEO de Valleycrest Food Products y ya puso a prueba proveedores alternativos pasando pedidos por etapas para no arriesgar la operación.",
        shareableReason:
          "Noah dirige Valleycrest Food Products y puede contar cómo probaron opciones de suministro alternativo y fueron cambiando en etapas sin frenar la planta.",
        missingInformation: [
          "Cuánto falta para la renovación de los contratos con los clientes OEM de Vivian",
          "Si ya tiene proveedores alternativos identificados para empezar a probar",
        ],
      },
      forB: {
        benefit:
          "Vivian es CEO de Solstice Components y rearmó sus tableros de proveedores y su programación de planta tomando como base la puntualidad de entrega y la tasa de fallas.",
        shareableReason:
          "Vivian rediseñó la evaluación de proveedores y el plan de producción en Solstice Components y puede mostrar el tablero que usan para cumplirles a los clientes aunque fallen las entregas.",
        missingInformation: [
          "Qué materias primas o empaques generan las mayores demoras en Valleycrest Food Products",
          "Cómo mide hoy Noah el cumplimiento de entregas a sus propios clientes",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Noah ya probó proveedores de respaldo por etapas tal como Vivian evalúa hacer antes de renovar sus contratos, mientras Vivian armó el tablero de puntualidad y producción que Noah necesita para cumplirles a sus clientes.",
        forA: {
          heading: "Probar proveedores en etapas",
          problem:
            "Vivian depende de dos proveedores clave en el exterior. Antes de renovar contratos con sus clientes OEM, tiene que decidir si vale la pena el tiempo y el costo de habilitar proveedores alternativos.",
          whyMatch:
            "Noah ya pasó por evaluar proveedores de respaldo y transferir compras en etapas chicas para comprobar que funcionaban antes de comprometerse.",
          business:
            "Pregúntale a Noah cómo armó las pruebas por etapas con nuevos proveedores para controlar el gasto y el tiempo antes de cambiar.",
          life: "Cómo hacer lugar en la agenda para desarrollar proveedores de respaldo cuando las entregas del día a día te absorben.",
        },
        forB: {
          heading: "Planificar con entregas variables",
          problem:
            "Noah quiere que el servicio a sus clientes sea más confiable en los próximos seis meses, incluso cuando los tiempos de entrega de sus propios proveedores son impredecibles.",
          whyMatch:
            "Vivian rearmó sus tableros de proveedores y la programación de su planta en función de qué tan puntual entrega cada proveedor y cuántas fallas tiene.",
          business:
            "Pregúntale a Vivian cómo conectó el tablero de puntualidad de sus proveedores con la programación semanal de producción.",
          life: "Cómo dejar de correr detrás de camiones atrasados toda la semana y pasar a revisiones de proveedores claras y previsibles.",
        },
      },
    },
  },
  {
    a: "theo.kim@summitlinecommercialbuilders.example",
    b: "natalie.reed@copperleafserviceoperations.example",
    pairScore: 96,
    uncertainty:
      "Check whether Theo is already looking at a specific subcontractor to buy and which cost numbers are currently tracked differently across Natalie's three acquired branches.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "We are deciding whether to acquire a specialty subcontractor within two quarters. I want to understand what to integrate early and which decisions to leave with the acquired team.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We used job-cost and work-in-progress reviews to tighten commercial bids. I can explain how we reviewed project margins and the time taken to approve changes.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I need to compare contract profitability across three acquired locations. What should we standardize first so the numbers are useful for decisions across the group?",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We integrated two founder-led service companies while retaining local managers. I can share how we compared site measures and reviewed crew utilization and escalations.",
      },
    ],
    forA: {
      score: 96,
      benefit:
        "Natalie is President & CEO of Copperleaf Service Operations and has integrated two founder-led service companies while keeping their local managers on board.",
      shareableReason:
        "Natalie integrated two founder-led service businesses at Copperleaf Service Operations while keeping local managers in place and can share what she combined early versus left alone.",
      missingInformation: [
        "Whether Theo already has a specific specialty subcontractor in mind",
        "Which daily field decisions Theo plans to leave with the acquired team",
      ],
    },
    forB: {
      score: 96,
      benefit:
        "Theo is CEO of Summitline Commercial Builders and runs clear job-cost and work-in-progress reviews to track project margins and change-order turnaround.",
      shareableReason:
        "Theo leads Summitline Commercial Builders and can share how his team lines up job costs, work-in-progress margins, and change-order tracking across projects.",
      missingInformation: [
        "Which cost items are currently counted differently across Natalie's three acquired locations",
        "How often Natalie reviews contract profit with her branch managers today",
      ],
    },
    discussion: {
      why: "A two-way trade: Natalie has already integrated two founder-led service businesses the way Theo hopes to do with a specialty subcontractor, and Theo runs the job-cost and margin reviews Natalie needs to compare profit across her three acquired locations.",
      forA: {
        heading: "Buying a Specialty Subcontractor",
        problem:
          "Theo is deciding whether to buy a specialty subcontractor in the next six months. He wants to know what to combine early on and which decisions to leave with the acquired team.",
        whyMatch:
          "Natalie bought and integrated two founder-led service companies while keeping their local managers in place and tracking crew workloads across sites.",
        business:
          "Ask Natalie which decisions she left with local managers after buying two service companies and what she combined right away.",
        life: "How to earn the trust of an acquired team by not changing local work habits that already run well.",
      },
      forB: {
        heading: "Comparing Profit Across Locations",
        problem:
          "Natalie needs to compare contract profit across three acquired locations and wants to know which numbers to standardize first so she is comparing apples to apples.",
        whyMatch:
          "Theo runs regular job-cost and work-in-progress reviews that measure project margins and how fast change orders get approved.",
        business:
          "Ask Theo which job-cost and work-in-progress numbers he standardized first so project profit could be compared fairly.",
        life: "How to get acquired branch managers to use shared profit numbers to make better local calls instead of feeling policed.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar si Theo ya está evaluando a un subcontratista concreto para comprar y qué costos se calculan hoy de forma distinta entre las tres sucursales que compró Natalie.",
      forA: {
        benefit:
          "Natalie es Presidenta y CEO de Copperleaf Service Operations e integró dos empresas de servicios creadas por sus fundadores manteniendo a los gerentes locales en sus puestos.",
        shareableReason:
          "Natalie integró dos empresas de servicios en Copperleaf Service Operations conservando a sus gerentes locales y puede contar qué unificó de entrada y qué dejó en manos del equipo local.",
        missingInformation: [
          "Si Theo ya tiene en vista a un subcontratista específico para adquirir",
          "Qué decisiones de obra planea dejar en manos del equipo adquirido",
        ],
      },
      forB: {
        benefit:
          "Theo es CEO de Summitline Commercial Builders y lleva revisiones claras de costos por obra y avance de trabajos para medir márgenes reales y tiempos de aprobación de cambios.",
        shareableReason:
          "Theo dirige Summitline Commercial Builders y puede explicar cómo ordenaron las revisiones de costo por proyecto y trabajo en curso para comparar márgenes sin distorsiones.",
        missingInformation: [
          "Qué rubros de costo o mano de obra se registran hoy distinto entre las tres sedes adquiridas por Natalie",
          "Cada cuánto revisa Natalie la rentabilidad de los contratos con sus gerentes de sucursal",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Natalie ya integró dos empresas de servicios conservando a sus gerentes locales tal como busca hacer Theo, mientras Theo tiene el método de revisión de costos y márgenes por obra que Natalie necesita para comparar sus tres sedes adquiridas.",
        forA: {
          heading: "Integrar un subcontratista adquirido",
          problem:
            "Theo está decidiendo si compra a un subcontratista especializado en los próximos seis meses. Quiere saber qué áreas conviene unificar desde el principio y qué decisiones dejar en manos del equipo que entra.",
          whyMatch:
            "Natalie ya compró e integró dos empresas de servicios lideradas por sus dueños originales logrando que los gerentes locales se quedaran.",
          business:
            "Pregúntale a Natalie qué cosas unificó apenas compró esas dos empresas y qué decisiones dejó que los gerentes locales siguieran manejando solos.",
          life: "Cómo ganarte la confianza de un equipo recién adquirido evitando cambiar costumbres locales que ya dan buen resultado.",
        },
        forB: {
          heading: "Comparar rentabilidad entre sedes",
          problem:
            "Natalie necesita comparar qué tan rentables son los contratos en tres sedes adquiridas y quiere saber qué números emparejar primero para que la comparación sirva para decidir.",
          whyMatch:
            "Theo usa revisiones periódicas de costos por proyecto y trabajo en curso para seguir de cerca el margen de cada obra y cuánto tardan en aprobarse los cambios.",
          business:
            "Pregúntale a Theo qué criterios de costo por obra y avance de trabajo unificó primero para poder comparar márgenes de forma justa.",
          life: "Cómo lograr que los gerentes de sucursales adquiridas vean los reportes de margen como una ayuda para decidir mejor y no como una auditoría en su contra.",
        },
      },
    },
  },
  {
    a: "lucas.moreno@atlasgridtechnologygroup.example",
    b: "maya.chen@westbridgeindustrialmanufacturing.example",
    pairScore: 93,
    uncertainty:
      "Lucas runs a cybersecurity company and Maya runs a manufacturing business looking at factory security, so make sure both agree upfront that this is a peer-learning chat with no sales pitch.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to understand the evidence industrial buyers need before approving an external cybersecurity provider for older equipment and cloud-connected systems.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We worked on operational-technology and IT security readiness for owner-operated businesses. I can share a plain-language risk register and discuss how we used it.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "Before connecting older equipment to cloud analytics, I want to decide which cybersecurity risks we need to address first.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We used plant-level business cases and procurement approval steps to assess technology spending. I can explain what went into those decisions.",
      },
    ],
    forA: {
      score: 93,
      benefit:
        "Maya is President of Westbridge Industrial Manufacturing and can walk through how a factory buyer builds plant-level business cases and approves tech spending.",
      shareableReason:
        "Maya leads Westbridge Industrial Manufacturing and can share how her team reviews plant-level business cases and purchasing hurdles before approving factory tech spending.",
      missingInformation: [
        "Confirmation that both sides want a strictly peer-learning chat with zero sales pitch",
        "Which factory approval questions Lucas wants feedback on most",
      ],
    },
    forB: {
      score: 93,
      benefit:
        "Lucas is CEO of AtlasGrid Technology Group and has helped owner-operated plants secure older machines using a plain-English risk checklist.",
      shareableReason:
        "Lucas has worked on factory and IT security at AtlasGrid Technology Group and can share a plain-English risk checklist for connecting older plant equipment to the cloud.",
      missingInformation: [
        "How close Maya is to connecting her older machines to cloud analytics",
        "Which types of plant equipment she plans to connect first",
      ],
    },
    discussion: {
      why: "A two-way trade: Lucas has the plain-English security checklist Maya needs before connecting older factory machines to the cloud, and Maya can show Lucas what proof a manufacturer actually looks for before approving outside tech spending.",
      forA: {
        heading: "How Factories Approve Tech Spending",
        problem:
          "Lucas wants an honest buyer's view on what proof industrial leaders actually need to see before approving an outside cybersecurity firm for older factory equipment and cloud systems.",
        whyMatch:
          "Maya runs a manufacturing business and uses plant-level business cases and purchasing checkpoints to evaluate and approve technology spending.",
        business:
          "Ask Maya which numbers and proof her plant and purchasing teams need in a business case before they sign off on outside tech spending.",
        life: "How to drop the seller mindset in executive peer groups so you get candid feedback from fellow leaders.",
      },
      forB: {
        heading: "Securing Older Plant Equipment",
        problem:
          "Maya wants to connect older factory equipment to cloud analytics, and she needs to decide which cybersecurity risks to fix first before plugging those machines in.",
        whyMatch:
          "Lucas works on factory and IT security for owner-operated businesses and uses a plain-English risk register to rank what needs fixing first.",
        business:
          "Ask Lucas which risks on his plain-English checklist must be tackled first before connecting older plant machines to the cloud.",
        life: "How to keep plant managers and technical staff on the same page so security precautions don't stall factory upgrades.",
      },
    },
    es: {
      uncertainty:
        "Lucas dirige una empresa de ciberseguridad y Maya preside una fábrica industrial que evalúa conectar maquinaria antigua; conviene confirmar de antemano que la charla será 100% de aprendizaje entre pares y sin ningún enfoque de ventas.",
      forA: {
        benefit:
          "Maya es Presidenta de Westbridge Industrial Manufacturing y puede explicar qué mira un comprador industrial en los casos de negocio de planta antes de aprobar compras de tecnología.",
        shareableReason:
          "Maya preside Westbridge Industrial Manufacturing y puede compartir cómo arman los casos de negocio en planta y qué pasos de compras exigen antes de aprobar gasto en tecnología.",
        missingInformation: [
          "Confirmar que ambos están de acuerdo en tener una charla entre pares sin enfoque comercial",
          "Qué dudas sobre el proceso de aprobación de compras industriales quiere despejar Lucas",
        ],
      },
      forB: {
        benefit:
          "Lucas es CEO de AtlasGrid Technology Group y ha ayudado a plantas industriales a preparar la seguridad de sus máquinas y sistemas usando una lista de riesgos en lenguaje sencillo.",
        shareableReason:
          "Lucas tiene experiencia asegurando equipos de planta y sistemas en AtlasGrid Technology Group y puede compartir un registro de riesgos en lenguaje claro para conectar máquinas antiguas a la nube.",
        missingInformation: [
          "En qué etapa está el proyecto de Maya para conectar sus máquinas a la nube",
          "Qué equipos de la planta entrarían primero en esa conexión",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Lucas tiene la lista de riesgos en lenguaje claro que Maya necesita antes de conectar sus máquinas antiguas a la nube, mientras Maya puede explicarle a Lucas qué pruebas pide una fábrica antes de aprobar una compra tecnológica.",
        forA: {
          heading: "Cómo aprueba compras una fábrica",
          problem:
            "Lucas quiere entender, desde la mirada real de un comprador industrial, qué pruebas necesitan ver antes de aprobar a un proveedor externo de ciberseguridad para equipos antiguos conectados a la nube.",
          whyMatch:
            "Maya dirige una empresa manufacturera y evalúa cada gasto de tecnología con casos de negocio a nivel de planta y pasos claros de aprobación en compras.",
          business:
            "Pregúntale a Maya qué pruebas concretas exigen en su planta y en compras dentro de un caso de negocio antes de aprobar un gasto tecnológico.",
          life: "Cómo dejar de lado el rol de vendedor en grupos de pares para construir confianza y recibir comentarios sinceros.",
        },
        forB: {
          heading: "Seguridad en maquinaria antigua",
          problem:
            "Maya quiere conectar maquinaria antigua de su planta a herramientas de análisis en la nube, pero antes necesita decidir qué riesgos de ciberseguridad debe resolver primero.",
          whyMatch:
            "Lucas ha trabajado preparando la seguridad de máquinas y sistemas en empresas industriales y usa un registro de riesgos en lenguaje simple para ordenar prioridades.",
          business:
            "Pregúntale a Lucas qué riesgos de su lista en lenguaje claro hay que cubrir sí o sí antes de conectar máquinas viejas de planta a la nube.",
          life: "Cómo lograr que el jefe de planta y el equipo técnico hablen el mismo idioma para que la seguridad no frene la modernización.",
        },
      },
    },
  },
  {
    a: "anika.shah@clearwatermedicaloperations.example",
    b: "thomas.bailey@cedarbridgefinancialpartners.example",
    pairScore: 93,
    uncertainty:
      "Check how soon Anika plans to seek financing and which compliance or customer-service reports currently eat up the most time for Thomas's team.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "We may seek financing, and I need to prepare the operating information our board will use. What evidence should it contain, and which decisions should we ask directors to make?",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We introduced risk and performance reviews across clinical sites. I can explain our weekly issue reviews and how we discussed appointment availability and provider utilization.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "Compliance reviews are taking more time. I want board reporting to help us spot service problems and act on them without adding more reporting work for the customer-service team.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We built a shorter board-reporting cycle during growth financing. I can share the risk and action register and explain how we reported service turnaround and compliance findings.",
      },
    ],
    forA: {
      score: 94,
      benefit:
        "Thomas is CEO of Cedarbridge Financial Partners and built a shorter board-reporting routine during growth financing using a simple risk and action tracker.",
      shareableReason:
        "Thomas built a faster board-reporting routine during growth financing at Cedarbridge Financial Partners and can share the risk and action register he used with his directors.",
      missingInformation: [
        "How close Anika is to starting a financing round and who sits on her board today",
        "Which upcoming decisions she needs her board to make",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Anika is CEO of Clearwater Medical Operations and runs weekly site issue reviews that spot appointment and workload bottlenecks early without adding extra paperwork.",
      shareableReason:
        "Anika runs weekly risk and performance reviews across clinical sites at Clearwater Medical Operations and can show how they catch service problems early without extra reporting work.",
      missingInformation: [
        "Which compliance or service reports currently take the most time for Thomas's team to put together",
        "Which customer-service delays Thomas wants his team and board to catch earlier",
      ],
    },
    discussion: {
      why: "A two-way trade: Thomas has the streamlined board report and risk tracker Anika needs as she prepares for financing, and Anika has the weekly issue-review routine Thomas needs to catch service problems without burying his staff in paperwork.",
      forA: {
        heading: "Board Reports for Financing",
        problem:
          "Anika may seek financing soon and needs to prepare the operating numbers her board will rely on. She wants to know what proof to include and which decisions to ask directors to make.",
        whyMatch:
          "Thomas built a shorter board-reporting cycle during his own growth financing and used a simple risk and action register to keep directors focused.",
        business:
          "Ask Thomas how he structured his risk and action register during growth financing and which decisions he asked his board to make.",
        life: "How to keep board prep from taking over your evenings and weekends during a financing process.",
      },
      forB: {
        heading: "Spotting Service Delays Early",
        problem:
          "Compliance reviews are taking more and more time at Thomas's firm. He wants reporting that helps spot and fix customer-service delays without piling extra paperwork onto his customer-service team.",
        whyMatch:
          "Anika runs weekly issue and performance reviews across her clinics that track appointment access and staff workloads so service problems get fixed right away.",
        business:
          "Ask Anika how she runs her weekly clinic issue reviews to catch service bottlenecks early without making frontline staff fill out extra reports.",
        life: "How to keep your leadership team focused on fixing real customer headaches instead of drowning in compliance paperwork.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué tan cerca está Anika de salir a buscar financiamiento y cuáles son los reportes de cumplimiento que hoy le quitan más tiempo al equipo de atención al cliente de Thomas.",
      forA: {
        benefit:
          "Thomas es CEO de Cedarbridge Financial Partners y armó un ciclo más corto de reportes al directorio durante un financiamiento de crecimiento usando un registro claro de riesgos y acciones.",
        shareableReason:
          "Thomas implementó un formato breve de reporte al directorio durante una ronda de financiamiento en Cedarbridge Financial Partners y puede compartir su registro de riesgos y acciones.",
        missingInformation: [
          "En qué etapa está el posible financiamiento de Anika y cómo está compuesto su directorio",
          "Qué decisiones concretas necesita pedirles a los directores en los próximos meses",
        ],
      },
      forB: {
        benefit:
          "Anika es CEO de Clearwater Medical Operations y dirige revisiones semanales de problemas y desempeño en sus clínicas que permiten destrabar demoras de atención sin sumar burocracia.",
        shareableReason:
          "Anika lleva adelante reuniones semanales sobre problemas y tiempos de atención en Clearwater Medical Operations y puede contar cómo detectan cuellos de botella rápido sin cargar de reportes al personal.",
        missingInformation: [
          "Qué informes le insumen hoy más horas de armado al equipo de servicio al cliente de Thomas",
          "Qué demoras concretas de atención quiere Thomas detectar y corregir antes",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Thomas tiene el registro de riesgos y el formato corto de directorio que Anika necesita para su financiamiento, mientras Anika tiene la rutina semanal de revisión de problemas que Thomas busca para detectar fallas de servicio sin sumar papeleo.",
        forA: {
          heading: "Reportes de directorio para financiarse",
          problem:
            "Anika evalúa buscar financiamiento y necesita armar la información operativa que usará su directorio. Quiere definir qué datos incluir y qué decisiones concretas pedirles a los directores.",
          whyMatch:
            "Thomas acortó el ciclo de reportes a su directorio durante un financiamiento de crecimiento apoyándose en un registro directo de riesgos, tiempos de atención y acciones.",
          business:
            "Pregúntale a Thomas qué incluyó en su registro de riesgos y acciones durante su financiamiento y qué decisiones dejó en manos del directorio.",
          life: "Cómo evitar que el armado de informes para el directorio te consuma las noches mientras negocias financiamiento.",
        },
        forB: {
          heading: "Detectar problemas de servicio a tiempo",
          problem:
            "Las revisiones de cumplimiento consumen cada vez más tiempo en la empresa de Thomas. Quiere que los reportes sirvan para detectar y resolver problemas de atención sin pedirle más planillas al equipo de servicio al cliente.",
          whyMatch:
            "Anika dirige reuniones semanales de problemas y desempeño en sus clínicas donde revisan turnos disponibles y carga de los médicos para resolver trabas en el momento.",
          business:
            "Pregúntale a Anika cómo organiza sus revisiones semanales de problemas para detectar demoras de atención sin sumarle trabajo administrativo al equipo.",
          life: "Cómo mantener la atención de tus líderes puesta en destrabar los problemas del cliente en vez de empantanarse en papeles de cumplimiento.",
        },
      },
    },
  },
  {
    a: "jordan.carter@eastbayworkflowlabs.example",
    b: "olivia.grant@luminatehealthservices.example",
    pairScore: 97,
    uncertainty:
      "Check which back-office task Olivia wants to test first with AI and when Jordan's next board meeting is scheduled.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to replace board slides prepared by the founder with a useful operating report. What should directors decide, and what belongs in management reviews?",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We assessed AI trials against financial returns and human oversight. I can share where we required people to review the work.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to trial AI for administrative work without exposing patient information. How should we measure the results and decide whether to expand the trial?",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We changed site reports to make the decisions for the board clearer. I can share our one-page board decision note.",
      },
    ],
    forA: {
      score: 97,
      benefit:
        "Olivia is CEO of Luminate Health Services and replaced long site updates with a one-page board decision note that makes it clear what directors need to decide.",
      shareableReason:
        "Olivia simplified board reporting at Luminate Health Services and can share the one-page board decision note her team uses to separate board votes from management meetings.",
      missingInformation: [
        "Which board decisions Jordan needs his new operating report to cover first",
        "Date of Jordan's next board meeting",
      ],
    },
    forB: {
      score: 97,
      benefit:
        "Jordan is Founder & CEO of Eastbay Workflow Labs and has tested AI projects by measuring actual financial return and setting clear rules for where a person must check the work.",
      shareableReason:
        "Jordan evaluated AI pilots at Eastbay Workflow Labs against financial returns and human-review rules, and can share where they required people to check the work.",
      missingInformation: [
        "Which administrative task Olivia plans to test first with AI",
        "How her team currently tracks time spent and error rates on that task",
      ],
    },
    discussion: {
      why: "A two-way trade: Olivia has the one-page board decision note Jordan needs to replace his founder-built slide decks, and Jordan has the human-review rules and payback checks Olivia needs to test AI safely on admin work.",
      forA: {
        heading: "One-Page Board Decision Notes",
        problem:
          "Jordan wants to stop building board slide decks himself and switch to a useful operating report. He wants to draw a clean line between what directors decide and what stays in management meetings.",
        whyMatch:
          "Olivia reworked her site reports into a one-page board decision note that lays out the exact decisions the board needs to make.",
        business:
          "Ask Olivia how she laid out her one-page board decision note and what she moved out of board meetings into regular management reviews.",
        life: "How to break the founder habit of spending days building custom slide decks before every board meeting.",
      },
      forB: {
        heading: "Testing AI on Admin Work",
        problem:
          "Olivia wants to test AI on back-office administrative work without exposing patient information. She needs a clear way to measure the results and decide if the trial is worth expanding.",
        whyMatch:
          "Jordan evaluated AI trials by tracking real financial payback and setting strict rules on where a person had to review the work.",
        business:
          "Ask Jordan how he measured financial return on his AI trials and where he required a person to review the work before it went out.",
        life: "How to set clear human-review rules for AI experiments so your team feels safe instead of rushed.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué tarea administrativa quiere elegir Olivia para su primera prueba de IA y cuándo es la próxima reunión de directorio de Jordan.",
      forA: {
        benefit:
          "Olivia es CEO de Luminate Health Services y reemplazó los informes largos por una nota de decisión de una página que deja claro qué tiene que resolver el directorio.",
        shareableReason:
          "Olivia simplificó los reportes al directorio en Luminate Health Services y puede compartir su nota de decisión de una página para separar lo que vota el directorio de lo que maneja la gerencia.",
        missingInformation: [
          "Qué decisiones necesita Jordan que su directorio tome con el nuevo reporte",
          "Cuándo es la próxima reunión de directorio de Eastbay Workflow Labs",
        ],
      },
      forB: {
        benefit:
          "Jordan es Fundador y CEO de Eastbay Workflow Labs y evaluó pruebas de IA midiendo su ahorro real en dinero y fijando en qué pasos una persona debe revisar el resultado.",
        shareableReason:
          "Jordan puso a prueba herramientas de IA en Eastbay Workflow Labs midiendo el retorno económico y el control humano, y puede contar en qué puntos exigieron revisión de una persona.",
        missingInformation: [
          "Qué tarea administrativa concreta quiere probar Olivia primero con IA",
          "Cómo miden hoy el tiempo y los errores en esa tarea manual",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Olivia tiene la nota de decisión de una página que Jordan necesita para dejar de armar presentaciones al directorio, mientras Jordan tiene las reglas de revisión humana y retorno económico que Olivia busca para probar IA sin arriesgar datos de pacientes.",
        forA: {
          heading: "Notas de directorio de una página",
          problem:
            "Jordan quiere dejar de armar él mismo las presentaciones de diapositivas para el directorio y reemplazarlas por un reporte operativo útil. Necesita separar qué decide el directorio y qué queda en las reuniones de gerencia.",
          whyMatch:
            "Olivia cambió los reportes de sus sedes por una nota de decisión de una sola página que va directo a lo que el directorio tiene que aprobar.",
          business:
            "Pregúntale a Olivia cómo armó su nota de decisión de una página para el directorio y qué temas sacó de la junta para tratarlos solo entre gerentes.",
          life: "Cómo cortar con la costumbre de fundador de perder días enteros armando diapositivas antes de cada reunión de directorio.",
        },
        forB: {
          heading: "Probar IA en tareas administrativas",
          problem:
            "Olivia quiere probar IA en tareas administrativas sin exponer datos de pacientes. Necesita saber cómo medir los resultados para decidir con criterio si vale la pena ampliar la prueba.",
          whyMatch:
            "Jordan evaluó pruebas de IA comparando el retorno económico real y definiendo exactamente en qué pasos era obligatorio que una persona revisara el trabajo.",
          business:
            "Pregúntale a Jordan cómo midió si las pruebas de IA realmente ahorraban dinero y en qué puntos exigió que una persona revisara el trabajo.",
          life: "Cómo fijar reglas claras de revisión humana al probar IA para que tu equipo trabaje tranquilo en un rubro de salud.",
        },
      },
    },
  },
  {
    a: "jocelyn.bishop@seabrightfacilityservices.example",
    b: "elijah.duarte@baypointadvisorygroup.example",
    pairScore: 90,
    uncertainty:
      "Check which key operating role Jocelyn is handing over next quarter and which everyday decisions still pile up on Elijah's desk for CEO approval.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to prepare someone to take over a critical operating role. Timing: next quarter.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We defined the skills people needed to take on more responsibility.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to decide what needs CEO approval and what managers can decide themselves.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We tested a 90-day handover plan with clear conditions for taking responsibilities back.",
      },
    ],
    forA: {
      score: 91,
      benefit:
        "Elijah is Founder & CEO of Baypoint Advisory Group and tested a 90-day handover plan with clear rules up front for when to take responsibilities back.",
      shareableReason:
        "Elijah tested a 90-day handover plan at Baypoint Advisory Group with clear rules for stepping back in if needed, giving Jocelyn a safe template for next quarter's role handover.",
      missingInformation: [
        "Which operating role Jocelyn is handing over next quarter",
        "Whether she has already picked the person stepping into the job",
      ],
    },
    forB: {
      score: 89,
      benefit:
        "Jocelyn is COO of Seabright Facility Services and spelled out the exact skills people need to show before they earn more decision-making responsibility.",
      shareableReason:
        "Jocelyn defined the specific skills people needed before taking on more responsibility at Seabright Facility Services, helping Elijah draw a clear line between manager calls and CEO approvals.",
      missingInformation: [
        "Which everyday decisions still land on Elijah's desk most often",
        "How soon Elijah wants to roll out new decision limits for his managers",
      ],
    },
    discussion: {
      why: "A two-way trade: Elijah has the 90-day handover plan with clear step-in rules that Jocelyn needs for next quarter, and Jocelyn has the skills checklist Elijah needs to decide what managers can approve without him.",
      forA: {
        heading: "90-Day Role Handover Plan",
        problem:
          "Jocelyn needs to get someone ready to take over a critical operating role next quarter and wants to make sure service doesn't slip during the switch.",
        whyMatch:
          "Elijah tested a 90-day handover plan that included clear, upfront conditions for taking responsibilities back if things went off track.",
        business:
          "Ask Elijah how he laid out his 90-day handover plan and which warning signs meant he had to take a responsibility back.",
        life: "How to hand off a critical job with peace of mind by agreeing up front on what triggers you to step back in.",
      },
      forB: {
        heading: "Setting Manager Decision Limits",
        problem:
          "Elijah wants to draw a clear line between what still needs his approval as CEO and what his managers can decide on their own.",
        whyMatch:
          "Jocelyn mapped out the exact skills people at her company had to prove before taking on bigger responsibilities.",
        business:
          "Ask Jocelyn which practical skills her managers had to prove before she let them make bigger decisions without checking with her.",
        life: "How to stop being the bottleneck on everyday calls by giving managers clear rules for when they don't need your sign-off.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué puesto operativo clave planea entregar Jocelyn el próximo trimestre y qué decisiones siguen pasando todos los días por el escritorio de Elijah.",
      forA: {
        benefit:
          "Elijah es Fundador y CEO de Baypoint Advisory Group y puso a prueba un plan de traspaso de 90 días con reglas claras sobre cuándo volver a tomar el control si algo falla.",
        shareableReason:
          "Elijah probó en Baypoint Advisory Group un plan de traspaso de 90 días con condiciones claras para retomar tareas si hacía falta, ideal para el relevo que Jocelyn prepara para el próximo trimestre.",
        missingInformation: [
          "Qué puesto operativo clave va a delegar Jocelyn el próximo trimestre",
          "Si ya eligió a la persona dentro de su equipo que va a tomar ese rol",
        ],
      },
      forB: {
        benefit:
          "Jocelyn es COO de Seabright Facility Services y definió qué habilidades concretas debe demostrar una persona antes de asumir más responsabilidades.",
        shareableReason:
          "Jocelyn definió en Seabright Facility Services las habilidades necesarias para asumir mayor responsabilidad, lo que ayuda a Elijah a fijar qué pueden decidir sus gerentes sin pedir permiso al CEO.",
        missingInformation: [
          "Qué tipo de decisiones diarias siguen pidiendo hoy la aprobación de Elijah",
          "Cuándo quiere Elijah dejar funcionando los nuevos límites de decisión para sus gerentes",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Elijah tiene el plan de traspaso de 90 días con reglas claras que Jocelyn necesita para el próximo trimestre, mientras Jocelyn definió las habilidades concretas que Elijah busca para saber qué decisiones dejar en manos de sus gerentes.",
        forA: {
          heading: "Plan de traspaso de 90 días",
          problem:
            "Jocelyn quiere preparar a una persona para hacerse cargo de un puesto operativo crítico el próximo trimestre sin que se resienta el servicio.",
          whyMatch:
            "Elijah ya probó un plan de traspaso de 90 días donde dejó pactado desde el primer día bajo qué condiciones volvería a intervenir o retomar una tarea.",
          business:
            "Pregúntale a Elijah cómo estructuró su plan de traspaso de 90 días y qué señales acordó para retomar una responsabilidad si algo no salía bien.",
          life: "Cómo soltar un puesto clave con tranquilidad dejando claro de antemano en qué casos vas a volver a meter mano.",
        },
        forB: {
          heading: "Qué aprueba el CEO y qué no",
          problem:
            "Elijah quiere definir de forma simple qué decisiones necesitan su aprobación como CEO y cuáles pueden tomar los gerentes por su cuenta.",
          whyMatch:
            "Jocelyn dejó por escrito qué habilidades prácticas tenía que demostrar cada persona en su empresa antes de darle más responsabilidad.",
          business:
            "Pregúntale a Jocelyn qué habilidades concretas tuvo que demostrar su gente antes de que ella les soltara decisiones más grandes.",
          life: "Cómo dejar de ser el cuello de botella de todas las consultas diarias dándoles a tus gerentes reglas claras de qué pueden resolver solos.",
        },
      },
    },
  },
  {
    a: "cameron.callahan@newhavenprecisionworks.example",
    b: "jonah.boulos@canyonwoodfacilityservices.example",
    pairScore: 91,
    uncertainty:
      "Check which responsibilities Cameron plans to hand over first in his 12-month plan and which daily habits vary the most across Jonah's locations right now.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to plan a 12-month management handover before we expand. Timing: next quarter.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We made teams use the same definitions for operating measures.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to make day-to-day work more consistent across teams and locations. Timing: within 90 days.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We gave managers responsibility for operating reviews so fewer issues went straight to the founder.",
      },
    ],
    forA: {
      score: 92,
      benefit:
        "Jonah is COO of Canyonwood Facility Services and put his managers in charge of running operating reviews so everyday problems stopped landing on the founder's desk.",
      shareableReason:
        "Jonah handed operating reviews over to his managers at Canyonwood Facility Services so fewer problems went straight to the founder, a direct fit for Cameron's 12-month handover plan.",
      missingInformation: [
        "Which leadership roles are taking on more responsibility in Cameron's 12-month handover plan",
        "Which decisions Cameron still wants to keep during the handover",
      ],
    },
    forB: {
      score: 90,
      benefit:
        "Cameron is Founder & CEO of Newhaven Precision Works and got all of his teams using the same definitions for their operating numbers.",
      shareableReason:
        "Cameron got every team at Newhaven Precision Works using the same definitions for their operating numbers, giving Jonah a simple way to build consistency across locations.",
      missingInformation: [
        "Which daily practices or numbers differ most across Jonah's locations today",
        "Which reports Jonah is thinking of dropping because managers don't use them",
      ],
    },
    discussion: {
      why: "A two-way trade: Jonah has already shifted operating reviews off the founder's plate the way Cameron wants to do over the next 12 months, and Cameron has standardized team metrics the way Jonah needs across his locations.",
      forA: {
        heading: "12-Month Management Handover",
        problem:
          "Cameron wants to map out a 12-month management handover next quarter before expanding, so daily problems stop going straight to the founder.",
        whyMatch:
          "Jonah put his managers in charge of running operating reviews so routine issues get solved at the manager level instead of escalating to the founder.",
        business:
          "Ask Jonah how he put managers in charge of operating reviews and got them to solve problems before bringing them to the founder.",
        life: "How to step back from being the default problem-solver as a founder while keeping your team confident ahead of an expansion.",
      },
      forB: {
        heading: "Consistent Work Across Locations",
        problem:
          "Jonah wants to make day-to-day work much more consistent across his teams and branches within the next 90 days.",
        whyMatch:
          "Cameron got all his teams using the exact same definitions for their operating measures so everyone tracks and judges daily work the same way.",
        business:
          "Ask Cameron which operating numbers he made every team measure the same way and how that changed daily execution.",
        life: "How to get multiple locations working the same way while still letting local managers feel ownership of their teams.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué tareas planea delegar primero Cameron en su plan de 12 meses y qué prácticas diarias cambian más hoy de una sucursal a otra en la operación de Jonah.",
      forA: {
        benefit:
          "Jonah es COO de Canyonwood Facility Services y puso a los gerentes a cargo de las revisiones operativas para que los problemas diarios dejaran de ir directo al fundador.",
        shareableReason:
          "Jonah logró en Canyonwood Facility Services que los gerentes llevaran adelante las revisiones operativas sin depender del fundador, justo lo que Cameron busca para su traspaso de 12 meses.",
        missingInformation: [
          "Qué puestos asumirán más responsabilidad en el plan de traspaso de 12 meses de Cameron",
          "Qué decisiones clave prefiere seguir tomando Cameron durante la transición",
        ],
      },
      forB: {
        benefit:
          "Cameron es Fundador y CEO de Newhaven Precision Works y logró que todos sus equipos midieran sus indicadores operativos exactamente con las mismas definiciones.",
        shareableReason:
          "Cameron unificó cómo se mide cada indicador operativo entre los equipos de Newhaven Precision Works, dándole a Jonah una base concreta para emparejar el trabajo diario entre sedes.",
        missingInformation: [
          "Qué hábitos diarios o números varían más hoy entre los equipos y sucursales de Jonah",
          "Qué indicadores piensa dar de baja Jonah porque hoy nadie los usa para decidir",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Jonah ya logró que los gerentes conduzcan las revisiones operativas sin escalar todo al fundador como busca Cameron, mientras Cameron unificó las métricas entre equipos tal como Jonah necesita hacer en sus sucursales en 90 días.",
        forA: {
          heading: "Traspaso gerencial de 12 meses",
          problem:
            "Cameron quiere armar el próximo trimestre un plan de traspaso gerencial de 12 meses antes de expandirse, para que los problemas diarios dejen de terminar siempre en el fundador.",
          whyMatch:
            "Jonah entregó a sus gerentes la responsabilidad de dirigir las revisiones operativas y logró que mucho menos trabajo escalara directo al fundador.",
          business:
            "Pregúntale a Jonah cómo hizo para que los gerentes se hicieran cargo de las revisiones operativas y resolvieran los problemas entre ellos antes de acudir al fundador.",
          life: "Cómo dejar de ser el bombero de todos los problemas diarios como fundador antes de encarar una expansión.",
        },
        forB: {
          heading: "Trabajo parejo entre sucursales",
          problem:
            "Jonah quiere que el trabajo del día a día sea mucho más parejo entre sus distintos equipos y ubicaciones en los próximos 90 días.",
          whyMatch:
            "Cameron hizo que todos sus equipos usaran exactamente las mismas definiciones para sus números operativos, eliminando las interpretaciones distintas.",
          business:
            "Pregúntale a Cameron qué números operativos obligó a medir igual en todos los equipos y cómo logró que la gente adoptara ese criterio único.",
          life: "Cómo ordenar que todas las sedes trabajen bajo una misma regla sin quitarles a los gerentes locales el orgullo por su equipo.",
        },
      },
    },
  },
  {
    a: "kenji.morgan@eastpointadvisorygroup.example",
    b: "malik.becker@northcoveworkforcesolutions.example",
    pairScore: 92,
    uncertainty:
      "Check which operating role Kenji is handing over in the next six months and which support teams Malik wants to share across a second market.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to prepare someone to take over a critical operating role. Timing: within six months.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We trialled a regional team using shared finance and operating support.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to decide whether we can enter a second market using our existing support teams. Timing: within six months.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We tested a 90-day handover plan with clear conditions for taking responsibilities back.",
      },
    ],
    forA: {
      score: 92,
      benefit:
        "Malik is CEO of Northcove Workforce Solutions and ran a 90-day handover plan with clear rules for taking responsibilities back if things slipped.",
      shareableReason:
        "Malik tested a 90-day handover plan with clear conditions for taking duties back at Northcove Workforce Solutions, giving Kenji a tested way to structure his six-month role handover.",
      missingInformation: [
        "Which operating role Kenji plans to hand over within six months",
        "How he will judge whether clients and staff are comfortable with the new leader",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Kenji is Managing Director of Eastpoint Advisory Group and tested launching a regional team that ran on shared finance and operations support instead of hiring duplicate staff.",
      shareableReason:
        "Kenji trialled a regional team using shared finance and operating support at Eastpoint Advisory Group and can share what worked and where the shared team felt stretched.",
      missingInformation: [
        "Which current support teams Malik hopes to stretch across a second market",
        "What needs to go right in the first quarter for Malik to keep expanding there",
      ],
    },
    discussion: {
      why: "A two-way trade: Malik has the 90-day handover plan with clear fallback rules that Kenji needs for his upcoming role transition, and Kenji has already tested running a new regional team on shared finance and operations support the way Malik wants to.",
      forA: {
        heading: "Handing Over a Key Role",
        problem:
          "Kenji wants to get someone ready to take over a critical operating role within the next six months without risking client work.",
        whyMatch:
          "Malik tested a 90-day handover plan that spelled out clear conditions up front for when he would step back in and take a responsibility back.",
        business:
          "Ask Malik how he structured his 90-day handover trial and which checkpoints decided whether the new person kept full responsibility.",
        life: "How to keep your team and clients calm during a leadership handover by making the checkpoints clear from day one.",
      },
      forB: {
        heading: "Expanding With Shared Support",
        problem:
          "Malik wants to decide within six months if he can enter a second market using his existing finance and operations support teams instead of hiring a separate local back office.",
        whyMatch:
          "Kenji already ran a trial where a regional team relied on shared finance and operations support from the home office.",
        business:
          "Ask Kenji how his regional team shared finance and operations support, and where the central support team started feeling stretched.",
        life: "How to keep your home-office support staff from burning out when you add a second market to their workload.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué puesto operativo clave quiere delegar Kenji en los próximos seis meses y qué áreas de soporte planea compartir Malik para abrir un segundo mercado.",
      forA: {
        benefit:
          "Malik es CEO de Northcove Workforce Solutions y puso a prueba un plan de traspaso de 90 días con condiciones claras para volver a tomar tareas si los resultados bajaban.",
        shareableReason:
          "Malik probó en Northcove Workforce Solutions un plan de traspaso de 90 días con reglas claras sobre cuándo retomar responsabilidades, muy útil para el relevo que prepara Kenji.",
        missingInformation: [
          "Qué rol operativo crítico planea entregar Kenji dentro de los próximos seis meses",
          "Cómo medirá si el equipo y los clientes confían en la persona que asume el puesto",
        ],
      },
      forB: {
        benefit:
          "Kenji es Director General de Eastpoint Advisory Group y puso a prueba un equipo regional apoyado por el mismo equipo central de finanzas y operaciones.",
        shareableReason:
          "Kenji probó operar un equipo regional usando soporte compartido de finanzas y operaciones en Eastpoint Advisory Group, experiencia directa para la decisión de segundo mercado de Malik.",
        missingInformation: [
          "Qué equipos de soporte actuales quiere usar Malik para atender un segundo mercado",
          "Qué resultados espera ver en los primeros meses para saber si el soporte compartido alcanza",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Malik tiene el plan de traspaso de 90 días con reglas claras que Kenji necesita para delegar su puesto operativo, mientras Kenji ya probó abrir un equipo regional con soporte compartido de finanzas y operaciones tal como evalúa hacer Malik.",
        forA: {
          heading: "Delegar un puesto operativo clave",
          problem:
            "Kenji quiere preparar a una persona para que asuma un puesto operativo crítico en los próximos seis meses sin descuidar la operación.",
          whyMatch:
            "Malik probó un plan de traspaso de 90 días con condiciones claras desde el inicio para retomar responsabilidades si algo se salía de cauce.",
          business:
            "Pregúntale a Malik cómo armó los pasos de su traspaso de 90 días y qué condiciones dejó fijadas por si tenía que volver a tomar el mando.",
          life: "Cómo dar tranquilidad a tu equipo y a tus clientes durante un cambio de mando dejando claros los puntos de control desde el primer día.",
        },
        forB: {
          heading: "Abrir mercado con soporte compartido",
          problem:
            "Malik quiere decidir en los próximos seis meses si puede entrar a un segundo mercado usando sus equipos actuales de soporte en lugar de duplicar la administración.",
          whyMatch:
            "Kenji ya hizo la prueba de lanzar un equipo regional apoyándose en el equipo compartido de finanzas y operaciones de la casa central.",
          business:
            "Pregúntale a Kenji cómo organizó el soporte compartido de finanzas y operaciones para su equipo regional y en qué tareas se empezó a notar el límite de capacidad.",
          life: "Cómo cuidar a tu equipo central de soporte para que no se sature en silencio cuando le sumas una nueva región.",
        },
      },
    },
  },
  {
    a: "leah.sanchez@fieldstoneprecisionworks.example",
    b: "fatima.kapur@summitpointworkforcesolutions.example",
    pairScore: 90,
    uncertainty:
      "Check when Leah locks in her next annual plan and which frontline managers at Fatima's company hold the most fragile customer accounts.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to set clear criteria for opening another location. Timing: before the next annual plan is agreed.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We changed workload planning so managers could spot overloaded teams earlier.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to keep frontline managers who hold important customer relationships. Timing: the next two operating reviews.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We set approval criteria before opening a permanent location.",
      },
    ],
    forA: {
      score: 91,
      benefit:
        "Fatima is President of SummitPoint Workforce Solutions and put clear approval rules in place before committing to open a permanent new location.",
      shareableReason:
        "Fatima set clear approval criteria before opening a permanent location at SummitPoint Workforce Solutions, matching what Leah wants to lock in before her next annual plan.",
      missingInformation: [
        "Whether Leah is considering a full manufacturing plant or a smaller satellite shop",
        "When Fieldstone Precision Works finalizes its next annual plan",
      ],
    },
    forB: {
      score: 89,
      benefit:
        "Leah is Founder & CEO of Fieldstone Precision Works and changed workload planning so managers can spot overloaded teams early, before burnout causes turnover.",
      shareableReason:
        "Leah changed workload planning at Fieldstone Precision Works so managers spot overloaded teams earlier, offering a practical way to take pressure off Fatima's key frontline managers.",
      missingInformation: [
        "What is putting the most pressure on Fatima's frontline managers right now",
        "How customer relationships are currently shared or backed up across her teams",
      ],
    },
    discussion: {
      why: "A two-way trade: Fatima has the approval rules Leah needs before adding a new location to her annual plan, and Leah has the early-warning workload planning Fatima needs to keep her best frontline managers from burning out.",
      forA: {
        heading: "Rules for Opening a Location",
        problem:
          "Leah wants to set clear criteria for what has to be true before opening another location, ahead of locking in her next annual plan.",
        whyMatch:
          "Fatima already set strict approval criteria that a market had to pass before her company would commit to opening a permanent location.",
        business:
          "Ask Fatima which approval hurdles had to be met before she signed off on opening a permanent new location.",
        life: "How to make sure your leadership team has enough breathing room before you add another location to oversee.",
      },
      forB: {
        heading: "Keeping Key Frontline Managers",
        problem:
          "Fatima wants to hold on to the frontline managers who carry her most important customer relationships over the next two operating reviews.",
        whyMatch:
          "Leah changed how her team plans workloads so leaders can spot overloaded teams early and step in before people burn out.",
        business:
          "Ask Leah how she changed workload planning so managers could spot overloaded teams early and relieve the pressure.",
        life: "How to hold on to your best frontline managers by fixing their workload before burnout makes them leave.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar cuándo cierra Leah su próximo plan anual y qué gerentes de primera línea en la empresa de Fatima manejan hoy las cuentas de clientes más sensibles.",
      forA: {
        benefit:
          "Fatima es Presidenta de SummitPoint Workforce Solutions y fijó criterios claros de aprobación antes de comprometerse a abrir una sede permanente.",
        shareableReason:
          "Fatima definió reglas de aprobación antes de abrir una ubicación permanente en SummitPoint Workforce Solutions, justo lo que Leah busca definir antes de su plan anual.",
        missingInformation: [
          "Qué tipo de nueva planta o taller evalúa abrir Leah",
          "En qué fecha se cierra el próximo plan anual de Fieldstone Precision Works",
        ],
      },
      forB: {
        benefit:
          "Leah es Fundadora y CEO de Fieldstone Precision Works y cambió la forma de planificar la carga de trabajo para que los gerentes detecten a tiempo cuando un equipo está por saturarse.",
        shareableReason:
          "Leah modificó la planificación de trabajo en Fieldstone Precision Works para detectar equipos sobrecargados con tiempo, una herramienta directa para cuidar y retener a los gerentes de Fatima.",
        missingInformation: [
          "Qué les está generando mayor desgaste hoy a los gerentes de primera línea de Fatima",
          "Qué respaldo tienen hoy las relaciones con los clientes clave si un gerente se va",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Fatima tiene las reglas de aprobación que Leah necesita antes de incluir una nueva sede en su plan anual, mientras Leah tiene el sistema para detectar sobrecarga de trabajo a tiempo que Fatima busca para retener a sus gerentes clave.",
        forA: {
          heading: "Reglas para abrir otra sede",
          problem:
            "Leah quiere dejar definidos criterios claros para decidir cuándo abrir otra ubicación, antes de cerrar su próximo plan anual.",
          whyMatch:
            "Fatima ya implementó requisitos concretos de aprobación antes de comprometer dinero y estructura en una ubicación permanente.",
          business:
            "Pregúntale a Fatima qué condiciones exigió que se cumplieran antes de aprobar la apertura de una sede permanente.",
          life: "Cómo asegurarte de que tu equipo directivo dé abasto antes de sumarle otra planta más para supervisar.",
        },
        forB: {
          heading: "Retener a gerentes con clientes clave",
          problem:
            "Fatima quiere retener durante los próximos dos ciclos de revisión a los gerentes de primera línea que llevan la relación directa con clientes importantes.",
          whyMatch:
            "Leah cambió la planificación de cargas de trabajo en su empresa para que los jefes detectaran equipos saturados mucho antes de que la gente se agote.",
          business:
            "Pregúntale a Leah cómo modificó la planificación de tareas para detectar equipos sobrecargados a tiempo y descomprimir a sus gerentes.",
          life: "Cómo retener a tus mejores gerentes de primera línea aliviando su carga diaria antes de que el cansancio los haga renunciar.",
        },
      },
    },
  },
  {
    a: "talia.duarte@cobaltadvisorygroup.example",
    b: "leah.li@brooklinecommercialbuilders.example",
    pairScore: 95,
    uncertainty:
      "Check whether Talia's 90-day reporting goal is for a deal that already closed or one about to close, and when Leah finalizes her next annual plan.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to make reports comparable after an acquisition while keeping local practices that work. Timing: within 90 days.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We changed workload planning so managers could spot overloaded teams earlier.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to plan staffing and workloads before teams become overloaded. Timing: before the next annual plan is agreed.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We made acquired businesses report consistently while allowing different ways of working.",
      },
    ],
    forA: {
      score: 96,
      benefit:
        "Leah is CEO of Brookline Commercial Builders and got acquired companies reporting their numbers the same way while still letting them keep local work habits that work.",
      shareableReason:
        "Leah got acquired businesses at Brookline Commercial Builders to report numbers consistently while keeping their local ways of working, an exact match for Talia's 90-day goal.",
      missingInformation: [
        "Which numbers Talia needs to line up first across the acquired business within 90 days",
        "Which local working habits are most important to keep so clients see no disruption",
      ],
    },
    forB: {
      score: 94,
      benefit:
        "Talia is CEO of Cobalt Advisory Group and reworked workload planning so managers can spot overloaded teams early, right in line with Leah's staffing goal.",
      shareableReason:
        "Talia changed workload planning at Cobalt Advisory Group so managers spot overloaded teams earlier, directly helping Leah plan staffing before teams get buried.",
      missingInformation: [
        "How Leah currently forecasts project workloads ahead of her annual plan",
        "Which project or field teams are closest to being overloaded right now",
      ],
    },
    discussion: {
      why: "A two-way trade: Leah has already gotten acquired businesses to report consistent numbers without breaking their local work habits, and Talia has built the early-warning workload planning Leah needs before locking in her annual staffing plan.",
      forA: {
        heading: "Comparable Reports After an Acquisition",
        problem:
          "Talia wants to make reports comparable within 90 days of an acquisition without forcing the acquired team to give up local practices that already work.",
        whyMatch:
          "Leah got her acquired businesses to report numbers consistently while letting each one keep its own day-to-day ways of working.",
        business:
          "Ask Leah which reporting numbers she insisted acquired teams line up right away and which local work habits she left alone.",
        life: "How to get clean, comparable numbers from an acquired team without making them feel like headquarters is taking over.",
      },
      forB: {
        heading: "Spotting Team Overload Early",
        problem:
          "Leah wants to plan staffing and workloads ahead of her next annual plan so her project teams don't end up overloaded.",
        whyMatch:
          "Talia changed her workload planning so managers can spot overloaded teams much earlier and rebalance work in time.",
        business:
          "Ask Talia which early warning signs she added to workload planning so managers could catch overloaded teams before they fell behind.",
        life: "How to plan team capacity ahead of the budget cycle instead of scrambling after people are already exhausted.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué reportes necesita emparejar Talia en los próximos 90 días tras la adquisición y en qué fecha cierra Leah su próximo plan anual.",
      forA: {
        benefit:
          "Leah es CEO de Brookline Commercial Builders y logró que las empresas adquiridas reportaran números comparables dejándoles conservar sus propias formas de trabajar.",
        shareableReason:
          "Leah consiguió en Brookline Commercial Builders que los negocios adquiridos reportaran con el mismo criterio sin cambiarles su forma diaria de trabajar, justo lo que Talia busca hacer en 90 días.",
        missingInformation: [
          "Qué indicadores necesita Talia volver comparables en los próximos 90 días",
          "Qué prácticas locales del negocio adquirido quiere proteger para no afectar a los clientes",
        ],
      },
      forB: {
        benefit:
          "Talia es CEO de Cobalt Advisory Group y cambió la planificación de cargas de trabajo para que los gerentes detecten a tiempo cuando un equipo se está saturando.",
        shareableReason:
          "Talia rediseñó la planificación de cargas en Cobalt Advisory Group para ver a tiempo qué equipos están por saturarse, ayudando a Leah a prever personal antes de cerrar su plan anual.",
        missingInformation: [
          "Cómo calcula hoy Brookline Commercial Builders la carga de trabajo y el personal para el año",
          "Qué equipos de obra o proyectos están hoy más cerca de verse sobrepasados",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Leah ya logró que empresas adquiridas reporten con un mismo criterio sin tocar sus costumbres locales como busca Talia, mientras Talia armó la planificación temprana de carga laboral que Leah necesita antes de cerrar su plan anual.",
        forA: {
          heading: "Reportes comparables tras una compra",
          problem:
            "Talia quiere que los reportes sean comparables dentro de los 90 días posteriores a una adquisición, pero manteniendo las prácticas locales que ya funcionan bien.",
          whyMatch:
            "Leah logró que las empresas que adquirió reportaran de forma pareja mientras les permitía seguir trabajando con sus propios métodos locales.",
          business:
            "Pregúntale a Leah qué números exigió que las empresas adquiridas reportaran igual desde el inicio y qué costumbres locales prefirió no tocar.",
          life: "Cómo ordenar los números de una empresa recién comprada sin que sus líderes sientan que les estás quitando autonomía.",
        },
        forB: {
          heading: "Detectar sobrecarga antes del plan anual",
          problem:
            "Leah quiere planificar el personal y repartir la carga de trabajo antes de acordar el próximo plan anual para que los equipos no colapsen a mitad de año.",
          whyMatch:
            "Talia cambió la forma de planificar las cargas de trabajo en su empresa para que los gerentes vieran con anticipación qué equipos estaban por saturarse.",
          business:
            "Pregúntale a Talia qué señales concretas miran sus gerentes en la planificación para detectar a tiempo cuando un equipo está recibiendo demasiado trabajo.",
          life: "Cómo prever el límite de capacidad de tu gente antes de cerrar el presupuesto en vez de reaccionar cuando ya están agotados.",
        },
      },
    },
  },
  {
    a: "emerson.ghosh@meridiancarepartners.example",
    b: "noah.rodriguez@highcrestfacilityservices.example",
    pairScore: 93,
    uncertainty:
      "Check how close Emerson is to closing next quarter's acquisition and how Noah currently tracks projects that are starting to slip on time or profit.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to decide what to change in the first 100 days after an acquisition while keeping customers. Timing: next quarter.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We replaced irregular status meetings with reviews of problems led by the people responsible.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to spot projects that need help before they fall behind or lose profit. Timing: next quarter.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We made a checklist for the first 100 days after an acquisition and a plan to retain managers.",
      },
    ],
    forA: {
      score: 94,
      benefit:
        "Noah is Managing Director of Highcrest Facility Services and built a first-100-days acquisition checklist along with a concrete plan to keep acquired managers on board.",
      shareableReason:
        "Noah built a first-100-days acquisition checklist and manager-retention plan at Highcrest Facility Services, directly matching Emerson's goal for next quarter.",
      missingInformation: [
        "Whether Emerson's acquisition for next quarter is already signed or still in final talks",
        "Which customer-facing habits at the acquired company are most sensitive to change",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Emerson is Founder & CEO of Meridian Care Partners and replaced casual status meetings with focused problem reviews run by the person directly responsible.",
      shareableReason:
        "Emerson replaced irregular status check-ins at Meridian Care Partners with problem reviews led by the people responsible, giving Noah a practical way to catch slipping projects early.",
      missingInformation: [
        "How Noah currently checks project schedules and profit margins across his teams",
        "What usually causes a project at Highcrest Facility Services to fall behind before anyone flags it",
      ],
    },
    discussion: {
      why: "A two-way trade: Noah has the first-100-days acquisition checklist and manager-retention plan Emerson needs for next quarter, and Emerson has the owner-led problem review routine Noah needs to catch slipping projects before they lose money.",
      forA: {
        heading: "First 100 Days After Buying",
        problem:
          "Emerson needs to decide what to change in the first 100 days after an acquisition next quarter while making sure customers and key staff stay put.",
        whyMatch:
          "Noah already put together a checklist for the first 100 days after an acquisition paired with a specific plan to retain the acquired managers.",
        business:
          "Ask Noah which steps he put on his first-100-days checklist and how he kept acquired managers from leaving right after the deal closed.",
        life: "How to keep an acquired team calm and steady during the first three months by being clear about what won't change.",
      },
      forB: {
        heading: "Catching Struggling Projects Early",
        problem:
          "Noah wants to spot projects that need help next quarter before they fall behind schedule or start losing money.",
        whyMatch:
          "Emerson scrapped irregular status meetings and replaced them with problem-solving reviews led directly by the people responsible for the work.",
        business:
          "Ask Emerson how he switched from casual status check-ins to problem reviews led by the project owners, and how early warnings surface now.",
        life: "How to build a culture where project leads speak up early when a job is slipping instead of hiding it until profit is gone.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar en qué etapa está la compra que Emerson planea para el próximo trimestre y cómo sigue hoy Noah el avance y el margen de sus proyectos en curso.",
      forA: {
        benefit:
          "Noah es Director General de Highcrest Facility Services y armó una lista práctica para los primeros 100 días tras una adquisición junto con un plan para retener a los gerentes.",
        shareableReason:
          "Noah creó en Highcrest Facility Services una guía para los primeros 100 días después de comprar una empresa y un plan para retener a sus gerentes, justo lo que Emerson necesita el próximo trimestre.",
        missingInformation: [
          "Qué áreas de la empresa adquirida piensa tocar Emerson en los primeros 100 días",
          "Dónde está el mayor riesgo de perder clientes o gerentes clave durante la transición",
        ],
      },
      forB: {
        benefit:
          "Emerson es Fundador y CEO de Meridian Care Partners y cambió las reuniones irregulares de seguimiento por revisiones centradas en problemas reales lideradas por cada responsable.",
        shareableReason:
          "Emerson reemplazó las charlas informales de avance en Meridian Care Partners por revisiones de problemas conducidas por el responsable directo, dándole a Noah un método para detectar proyectos en riesgo a tiempo.",
        missingInformation: [
          "Cada cuánto revisa hoy Noah los plazos y ganancias de los proyectos activos",
          "En qué parte del trabajo suelen empezar los atrasos antes de que alguien dé la voz de alerta",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Noah tiene la lista de los primeros 100 días y el plan de retención de gerentes que Emerson necesita para su próxima compra, mientras Emerson tiene el formato de revisión de problemas que Noah busca para detectar a tiempo los proyectos que empiezan a perder margen.",
        forA: {
          heading: "Primeros 100 días tras una compra",
          problem:
            "Emerson quiere decidir qué tocar y qué no tocar en los primeros 100 días después de comprar una empresa el próximo trimestre, cuidando de no perder clientes.",
          whyMatch:
            "Noah ya armó una lista paso a paso para los primeros 100 días tras una adquisición junto con un plan concreto para retener a los gerentes que venían con la empresa.",
          business:
            "Pregúntale a Noah qué incluyó en su lista de los primeros 100 días y qué hizo para retener a los gerentes sin que se fueran los clientes.",
          life: "Cómo darles tranquilidad a los líderes de una empresa recién adquirida durante los primeros tres meses dejando claro qué cosas no vas a cambiar.",
        },
        forB: {
          heading: "Detectar proyectos en problemas a tiempo",
          problem:
            "Noah quiere detectar el próximo trimestre qué proyectos necesitan ayuda antes de que se atrasen o empiecen a dar pérdida.",
          whyMatch:
            "Emerson eliminó las reuniones irregulares de estatus y las cambió por revisiones de problemas conducidas directamente por la persona responsable de cada tema.",
          business:
            "Pregúntale a Emerson cómo reemplazó las reuniones de estatus por revisiones de problemas a cargo de cada responsable para que las trabas salgan a la luz a tiempo.",
          life: "Cómo lograr que tus jefes de proyecto pidan ayuda apenas ven un desvío en lugar de ocultarlo hasta que ya se perdió la ganancia.",
        },
      },
    },
  },
  {
    a: "logan.foster@atlasprecisionworks.example",
    b: "jocelyn.price@harborcresthealthsystems.example",
    pairScore: 92,
    uncertainty:
      "Check which shared operating numbers Logan wants his team to agree on and whether Jocelyn's upcoming report is for a funding round or a board governance change.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to agree on a few shared measures and who is responsible for acting on them.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We shortened board reports and focused them on decisions.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to prepare management reports for an upcoming funding or governance decision. Timing: the next two operating reviews.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We replaced irregular status meetings with reviews of problems led by the people responsible.",
      },
    ],
    forA: {
      score: 91,
      benefit:
        "Jocelyn is Owner & CEO of Harborcrest Health Systems and replaced irregular status meetings with problem reviews run directly by the person responsible for acting.",
      shareableReason:
        "Jocelyn replaced hit-or-miss status meetings at Harborcrest Health Systems with problem reviews led by the people responsible, showing how shared numbers lead to clear action.",
      missingInformation: [
        "Which frontline numbers at Atlas Precision Works currently have no single person responsible for acting on them",
        "Where shared rules across teams have helped or gotten in the way of local judgment",
      ],
    },
    forB: {
      score: 93,
      benefit:
        "Logan is President & CEO of Atlas Precision Works and cut his board reports way down so they focus strictly on the decisions that need to be made.",
      shareableReason:
        "Logan shortened board reports at Atlas Precision Works and focused them strictly on decisions, directly helping Jocelyn prepare her reports over the next two operating reviews.",
      missingInformation: [
        "Whether Jocelyn's upcoming report is for outside lenders/investors, a board governance change, or both",
        "Which parts of her current management reports don't actually help make a decision",
      ],
    },
    discussion: {
      why: "A two-way trade: Jocelyn has the owner-led problem review routine Logan needs so shared numbers actually get acted on, and Logan has already trimmed board reports down to clear decisions the way Jocelyn needs for her upcoming funding or governance vote.",
      forA: {
        heading: "Clear Owners for Shared Numbers",
        problem:
          "Logan wants his leadership team to agree on a small set of shared operating numbers and make it crystal clear who is responsible for acting when a number slips.",
        whyMatch:
          "Jocelyn replaced irregular status check-ins with focused problem reviews led directly by the person responsible for fixing the issue.",
        business:
          "Ask Jocelyn how she runs her problem-review meetings so the person who owns a number has to lead the discussion and propose the fix.",
        life: "How to stop being the only person chasing the numbers by making team leads present and solve their own misses.",
      },
      forB: {
        heading: "Short Reports for Board Decisions",
        problem:
          "Jocelyn needs to get her management reports ready over the next two operating reviews to support an upcoming funding or governance decision.",
        whyMatch:
          "Logan cut his board reports way down and rebuilt them so every section points straight to a decision.",
        business:
          "Ask Logan which sections he cut out of his board reports and how he frames each page around a concrete decision.",
        life: "How to cut down report-writing time before a major funding or board decision so you stay focused on running the business.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué indicadores busca acordar Logan entre sus líderes de planta y si el próximo informe que prepara Jocelyn es para levantar fondos o para un cambio en el directorio.",
      forA: {
        benefit:
          "Jocelyn es Propietaria y CEO de Harborcrest Health Systems y cambió las reuniones irregulares de estatus por revisiones de problemas conducidas por la persona responsable de actuar.",
        shareableReason:
          "Jocelyn implementó en Harborcrest Health Systems revisiones de problemas a cargo de cada responsable directo, un formato ideal para que los indicadores compartidos de Logan se traduzcan en acción.",
        missingInformation: [
          "Qué indicadores operativos en Atlas Precision Works no tienen hoy un dueño claro cuando se desvían",
          "En qué temas estandarizar ayudó y en cuáles restó criterio local en la planta",
        ],
      },
      forB: {
        benefit:
          "Logan es Presidente y CEO de Atlas Precision Works y acortó los informes al directorio para que vayan directo a las decisiones que hay que tomar.",
        shareableReason:
          "Logan simplificó los informes al directorio en Atlas Precision Works para centrarlos solo en decisiones concretas, justo lo que Jocelyn necesita armar en sus próximas dos revisiones.",
        missingInformation: [
          "Si el informe que prepara Jocelyn es para una decisión de financiamiento, de directorio o ambas",
          "Qué partes de sus reportes actuales son solo informativas y no ayudan a tomar decisiones",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Jocelyn tiene las revisiones de problemas conducidas por cada responsable que Logan necesita para darle dueño a sus indicadores, mientras Logan ya acortó los reportes de directorio enfocándolos en decisiones tal como Jocelyn busca para sus próximos dos ciclos.",
        forA: {
          heading: "Métricas compartidas con dueño claro",
          problem:
            "Logan quiere ponerse de acuerdo con su equipo en unos pocos números operativos compartidos y dejar claro quién es el responsable de actuar cuando un número da mal.",
          whyMatch:
            "Jocelyn eliminó las reuniones irregulares de estatus y las reemplazó por revisiones de problemas dirigidas por la persona que tiene que resolverlos.",
          business:
            "Pregúntale a Jocelyn cómo organiza sus reuniones de revisión para que el dueño de cada número sea quien explique el problema y traiga la solución.",
          life: "Cómo dejar de ser el único que persigue las planillas haciendo que cada jefe presente y corrija sus propios desvíos.",
        },
        forB: {
          heading: "Reportes cortos para decidir",
          problem:
            "Jocelyn necesita preparar sus reportes de gestión durante las próximas dos revisiones operativas de cara a una decisión importante de financiamiento o directorio.",
          whyMatch:
            "Logan acortó drásticamente sus informes al directorio y los enfocó únicamente en las decisiones que había que tomar.",
          business:
            "Pregúntale a Logan qué información sacó de sus reportes de directorio y cómo arma cada página alrededor de una decisión puntual.",
          life: "Cómo reducir el tiempo perdido armando informes antes de una decisión de financiamiento para no descuidar la operación diaria.",
        },
      },
    },
  },
  {
    a: "jade.rodriguez@brooklineindustrialcomponents.example",
    b: "avery.anderson@valleycrestcarepartners.example",
    pairScore: 89,
    uncertainty:
      "Check which systems Avery is getting ready to connect at Valleycrest Care Partners and which site problems take the longest to reach the right executive at Jade's plants.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to get site problems to the right executive for a quicker decision. Timing: within six months.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We explained technical risks in language executives could use to make decisions.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to review technology and data risks before connecting more systems.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We focused monthly management reviews on a few decisions that needed action.",
      },
    ],
    forA: {
      score: 88,
      benefit:
        "Avery is President of Valleycrest Care Partners and stripped monthly management reviews down to focus only on the few decisions that actually need executive action.",
      shareableReason:
        "Avery focused monthly management reviews at Valleycrest Care Partners on a handful of decisions needing action, giving Jade a simple way to get site problems in front of the right executive faster.",
      missingInformation: [
        "Which types of plant or site problems currently get stuck or go to the wrong person at Brookline Industrial Components",
        "Which reports Jade can drop so executive meetings focus on urgent site calls",
      ],
    },
    forB: {
      score: 90,
      benefit:
        "Jade is Owner & CEO of Brookline Industrial Components and found a straightforward way to explain technical risks in plain language executives can use to make decisions.",
      shareableReason:
        "Jade's team at Brookline Industrial Components translated technical risks into plain language executives could use to make decisions, directly helping Avery review technology and data risks before connecting systems.",
      missingInformation: [
        "Which clinical or back-office systems Avery plans to connect next",
        "Who currently signs off on technology and data risks at Valleycrest Care Partners",
      ],
    },
    discussion: {
      why: "A two-way trade: Avery has the stripped-down management review format Jade needs to get site problems to the right executive faster, and Jade has the plain-English approach Avery needs to weigh technology and data risks before connecting more systems.",
      forA: {
        heading: "Faster Decisions on Site Problems",
        problem:
          "Jade wants site problems to reach the right executive for a quicker decision over the next six months instead of getting lost in routine updates.",
        whyMatch:
          "Avery reshaped monthly management reviews to focus only on a few concrete decisions that needed immediate action.",
        business:
          "Ask Avery how they filtered monthly management reviews down to a few key decisions and routed site problems straight to the leader who could act.",
        life: "How to clear away reporting clutter so your executive team has the bandwidth to jump on urgent site problems fast.",
      },
      forB: {
        heading: "Plain-English Tech Risk Reviews",
        problem:
          "Avery wants to review technology and data risks before connecting more systems across the company.",
        whyMatch:
          "Jade's team translated technical risks into plain, everyday language that executives could actually use to make decisions.",
        business:
          "Ask Jade how she requires technical staff to frame data and system risks in plain language so executives know what decision they are making.",
        life: "How to make technology risk checks a normal, practical leadership habit instead of a confusing IT bottleneck.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué sistemas planea conectar Avery en Valleycrest Care Partners y qué tipo de problemas de planta tardan más en llegar hoy al ejecutivo indicado en la empresa de Jade.",
      forA: {
        benefit:
          "Avery es Presidente de Valleycrest Care Partners y redujo las reuniones mensuales de gestión a unas pocas decisiones concretas que requerían acción inmediata.",
        shareableReason:
          "Avery concentró las revisiones mensuales de Valleycrest Care Partners en unas pocas decisiones que pedían acción, dándole a Jade un modelo simple para que los problemas de planta lleguen rápido a quien decide.",
        missingInformation: [
          "Qué problemas de planta tardan más hoy en llegar al ejecutivo correcto en Brookline Industrial Components",
          "Qué reportes actuales podría eliminar Jade para destrabar las decisiones rápidas",
        ],
      },
      forB: {
        benefit:
          "Jade es Propietaria y CEO de Brookline Industrial Components y logró traducir los riesgos técnicos a un lenguaje claro que los directivos pueden usar para decidir.",
        shareableReason:
          "El equipo de Jade en Brookline Industrial Components explicó los riesgos técnicos en palabras claras para tomar decisiones, justo lo que Avery necesita para revisar riesgos antes de conectar más sistemas.",
        missingInformation: [
          "Qué sistemas clínicos o administrativos planea conectar Avery próximamente",
          "Cómo reparten hoy la responsabilidad sobre datos y tecnología entre sistemas y operaciones",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Avery tiene el formato de revisión mensual enfocado en pocas decisiones que Jade necesita para destrabar problemas de planta más rápido, mientras Jade sabe cómo traducir riesgos técnicos a lenguaje claro tal como Avery busca antes de conectar más sistemas.",
        forA: {
          heading: "Decisiones rápidas ante problemas de planta",
          problem:
            "Jade quiere que en los próximos seis meses los problemas de planta lleguen directo al ejecutivo que corresponde para que las decisiones se tomen más rápido.",
          whyMatch:
            "Avery recortó sus revisiones mensuales de gestión para concentrarlas únicamente en unas pocas decisiones que necesitaban acción inmediata.",
          business:
            "Pregúntale a Avery cómo filtró sus reuniones mensuales para dejar solo las decisiones urgentes y hacer que cada problema llegue directo al ejecutivo que lo resuelve.",
          life: "Cómo limpiar el exceso de reportes informativos para que los directivos tengan tiempo de responder rápido cuando una planta se traba.",
        },
        forB: {
          heading: "Riesgos técnicos en lenguaje claro",
          problem:
            "Avery quiere revisar con cuidado los riesgos tecnológicos y de datos antes de conectar más sistemas dentro de su organización.",
          whyMatch:
            "El equipo de Jade encontró la forma de explicar los riesgos técnicos en un lenguaje llano que cualquier ejecutivo puede entender para tomar decisiones.",
          business:
            "Pregúntale a Jade cómo hace para que su equipo técnico explique los riesgos de sistemas en lenguaje simple y con opciones claras para decidir.",
          life: "Cómo convertir la revisión de riesgos de datos en un hábito gerencial simple que no frene a la operación.",
        },
      },
    },
  },
  {
    a: "jules.turner@seabrightworkforcesolutions.example",
    b: "amir.miller@baypointspecialtycontracting.example",
    pairScore: 95,
    uncertainty:
      "Check which numbers Jules currently looks at each week and which crews or project teams at Amir's company are closest to being overloaded over the next 90 days.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to set up a useful weekly operating review without adding excessive reporting. Timing: within six months.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We changed workload planning so managers could spot overloaded teams earlier.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to plan staffing and workloads before teams become overloaded. Timing: within 90 days.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We replaced irregular status meetings with reviews of problems led by the people responsible.",
      },
    ],
    forA: {
      score: 95,
      benefit:
        "Amir is Founder & CEO of Baypoint Specialty Contracting and replaced irregular status meetings with focused problem reviews led by the people directly responsible.",
      shareableReason:
        "Amir replaced irregular status meetings at Baypoint Specialty Contracting with problem reviews run by the people responsible, giving Jules a lean format for a weekly operating review.",
      missingInformation: [
        "Which numbers Jules currently collects that nobody acts on in weekly meetings",
        "Who currently leads weekly branch or account check-ins at Seabright Workforce Solutions",
      ],
    },
    forB: {
      score: 95,
      benefit:
        "Jules is Managing Director of Seabright Workforce Solutions and reworked workload planning so managers can spot overloaded teams early.",
      shareableReason:
        "Jules changed workload planning at Seabright Workforce Solutions so managers spot overloaded teams earlier, directly matching Amir's 90-day staffing and workload goal.",
      missingInformation: [
        "Which crews or project teams at Baypoint Specialty Contracting are closest to maxing out over the next 90 days",
        "How Amir currently spots upcoming workload spikes before jobs fall behind",
      ],
    },
    discussion: {
      why: "A two-way trade: Amir has the owner-led weekly problem review format Jules wants to set up without adding extra paperwork, and Jules has the early-warning workload planning Amir needs over the next 90 days.",
      forA: {
        heading: "Lean Weekly Operating Reviews",
        problem:
          "Jules wants to set up a useful weekly operating review within six months without piling extra reporting work onto managers.",
        whyMatch:
          "Amir replaced irregular status meetings with short problem reviews led directly by the people responsible for fixing the issue.",
        business:
          "Ask Amir how he keeps his weekly problem reviews focused on action without making managers prepare big status reports.",
        life: "How to keep weekly operating reviews short and practical so managers spend their week leading their teams instead of filling out templates.",
      },
      forB: {
        heading: "Planning Staffing Before Overload",
        problem:
          "Amir wants to plan staffing and workloads over the next 90 days before his crews and technical teams get overloaded.",
        whyMatch:
          "Jules changed workload planning so managers can see overloaded teams early and adjust before people burn out.",
        business:
          "Ask Jules which early warning signs they added to workload planning so managers can spot overloaded teams and shift work in time.",
        life: "How to protect your field and technical leads from constant overload by checking team capacity every week.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué indicadores revisa hoy cada semana Jules en Seabright Workforce Solutions y qué cuadrillas o equipos de Amir están más cerca del límite de carga en los próximos 90 días.",
      forA: {
        benefit:
          "Amir es Fundador y CEO de Baypoint Specialty Contracting y reemplazó las reuniones irregulares de estatus por revisiones de problemas conducidas por los responsables directos.",
        shareableReason:
          "Amir cambió las reuniones de estatus irregulares en Baypoint Specialty Contracting por revisiones de problemas a cargo de cada responsable, dándole a Jules un modelo ágil para su reunión semanal.",
        missingInformation: [
          "Qué reportes actuales en Seabright Workforce Solutions podrían eliminarse porque no generan ninguna decisión",
          "Quién conduce hoy las reuniones semanales de seguimiento en su equipo",
        ],
      },
      forB: {
        benefit:
          "Jules es Director General de Seabright Workforce Solutions y modificó la planificación de cargas de trabajo para que los gerentes detecten equipos saturados con anticipación.",
        shareableReason:
          "Jules rediseñó la planificación de cargas en Seabright Workforce Solutions para detectar a tiempo cuando un equipo está sobrecargado, justo lo que Amir necesita implementar en 90 días.",
        missingInformation: [
          "Qué cuadrillas o supervisores tendrán mayor presión de trabajo en los próximos 90 días en Baypoint Specialty Contracting",
          "Qué señales mira hoy Amir para anticipar picos de trabajo",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Amir tiene el formato de revisión de problemas liderado por cada responsable que Jules busca para su reunión semanal sin sumar reportes, mientras Jules tiene el método para detectar sobrecarga a tiempo que Amir quiere aplicar en 90 días.",
        forA: {
          heading: "Revisión semanal sin exceso de reportes",
          problem:
            "Jules quiere armar en los próximos seis meses una revisión operativa semanal que realmente sirva para decidir, sin llenar a los gerentes de informes extra.",
          whyMatch:
            "Amir eliminó las reuniones irregulares de estatus y las reemplazó por revisiones cortas de problemas conducidas por la persona responsable de resolverlos.",
          business:
            "Pregúntale a Amir cómo estructura sus revisiones de problemas para ir directo a lo que hay que destrabar sin pedir reportes largos.",
          life: "Cómo hacer que la reunión semanal sea corta y útil para que los gerentes pasen la semana en la cancha con su gente y no llenando planillas.",
        },
        forB: {
          heading: "Prever personal antes de saturar equipos",
          problem:
            "Amir quiere planificar la dotación de personal y las cargas de trabajo en los próximos 90 días antes de que sus equipos se vean sobrepasados.",
          whyMatch:
            "Jules cambió la planificación de cargas de trabajo para que los gerentes pudieran ver qué equipos se estaban por saturar mucho antes de llegar al límite.",
          business:
            "Pregúntale a Jules qué indicadores simples sumó a la planificación para que los gerentes detecten equipos sobrecargados a tiempo y repartan el trabajo.",
          life: "Cómo cuidar a tus jefes técnicos y de obra del desgaste crónico revisando la carga real de cada equipo todas las semanas.",
        },
      },
    },
  },
  {
    a: "kenji.kapur@kestrelfoodproducts.example",
    b: "rose.gonzalez@sequoiafacilityservices.example",
    pairScore: 90,
    uncertainty:
      "Check which plant problems at Kestrel Food Products get delayed before reaching the right executive and how many technical specialists Rose is moving into team-manager roles over the next two review cycles.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to get site problems to the right executive for a quicker decision. Timing: the next two operating reviews.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We defined the skills people needed to take on more responsibility.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to help technical specialists become effective team managers. Timing: the next two operating reviews.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We made teams use the same definitions for operating measures.",
      },
    ],
    forA: {
      score: 89,
      benefit:
        "Rose is EVP Operations at Sequoia Facility Services and got all of her teams using the exact same definitions for their operating numbers so site issues are clear right away.",
      shareableReason:
        "Rose got every team at Sequoia Facility Services using the same definitions for their operating measures, helping Kenji make plant reporting clear so problems reach the right executive faster.",
      missingInformation: [
        "Which plant problems at Kestrel Food Products currently take too long to reach the right decision-maker",
        "Where standardized reporting helps versus gets in the way of local plant judgment",
      ],
    },
    forB: {
      score: 91,
      benefit:
        "Kenji is Managing Director of Kestrel Food Products and spelled out the exact skills people need to show before taking on bigger leadership responsibilities.",
      shareableReason:
        "Kenji defined the specific skills people needed before taking on more responsibility at Kestrel Food Products, directly helping Rose turn technical specialists into effective team managers.",
      missingInformation: [
        "How Rose currently judges whether a technical specialist is ready to manage a team",
        "How many specialists she is moving into team-lead roles over the next two operating reviews",
      ],
    },
    discussion: {
      why: "A two-way trade: Rose has standardized operating measures across teams so site problems get spotted and routed fast the way Kenji wants, and Kenji has defined the exact skills checklist Rose needs to turn technical specialists into strong team managers.",
      forA: {
        heading: "Getting Site Problems Solved Faster",
        problem:
          "Kenji wants plant problems to reach the right executive for a faster decision over the next two operating reviews.",
        whyMatch:
          "Rose made all of her teams use the exact same definitions for their operating numbers so problems are reported clearly and routed without debate.",
        business:
          "Ask Rose how getting every team to use the same definitions for their operating numbers helped route site problems to the right leader faster.",
        life: "How to standardize site numbers while still trusting local plant managers to use their own judgment on everyday calls.",
      },
      forB: {
        heading: "Turning Specialists Into Managers",
        problem:
          "Rose wants to help her technical specialists grow into effective team managers over the next two operating reviews.",
        whyMatch:
          "Kenji mapped out the exact people and leadership skills someone needs to prove before taking on more responsibility.",
        business:
          "Ask Kenji which practical skills he requires technical specialists to show before they take on managing a team.",
        life: "How to help newly promoted specialists stop doing all the hands-on work themselves and focus on leading their team.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué problemas de planta en Kestrel Food Products tardan más en llegar hoy al directivo indicado y cuántos especialistas técnicos quiere promover Rose a jefes de equipo en las próximas dos revisiones.",
      forA: {
        benefit:
          "Rose es Vicepresidenta Ejecutiva de Operaciones en Sequoia Facility Services y logró que todos sus equipos usaran las mismas definiciones para medir la operación.",
        shareableReason:
          "Rose unificó las definiciones de los indicadores operativos entre los equipos de Sequoia Facility Services, ayudando a Kenji a que los problemas de planta se entiendan rápido y lleguen al ejecutivo correcto.",
        missingInformation: [
          "Qué tipo de problemas de planta se demoran hoy en llegar a quien toma la decisión en Kestrel Food Products",
          "Dónde ayuda emparejar los reportes y dónde conviene dejar margen al criterio de cada planta",
        ],
      },
      forB: {
        benefit:
          "Kenji es Director General de Kestrel Food Products y dejó definidas las habilidades concretas que una persona debe demostrar antes de asumir más responsabilidad.",
        shareableReason:
          "Kenji definió las habilidades necesarias para asumir mayor responsabilidad en Kestrel Food Products, una guía directa para la meta de Rose de formar a especialistas técnicos como gerentes de equipo.",
        missingInformation: [
          "Qué señales mira hoy Rose para saber si un buen técnico está listo para manejar gente",
          "Qué acompañamiento reciben los nuevos jefes técnicos durante sus primeras revisiones operativas",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Rose ya unificó cómo miden la operación sus equipos para detectar y escalar problemas rápido como busca Kenji, mientras Kenji definió las habilidades paso a paso que Rose necesita para convertir a especialistas técnicos en buenos jefes de equipo.",
        forA: {
          heading: "Escalar problemas de planta más rápido",
          problem:
            "Kenji quiere que, en las próximas dos revisiones operativas, los problemas de planta lleguen directo al ejecutivo que corresponde para decidir más rápido.",
          whyMatch:
            "Rose hizo que todos sus equipos usaran exactamente las mismas definiciones para sus números operativos, evitando confusiones sobre cuándo escalar un problema.",
          business:
            "Pregúntale a Rose cómo logró que todos los equipos midieran igual sus números operativos y cómo eso aceleró que cada problema llegue a quien debe resolverlo.",
          life: "Cómo estandarizar los números que reporta cada planta sin quitarles a los gerentes locales la confianza para decidir en el día a día.",
        },
        forB: {
          heading: "De especialista técnico a jefe de equipo",
          problem:
            "Rose quiere ayudar a sus especialistas técnicos a convertirse en buenos gerentes de equipo durante las próximas dos revisiones operativas.",
          whyMatch:
            "Kenji definió con claridad qué habilidades concretas necesita demostrar una persona antes de asumir más responsabilidad y tener gente a cargo.",
          business:
            "Pregúntale a Kenji qué habilidades prácticas les pide demostrar a los técnicos antes de ponerlos a coordinar un equipo.",
          life: "Cómo ayudar a un técnico recién ascendido a soltar la herramienta para que deje de hacer todo él mismo y empiece a dirigir a su gente.",
        },
      },
    },
  },
  {
    a: "theo.baker@rivertonindustrialcomponents.example",
    b: "rina.yamamoto@eastpointhealthsystems.example",
    pairScore: 91,
    uncertainty:
      "Check which shared numbers Theo wants locked in before his budget decision and where handovers between teams currently break down across Rina's locations.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "I want to agree on a few shared measures and who is responsible for acting on them. Timing: this year, ahead of the budget decision.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "We agreed on handovers and responsibilities before work started.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to make day-to-day work more consistent across teams and locations. Timing: before the next annual plan is agreed.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We replaced irregular status meetings with reviews of problems led by the people responsible.",
      },
    ],
    forA: {
      score: 91,
      benefit:
        "Rina is Owner & CEO of Eastpoint Health Systems and replaced irregular status meetings with problem reviews run directly by the person responsible for acting.",
      shareableReason:
        "Rina replaced irregular status check-ins at Eastpoint Health Systems with problem reviews led by the people responsible, giving Theo a clear way to tie shared numbers to action ahead of his budget decision.",
      missingInformation: [
        "Which shared operating numbers Theo wants agreed before this year's budget decision",
        "How his team currently decides who has to act when a plant or supplier number slips",
      ],
    },
    forB: {
      score: 91,
      benefit:
        "Theo is CEO of Riverton Industrial Components and got his teams to agree up front on handovers and who owns what before any job starts.",
      shareableReason:
        "Theo's team at Riverton Industrial Components agreed on handovers and responsibilities before work started, giving Rina a practical way to make daily execution consistent across locations.",
      missingInformation: [
        "Where daily handoffs between teams or locations break down most often at Eastpoint Health Systems",
        "When Rina locks in her next annual plan",
      ],
    },
    discussion: {
      why: "A two-way trade: Rina has the owner-led problem review routine Theo needs so his shared numbers have clear owners before the budget is set, and Theo has the upfront handover agreements Rina needs to make daily work consistent across her locations.",
      forA: {
        heading: "Shared Numbers With Clear Owners",
        problem:
          "Ahead of this year's budget decision, Theo wants his team to agree on a few shared operating numbers and make it clear who is responsible for acting on each one.",
        whyMatch:
          "Rina replaced irregular status meetings with focused problem reviews led directly by the person responsible for fixing the issue.",
        business:
          "Ask Rina how she tied each shared number to a single owner and how those owners run her problem-review meetings.",
        life: "How to use simple frontline numbers to let managers solve problems themselves instead of escalating every issue to the CEO.",
      },
      forB: {
        heading: "Clear Handovers Across Locations",
        problem:
          "Rina wants to make day-to-day work much more consistent across her teams and locations before locking in her next annual plan.",
        whyMatch:
          "Theo got his teams to agree up front on handovers and responsibilities before work even starts, cutting down on dropped balls between groups.",
        business:
          "Ask Theo how his teams lock in handover rules before work starts and which responsibilities had to be spelled out most clearly.",
        life: "How to standardize handovers across teams and locations while still leaving room for local judgment.",
      },
    },
    es: {
      uncertainty:
        "Conviene confirmar qué indicadores quiere dejar cerrados Theo antes del presupuesto de este año y en qué pases de mano entre equipos se pierde más consistencia hoy en las sedes de Rina.",
      forA: {
        benefit:
          "Rina es Propietaria y CEO de Eastpoint Health Systems y reemplazó las reuniones irregulares de estatus por revisiones de problemas conducidas por la persona responsable de actuar.",
        shareableReason:
          "Rina cambió las reuniones informales de seguimiento en Eastpoint Health Systems por revisiones de problemas dirigidas por cada responsable, ayudando a Theo a definir quién actúa sobre cada indicador antes del presupuesto.",
        missingInformation: [
          "Qué indicadores compartidos quiere acordar Theo antes de cerrar la decisión de presupuesto",
          "Cómo se define hoy en su planta quién tiene que intervenir cuando un número se desvía",
        ],
      },
      forB: {
        benefit:
          "Theo es CEO de Riverton Industrial Components e implementó acuerdos claros sobre pases de mano y responsabilidades antes de que empiece cada trabajo.",
        shareableReason:
          "El equipo de Theo en Riverton Industrial Components dejó acordados los traspasos y responsabilidades antes de arrancar cada trabajo, dándole a Rina un método simple para ordenar el día a día entre sedes.",
        missingInformation: [
          "En qué traspasos entre equipos o sedes ve Rina más diferencias en el trabajo diario",
          "En qué fecha se aprueba el próximo plan anual de Eastpoint Health Systems",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Rina tiene las revisiones de problemas lideradas por cada responsable que Theo necesita para asignar dueños a sus métricas antes del presupuesto, mientras Theo tiene los acuerdos previos de traspaso que Rina busca para dar consistencia diaria entre sus sedes.",
        forA: {
          heading: "Métricas compartidas antes del presupuesto",
          problem:
            "Antes de cerrar el presupuesto de este año, Theo quiere acordar unas pocas medidas operativas compartidas y dejar claro quién es responsable de actuar sobre cada una.",
          whyMatch:
            "Rina reemplazó las reuniones irregulares de estatus por revisiones de problemas conducidas directamente por la persona responsable de resolverlos.",
          business:
            "Pregúntale a Rina cómo asignó un responsable concreto a cada indicador y cómo hace para que esa persona conduzca la revisión cuando hay un problema.",
          life: "Cómo apoyarte en números claros de primera línea para que cada jefe resuelva sus desvíos sin llevar todo al escritorio del CEO.",
        },
        forB: {
          heading: "Acuerdos de traspaso entre equipos",
          problem:
            "Rina quiere que el trabajo del día a día sea más parejo entre sus distintos equipos y ubicaciones antes de cerrar su próximo plan anual.",
          whyMatch:
            "Theo logró que sus equipos acordaran de antemano cómo se entrega el trabajo de un área a otra y quién responde por cada paso antes de empezar.",
          business:
            "Pregúntale a Theo cómo acuerdan los traspasos y responsabilidades antes de arrancar un trabajo para que todos los equipos operen igual.",
          life: "Cómo fijar reglas claras de traspaso entre áreas manteniendo el margen para que cada sede aplique su criterio local.",
        },
      },
    },
  },
  {
    a: "devin.kapur@seabrightenergyservices.example",
    b: "quinn.jackson@ironwoodenergyservices.example",
    pairScore: 92,
    uncertainty:
      "VIP Chair note: automatic matching is turned off on Devin's Chair/Host profile, so an organizer or Wefter needs to introduce them with both sides' approval and a clear no-sales-pitch rule.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "Help participants discuss supplier resilience and procurement without sales pitches.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "Can lead a peer discussion on industrial energy and field-services operations.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to reduce dependence on unreliable suppliers without holding too much extra stock. Timing: next quarter.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We tracked supplier reliability and assigned someone to manage each backup plan.",
      },
    ],
    forA: {
      score: 91,
      benefit:
        "Quinn is President of Ironwood Energy Services and brings hands-on experience tracking supplier reliability and putting one person in charge of each backup supplier plan.",
      shareableReason:
        "Quinn leads Ironwood Energy Services and can share a real operator example of tracking supplier reliability and assigning a clear owner to every backup plan.",
      missingInformation: [
        "Organizer or Wefter coordination and consent from both sides since automatic matching is off for Devin's Chair profile",
        "Which supplier-reliability questions Devin wants to spotlight in the peer discussion",
      ],
    },
    forB: {
      score: 93,
      benefit:
        "Devin is an Executive Coach / Chair with Seabright Energy Services who leads pitch-free peer discussions on supplier reliability, purchasing, and field-services operations.",
      shareableReason:
        "Devin leads pitch-free peer discussions on supplier resilience and industrial energy field services, giving Quinn a seasoned sounding board on cutting supplier risk without piling up inventory.",
      missingInformation: [
        "Which supplies at Ironwood Energy Services cause the biggest trade-off between late deliveries and extra stock",
        "What proof Quinn wants to see before approving a backup supplier next quarter",
      ],
    },
    discussion: {
      why: "A two-way trade: Quinn brings a real energy-services case on tracking supplier reliability and assigning backup-plan owners to ground Devin's peer session, and Devin offers a pitch-free sounding board to help Quinn cut supplier risk next quarter without piling up extra inventory.",
      forA: {
        heading: "Real-World Backup Supplier Examples",
        problem:
          "Devin is leading a pitch-free peer discussion on supplier reliability and purchasing, and wants practical operator examples from industrial energy and field services.",
        whyMatch:
          "Quinn runs an energy-services business where they track supplier delivery reliability and put a specific person in charge of every backup plan.",
        business:
          "Ask Quinn how he tracks supplier reliability and what it looks like day-to-day when one person is assigned to manage each backup plan.",
        life: "How to keep peer roundtable discussions grounded in real operating numbers and completely free of sales pitches.",
      },
      forB: {
        heading: "Cutting Supplier Risk Without Extra Stock",
        problem:
          "Quinn wants to rely less on unpredictable suppliers next quarter without tying up cash in piles of extra inventory.",
        whyMatch:
          "Devin chairs executive peer discussions in industrial energy and field services, helping operators compare how they test and approve backup suppliers.",
        business:
          "Ask Devin how other energy and field-service leaders test backup suppliers so they can cut delivery risk without holding extra stock.",
        life: "How to use an experienced peer chair as an honest sounding board before committing cash to backup suppliers or extra inventory.",
      },
    },
    es: {
      uncertainty:
        "Nota VIP (Chair / Host): el emparejamiento automático está desactivado en el perfil de Devin, por lo que el organizador o Wefter debe coordinar la presentación con el acuerdo de ambos y bajo la regla de cero ventas.",
      forA: {
        benefit:
          "Quinn es Presidente de Ironwood Energy Services y aporta experiencia directa midiendo la puntualidad de sus proveedores y asignando un responsable a cada plan de respaldo.",
        shareableReason:
          "Quinn preside Ironwood Energy Services y puede aportar un caso real sobre cómo medir la confiabilidad de proveedores y poner a un responsable a cargo de cada plan de respaldo.",
        missingInformation: [
          "Coordinación del organizador o Wefter y acuerdo de ambos, ya que el perfil de Chair tiene apagado el emparejamiento automático",
          "Qué preguntas sobre proveedores quiere destacar Devin en su mesa de discusión",
        ],
      },
      forB: {
        benefit:
          "Devin es Executive Coach / Chair vinculado a Seabright Energy Services y modera charlas entre pares libres de ventas sobre proveedores, compras y operaciones de energía y servicios de campo.",
        shareableReason:
          "Devin modera conversaciones entre pares sobre proveedores y operaciones de energía industrial, dándole a Quinn un espacio neutral para evaluar cómo reducir riesgos sin inflar el inventario.",
        missingInformation: [
          "Qué materiales críticos le generan hoy a Quinn el mayor dilema entre demoras de entrega y exceso de stock",
          "Qué pruebas pide hoy Quinn antes de habilitar a un proveedor de respaldo para el próximo trimestre",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Quinn aporta un caso real de energía y servicios de campo con responsables asignados a cada plan de respaldo para la mesa de pares de Devin, mientras Devin le ofrece a Quinn una mirada neutral para reducir su dependencia de proveedores incumplidores sin llenarse de stock.",
        forA: {
          heading: "Caso real de respaldo de proveedores",
          problem:
            "Devin busca facilitar una charla entre pares libre de ventas sobre compras y confiabilidad de proveedores, apoyándose en experiencias reales del sector de energía y servicios de campo.",
          whyMatch:
            "Quinn dirige una empresa de servicios de energía donde miden la puntualidad de cada proveedor y nombran a un responsable concreto para manejar cada plan de contingencia.",
          business:
            "Pregúntale a Quinn cómo mide la confiabilidad de sus proveedores y qué tareas concretas tiene la persona asignada a cada plan de respaldo.",
          life: "Cómo mantener un espacio de conversación entre pares libre de discursos de venta donde los directivos hablen con total franqueza.",
        },
        forB: {
          heading: "Bajar riesgo sin acumular inventario",
          problem:
            "Quinn quiere reducir el próximo trimestre su dependencia de proveedores poco confiables sin inmovilizar capital en inventario extra.",
          whyMatch:
            "Devin coordina mesas de discusión ejecutiva en energía industrial y servicios de campo sobre cómo evaluar compras y proveedores de respaldo.",
          business:
            "Pregúntale a Devin qué pruebas exigen otros líderes de servicios de energía antes de habilitar un proveedor alternativo para no tener que acumular stock de más.",
          life: "Cómo aprovechar la mirada neutral de un Chair ejecutivo para poner a prueba tus planes de suministro antes de comprometer capital.",
        },
      },
    },
  },
  {
    a: "nina.baker@sunridgeworkforcesolutions.example",
    b: "rina.williams@kestrelworkforcesolutions.example",
    pairScore: 88,
    uncertainty:
      "Sponsor / Partner note: automatic matching is turned off on Nina's sponsor profile, so an organizer or Wefter needs to approve and introduce them with a clear agreement that this is a peer conversation with no sales pitch.",
    evidence: [
      {
        who: "a",
        field: "goals",
        quote:
          "Support the event within the sponsorship arrangements agreed with the organizer.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "Can provide general context on multi-site workforce programs and changes in pay rates and customer billing rates.",
      },
      {
        who: "b",
        field: "goals",
        quote:
          "I want to make day-to-day work more consistent across teams and locations. Timing: this year, ahead of the budget decision.",
      },
      {
        who: "b",
        field: "offers",
        quote:
          "We separated the effect of price changes from changes in what customers bought.",
      },
    ],
    forA: {
      score: 88,
      benefit:
        "Rina is COO of Kestrel Workforce Solutions and has practical experience separating price changes from shifts in what customers bought across multiple branches.",
      shareableReason:
        "Rina is COO at Kestrel Workforce Solutions and can share how her team separated the impact of price changes from shifts in what customers bought while running multi-site operations.",
      missingInformation: [
        "Organizer or Wefter approval and agreement from both sides on a pitch-free peer chat since automatic matching is off for sponsors",
        "Which multi-site workforce topics Nina is focusing on within her agreed event role",
      ],
    },
    forB: {
      score: 88,
      benefit:
        "Nina is Managing Partner at Sunridge Workforce Solutions and can share broad market context on multi-site workforce programs and how operators handle changes in pay rates and customer billing rates.",
      shareableReason:
        "Nina can share general market context on multi-site workforce programs and how companies manage shifts in worker pay rates and customer billing rates across locations.",
      missingInformation: [
        "Which daily branch habits Rina wants to make consistent before this year's budget decision",
        "Which frontline numbers Rina has dropped or is thinking of dropping because managers don't act on them",
      ],
    },
    discussion: {
      why: "A two-way trade: Rina can show Nina how an operating COO separates rate changes from shifts in customer mix across branches, and Nina can share broad market context on multi-site workforce programs and pay-versus-billing rate changes ahead of Rina's budget decision.",
      forA: {
        heading: "Separating Price From Customer Mix",
        problem:
          "Within her agreed event sponsorship role, Nina wants to compare notes with operators on how multi-site workforce companies track rate changes versus shifts in customer demand.",
        whyMatch:
          "Rina runs daily operations at a multi-site workforce business and separated the financial impact of price changes from changes in what customers actually bought.",
        business:
          "Ask Rina how her team separated the effect of price changes from changes in what customers bought when reviewing branch results.",
        life: "How to build genuine trust as an event sponsor by swapping practical industry mechanics with zero sales pitch.",
      },
      forB: {
        heading: "Multi-Site Workforce Consistency",
        problem:
          "Rina wants to make day-to-day work more consistent across her teams and locations ahead of this year's budget decision.",
        whyMatch:
          "Nina works across multi-site workforce programs and can share general context on how operators keep branch execution steady when pay rates and billing rates shift.",
        business:
          "Ask Nina how other multi-site workforce programs keep branch habits and pay-to-billing rate reviews consistent across locations.",
        life: "How to keep daily routines consistent across branches while still leaving room for local managers to use their judgment.",
      },
    },
    es: {
      uncertainty:
        "Nota Sponsor / Partner: el emparejamiento automático está desactivado en el perfil de patrocinadora de Nina; el organizador o Wefter debe aprobar y coordinar la presentación asegurando que ambas estén de acuerdo en una charla entre pares sin ventas.",
      forA: {
        benefit:
          "Rina es COO de Kestrel Workforce Solutions y tiene experiencia práctica separando el efecto de los cambios de precios de los cambios en lo que compran los clientes entre varias sucursales.",
        shareableReason:
          "Rina dirige la operación como COO en Kestrel Workforce Solutions y puede contar cómo separaron el impacto de las subas de precios de los cambios en el tipo de servicio que compran los clientes.",
        missingInformation: [
          "Aprobación del organizador o Wefter y confirmación de ambas sobre una charla sin enfoque comercial, ya que el perfil de patrocinador no entra en el emparejamiento automático",
          "Qué temas de fuerza laboral multisede está cubriendo Nina dentro de su rol acordado con el evento",
        ],
      },
      forB: {
        benefit:
          "Nina es Socia Directora en Sunridge Workforce Solutions y puede aportar panorama general sobre programas de personal en múltiples sedes y la relación entre sueldos pagados y tarifas cobradas.",
        shareableReason:
          "Nina puede compartir panorama general sobre programas laborales en múltiples ubicaciones y cómo manejan otras empresas los cambios entre tarifas de pago y facturación.",
        missingInformation: [
          "Qué tareas diarias entre equipos y sucursales quiere emparejar Rina antes de la decisión de presupuesto",
          "Qué indicadores piensa dejar de pedir Rina porque los gerentes no los usan para tomar decisiones",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Rina puede mostrarle a Nina cómo separa en la práctica el efecto de cambios de precios frente a lo que compran los clientes, mientras Nina aporta contexto general sobre programas laborales multisede y tarifas antes de que Rina cierre su presupuesto.",
        forA: {
          heading: "Separar precio de mezcla de compra",
          problem:
            "Dentro del marco acordado con el organizador del evento, Nina busca intercambiar contexto práctico sobre cómo las empresas de personal multisede leen sus variaciones de tarifas y demanda.",
          whyMatch:
            "Rina opera una empresa del mismo rubro y logró separar en sus números el efecto de los cambios de precios de los cambios en lo que realmente compraron los clientes.",
          business:
            "Pregúntale a Rina cómo hizo su equipo para separar el impacto de los cambios de precios de los cambios en lo que compraron los clientes al evaluar cada sucursal.",
          life: "Cómo generar confianza genuina como patrocinador de un evento compartiendo aprendizajes del rubro sin intentar vender nada.",
        },
        forB: {
          heading: "Consistencia entre sucursales laborales",
          problem:
            "Rina quiere que el trabajo del día a día sea más parejo entre sus equipos y ubicaciones antes de tomar la decisión de presupuesto de este año.",
          whyMatch:
            "Nina conoce de cerca programas de fuerza laboral en múltiples sedes y cómo manejan los cambios en sueldos pagados y tarifas facturadas a clientes.",
          business:
            "Pregúntale a Nina cómo logran otros programas laborales con varias sedes mantener criterios parejos entre sucursales cuando cambian los sueldos y las tarifas a clientes.",
          life: "Cómo ordenar el trabajo diario entre varias sucursales dejando espacio para que los gerentes locales usen su propio criterio.",
        },
      },
    },
  },
  {
    a: "jennifer.prichard@vistage.com",
    b: "mika.becker@highcrestpropertypartners.example",
    pairScore: 93,
    uncertainty:
      "Jennifer’s goals are proposed from her event-production leadership role at Vistage Worldwide, Inc. and require confirmation of participation and consent; confirm which upcoming international or regional event cycles overlap with Mika’s 90-day facility investment window.",
    evidence: [
      {
        who: "a",
        field: "summary",
        quote: "Brings experience producing large international gatherings.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "Experience leading event teams and producing executive gatherings. Can discuss event planning, coordinating teams and creating an engaging attendee experience.",
      },
      {
        who: "b",
        field: "goals",
        quote: "I want to decide how much to invest in facilities and support before customer demand is clear. Timing: within 90 days.",
      },
      {
        who: "b",
        field: "offers",
        quote: "We changed workload planning so managers could spot overloaded teams earlier.",
      },
    ],
    forA: {
      score: 94,
      benefit:
        "Mika is Founder & CEO of Highcrest Property Partners and redesigned workload planning so managers spot overloaded teams early before peak project crunches hit.",
      shareableReason:
        "Mika changed team workload planning at Highcrest Property Partners so managers can spot capacity bottlenecks early across busy service cycles.",
      missingInformation: [
        "Confirmation of Jennifer’s participation and consent",
        "Which peak event-production windows create the heaviest strain on Jennifer’s planning teams",
      ],
    },
    forB: {
      score: 92,
      benefit:
        "Jennifer is VP of Events, Member Programs at Vistage Worldwide, Inc. and regularly commits venues, production, and on-site staff ahead of final event attendance numbers.",
      shareableReason:
        "Jennifer leads event production at Vistage Worldwide, Inc. and can share how her teams size upfront venue and on-site support commitments before final attendee demand is locked in.",
      missingInformation: [
        "How far ahead Mika needs to sign facility and support commitments inside her 90-day window",
        "Which fixed versus variable support costs carry the biggest risk for Highcrest Property Partners",
      ],
    },
    discussion: {
      why: "A two-way trade: Mika built early-warning workload planning that helps Jennifer keep event-production teams from burning out during peak conference seasons, while Jennifer commits venues and on-site support months ahead of final attendance numbers—exactly the capacity call Mika faces in the next 90 days.",
      forA: {
        heading: "Spotting Overloaded Event Teams Early",
        problem:
          "Producing Vistage’s year-round calendar of regional summits and large international gatherings creates intense seasonal spikes where event planners and production leads easily get stretched thin.",
        whyMatch:
          "Mika redesigned workload planning at Highcrest Property Partners so managers spot overloaded teams weeks earlier and rebalance assignments before deadlines slip.",
        business:
          "Ask Mika what early workload signals her managers check each week so she can shift event-team capacity before launch crunches hit.",
        life: "How to keep event-production leads from living in permanent crisis mode during back-to-back conference seasons.",
      },
      forB: {
        heading: "Sizing Facilities Before Demand Is Clear",
        problem:
          "Mika needs to decide within 90 days how much to invest upfront in facilities and support staff before customer demand is fully locked in.",
        whyMatch:
          "Jennifer regularly books venues, staging, and on-site event crews for large international Vistage gatherings long before final registration counts arrive.",
        business:
          "Ask Jennifer how she phases venue and on-site support commitments so fixed costs stay protected if final turnout comes in lower than forecast.",
        life: "How to make big upfront capacity calls calmly without second-guessing yourself while demand is still moving.",
      },
    },
    es: {
      uncertainty:
        "Los objetivos de Jennifer son propuestos según su rol en producción de eventos en Vistage Worldwide, Inc. y requieren confirmar participación y consentimiento; conviene validar qué calendarios de eventos coinciden con la decisión a 90 días de Mika.",
      forA: {
        benefit:
          "Mika es fundadora y CEO de Highcrest Property Partners y rediseñó la planificación de carga laboral para que los gerentes detecten a tiempo cuándo un equipo se está sobrecargando.",
        shareableReason:
          "Mika ajustó la planificación de trabajo en Highcrest Property Partners para detectar cuellos de botella de capacidad antes de que lleguen los picos de demanda.",
        missingInformation: [
          "Confirmar la participación y el consentimiento de Jennifer",
          "En qué momentos del calendario anual sufre más carga el equipo de producción de eventos",
        ],
      },
      forB: {
        benefit:
          "Jennifer es VP de Eventos y Programas para Miembros en Vistage Worldwide, Inc. y compromete sedes, producción y personal en sitio antes de conocer la asistencia final.",
        shareableReason:
          "Jennifer dirige la producción de eventos en Vistage Worldwide, Inc. y puede contar cómo dimensionan sedes y equipos de soporte antes de que la demanda final esté confirmada.",
        missingInformation: [
          "Con cuánta anticipación debe comprometer Mika instalaciones y soporte dentro de sus próximos 90 días",
          "Qué costos fijos o de soporte representan el mayor riesgo para Highcrest Property Partners",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Mika creó un sistema temprano para detectar equipos sobrecargados que ayuda a Jennifer en picos de eventos, mientras Jennifer decide reservas de sedes y personal en sitio antes de saber la asistencia final, justo la decisión que Mika enfrenta en 90 días.",
        forA: {
          heading: "Detectar a tiempo sobrecarga en eventos",
          problem:
            "Producir el calendario anual de cumbres regionales y grandes encuentros internacionales en Vistage genera picos fuertes donde los coordinadores y productores pueden saturarse rápido.",
          whyMatch:
            "Mika cambió la planificación de carga en Highcrest Property Partners para que los gerentes detecten equipos saturados con anticipación y redistribuyan tareas a tiempo.",
          business:
            "Pregúntale a Mika qué señales tempranas revisan sus gerentes cada semana para reacomodar capacidad antes de que llegue la fecha del evento.",
          life: "Cómo evitar que el equipo de producción de eventos viva apagando incendios en temporadas seguidas de conferencias.",
        },
        forB: {
          heading: "Dimensionar sedes sin demanda cerrada",
          problem:
            "Mika tiene que decidir en los próximos 90 días cuánto invertir por adelantado en instalaciones y soporte antes de que la demanda de clientes esté clara.",
          whyMatch:
            "Jennifer reserva sedes, montaje y equipos en sitio con meses de anticipación para grandes eventos internacionales de Vistage antes de tener la cifra final de asistentes.",
          business:
            "Pregúntale a Jennifer cómo escalona sus compromisos de sedes y soporte en sitio para no quedar expuesta si la demanda final cambia.",
          life: "Cómo tomar decisiones grandes de capacidad por adelantado con calma mientras la demanda todavía se está moviendo.",
        },
      },
    },
  },
  {
    a: "jennifer.prichard@vistage.com",
    b: "maren.stevens@westhavenwholesalepartners.example",
    pairScore: 91,
    uncertainty:
      "Jennifer’s goals are proposed from her event leadership role at Vistage Worldwide, Inc. and require organizer confirmation of participation and consent; check whether Maren wants to focus on weekly production check-ins or central-versus-field support.",
    evidence: [
      {
        who: "a",
        field: "summary",
        quote: "Leads Vistage’s event team.",
      },
      {
        who: "a",
        field: "offers",
        quote:
          "Experience leading event teams and producing executive gatherings. Can discuss event planning, coordinating teams and creating an engaging attendee experience.",
      },
      {
        who: "b",
        field: "goals",
        quote: "I want to set up a useful weekly operating review without adding excessive reporting. Timing: within six months.",
      },
      {
        who: "b",
        field: "offers",
        quote: "We trialled a regional team using shared finance and operating support.",
      },
    ],
    forA: {
      score: 92,
      benefit:
        "Maren is President of Westhaven Wholesale Partners and tested running a regional team backed by shared central finance and operating support.",
      shareableReason:
        "Maren trialled a regional field team with shared central finance and operating support and can share what worked without duplicating back-office staff.",
      missingInformation: [
        "Confirmation of Jennifer’s participation and consent",
        "Which event-logistics functions Jennifer wants to keep centralized versus delegated to regional crews",
      ],
    },
    forB: {
      score: 90,
      benefit:
        "Jennifer is VP of Events, Member Programs at Vistage Worldwide, Inc. and coordinates multiple production teams working against fixed live-event deadlines.",
      shareableReason:
        "Jennifer leads Vistage’s event teams across multiple production tracks and can share how she keeps weekly logistics check-ins focused without piling on status reports.",
      missingInformation: [
        "Which teams Maren plans to include in her weekly operating review over the next six months",
        "Which recurring delays or reporting bottlenecks Maren wants to cut first",
      ],
    },
    discussion: {
      why: "A two-way trade: Maren already tested running regional teams on shared central finance and operations support, while Jennifer coordinates deadline-driven event production teams through tight weekly reviews without drowning staff in extra reporting.",
      forA: {
        heading: "Supporting Multi-City Field Operations",
        problem:
          "Running multi-city summits and large executive gatherings requires local on-the-ground event execution while keeping vendor contracts, budgets, and core planning centralized.",
        whyMatch:
          "Maren ran a regional team trial supported by shared central finance and operations staff, learning which back-office tasks work centrally and which need local ownership.",
        business:
          "Ask Maren which finance and logistics tasks stayed smooth when shared centrally versus where regional teams needed faster local sign-off.",
        life: "How to lead distributed event crews across cities without feeling pulled into every on-site logistical snag.",
      },
      forB: {
        heading: "Weekly Reviews Without Extra Paperwork",
        problem:
          "Maren wants to launch a useful weekly operating review within six months without burying her managers in long status reports.",
        whyMatch:
          "Jennifer leads event-production teams working against immovable live-event dates, where weekly check-ins have to catch logistics blockers fast without creating busywork.",
        business:
          "Ask Jennifer how her event team structures weekly production check-ins so blockers surface early on a single page instead of in slide decks.",
        life: "How to keep a fast weekly leadership rhythm that gives you confidence on deadlines without micromanaging your team.",
      },
    },
    es: {
      uncertainty:
        "Los objetivos de Jennifer son propuestos según su rol de liderazgo de eventos en Vistage Worldwide, Inc. y requieren confirmar participación y consentimiento; conviene validar si Maren prefiere enfocarse en las revisiones semanales o en el soporte centralizado.",
      forA: {
        benefit:
          "Maren es presidenta de Westhaven Wholesale Partners y probó operar un equipo regional apoyado en finanzas y soporte operativo compartidos desde la sede central.",
        shareableReason:
          "Maren probó trabajar con un equipo regional apoyado en finanzas y operaciones centrales compartidas y puede contar qué funcionó sin duplicar estructura.",
        missingInformation: [
          "Confirmar la participación y el consentimiento de Jennifer",
          "Qué tareas de logística de eventos prefiere mantener centralizadas frente a las que delega en cada ciudad",
        ],
      },
      forB: {
        benefit:
          "Jennifer es VP de Eventos y Programas para Miembros en Vistage Worldwide, Inc. y coordina equipos de producción sujetos a fechas fijas de eventos en vivo.",
        shareableReason:
          "Jennifer dirige equipos de eventos en Vistage y puede compartir cómo mantiene reuniones semanales de logística ágiles sin llenar al equipo de reportes.",
        missingInformation: [
          "Qué áreas quiere incluir Maren en su revisión semanal durante los próximos seis meses",
          "Qué demoras o reportes innecesarios busca eliminar primero",
        ],
      },
      discussion: {
        why: "Un intercambio directo: Maren ya probó apoyar equipos regionales con finanzas y operaciones centrales compartidas, mientras Jennifer coordina equipos de producción de eventos con fechas límite fijas mediante revisiones semanales ágiles y sin exceso de reportes.",
        forA: {
          heading: "Soporte central para equipos en ciudad",
          problem:
            "Producir eventos ejecutivos en distintas ciudades exige ejecución local en sitio mientras se mantienen centralizados los presupuestos, contratos de proveedores y planificación general.",
          whyMatch:
            "Maren probó operar un equipo regional usando soporte compartido de finanzas y operaciones centrales, comprobando qué funciona desde la sede y qué debe resolverse en terreno.",
          business:
            "Pregúntale a Maren qué tareas operativas y financieras funcionaron bien desde el centro y dónde los equipos locales necesitaron mayor autonomía.",
          life: "Cómo liderar equipos de eventos en varias ciudades sin terminar resolviendo cada detalle logístico en persona.",
        },
        forB: {
          heading: "Reuniones semanales sin papeleo extra",
          problem:
            "Maren quiere armar una revisión operativa semanal útil en los próximos seis meses sin cargar a sus gerentes con reportes largos.",
          whyMatch:
            "Jennifer lidera equipos de producción contra fechas inamovibles de eventos en vivo, donde las reuniones semanales deben destrabar problemas rápido sin sumar burocracia.",
          business:
            "Pregúntale a Jennifer cómo organiza las revisiones semanales de producción para detectar bloqueos a tiempo sin pedir presentaciones largas.",
          life: "Cómo sostener un ritmo semanal claro que te dé tranquilidad sobre los plazos sin caer en microgestión.",
        },
      },
    },
  },
];
