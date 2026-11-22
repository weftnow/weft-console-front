import type { MatchDiscussion } from "../match-discussion";
import type { DemoMatch } from "./demo-matches";

export type CuratedDemoMatch = DemoMatch & {
  discussion: MatchDiscussion;
  es: DemoMatch["es"] & { discussion: MatchDiscussion };
};

export const EXECUTIVE_GROWTH_MATCHES: readonly CuratedDemoMatch[] = [
  {
    "a": "sophia.brooks@juniperstrategyservices.example",
    "b": "daniel.price@landmarkworkforceservices.example",
    "pairScore": 95,
    "uncertainty": "We do not yet know Sophia's timeline for opening in Phoenix or how Daniel currently tracks referrals, so it helps to confirm those details early.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "We want to establish an advisory practice in Phoenix without duplicating administrative overhead."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We developed partner referrals without a large outbound sales team. I can share how we tracked where referrals came from and reviewed the resulting engagement margins."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want our founder relationships to become a repeatable source of regional business. How do we tell whether a partner brings new demand or simply gets credit for business we would have won anyway?"
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We opened and staffed workforce-service branches in three states. I can share the measures we used to review a new branch, including fill rate and time from request to start."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Daniel has already opened branches across three states without bloated overhead, and Sophia has already built the exact partner-referral tracking Daniel needs now.",
      "forA": {
        "heading": "Opening a New Office",
        "problem": "Sophia wants to open a Phoenix office for Juniper Strategy Services without doubling her administrative costs.",
        "whyMatch": "Daniel already opened and staffed branches in three states at Landmark Workforce Services. He uses simple early numbers—like fill rate and time to start—before adding local admin staff.",
        "business": "Ask Daniel which early numbers he checks at a new branch before adding local office staff.",
        "life": "How to launch a new regional office without pulling your focus away from your main team."
      },
      "forB": {
        "heading": "Tracking Partner Referrals",
        "problem": "Daniel wants his founder relationships at Landmark Workforce Services to bring in steady regional work, and he needs to know if a partner is bringing real new business or just taking credit for deals he would have won anyway.",
        "whyMatch": "Sophia built a steady partner-referral channel at Juniper Strategy Services without a big sales team. She tracks exactly where each referral comes from and how profitable the project turns out to be.",
        "business": "Ask Sophia how she tracks where referrals come from and checks if those projects actually make a good profit.",
        "life": "How to turn the CEO's personal contacts into a referral routine the rest of the team can run."
      }
    },
    "forA": {
      "score": 94,
      "benefit": "Daniel has opened and staffed branches across three states and can share the simple numbers he checks before adding local office overhead.",
      "shareableReason": "Daniel leads Landmark Workforce Services and can share how he judged new branches across three states while keeping admin costs lean.",
      "missingInformation": [
        "When Sophia wants to open the Phoenix office",
        "Which back-office tasks Juniper Strategy Services plans to keep at headquarters"
      ]
    },
    "forB": {
      "score": 96,
      "benefit": "Sophia built a steady partner-referral channel at Juniper Strategy Services without a big sales team and tracks both referral sources and project profit.",
      "shareableReason": "Sophia runs Juniper Strategy Services and has hands-on experience tracking where partner referrals come from and how much profit they bring in.",
      "missingInformation": [
        "How Landmark Workforce Services currently counts a deal as partner-referred",
        "Whether Daniel already has a formal partner program or is starting fresh"
      ]
    },
    "es": {
      "uncertainty": "Aún no sabemos la fecha en que Sophia planea abrir en Phoenix ni cómo registra hoy Daniel sus referidos, así que conviene confirmarlo al inicio.",
      "discussion": {
        "why": "Un intercambio directo: Daniel ya abrió sucursales en tres estados cuidando los costos administrativos, y Sophia ya creó el sistema para medir referidos de socios que Daniel busca ahora.",
        "forA": {
          "heading": "Abrir una nueva oficina",
          "problem": "Sophia quiere abrir una oficina de consultoría en Phoenix para Juniper Strategy Services sin duplicar sus gastos administrativos.",
          "whyMatch": "Daniel ya abrió y formó equipos en sucursales de tres estados en Landmark Workforce Services. Revisa indicadores sencillos al inicio antes de sumar personal administrativo local.",
          "business": "Pregúntale a Daniel qué indicadores revisa en una sucursal nueva antes de contratar personal administrativo local.",
          "life": "Cómo abrir una oficina en otra ciudad sin descuidar al equipo de tu sede principal."
        },
        "forB": {
          "heading": "Medir referidos de socios",
          "problem": "Daniel quiere que sus relaciones como fundador en Landmark Workforce Services generen negocios regionales constantes, y necesita saber si un socio trae clientes realmente nuevos o solo se lleva el crédito por ventas que habrían llegado solas.",
          "whyMatch": "Sophia construyó un canal constante de referidos de socios en Juniper Strategy Services sin un gran equipo de ventas. Registra de dónde viene cada referido y qué margen deja cada proyecto.",
          "business": "Pregúntale a Sophia cómo registra el origen de cada referido y cómo verifica si esos proyectos dejan buena ganancia.",
          "life": "Cómo convertir los contactos personales del CEO en un sistema de referidos que el equipo pueda operar."
        }
      },
      "forA": {
        "benefit": "Daniel ha abierto sucursales en tres estados y puede compartir qué números revisa en cada plaza nueva antes de sumar gastos administrativos locales.",
        "shareableReason": "Daniel dirige Landmark Workforce Services y puede contar cómo evaluó el arranque de nuevas sucursales en tres estados sin inflar la estructura.",
        "missingInformation": [
          "En qué etapa está el plan de Sophia para abrir en Phoenix",
          "Qué tareas administrativas planea mantener centralizadas Juniper Strategy Services"
        ]
      },
      "forB": {
        "benefit": "Sophia desarrolló un canal de referidos de socios en Juniper Strategy Services sin un gran equipo de ventas y mide tanto el origen como la ganancia de cada proyecto.",
        "shareableReason": "Sophia lidera Juniper Strategy Services y tiene experiencia práctica midiendo de dónde vienen los referidos de socios y qué ganancia real dejan.",
        "missingInformation": [
          "Cómo define hoy Landmark Workforce Services que un cliente llegó gracias a un socio",
          "Si Daniel ya tiene un esquema formal de referidos o lo está diseñando"
        ]
      }
    }
  },
  {
    "a": "madison.lee@verdantkitchenproducts.example",
    "b": "omar.haddad@bluewaterwholesalepartners.example",
    "pairScore": 94,
    "uncertainty": "Madison makes packaged foods while Omar distributes technical wholesale lines, so it helps to confirm how closely their seasonal demand swings compare.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "We want to add two regional wholesale channels, but promotional demand already makes production planning difficult. What service performance should we require before expanding distribution?"
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We stabilized peak-season output by changing labor planning. I can explain the changes, how responsibilities were assigned when problems arose, and how we reviewed yield losses and margin by product."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "We carry a wide assortment, and slow-moving products tie up cash. I need to decide what to reduce without leaving regional dealers short. How can we distinguish seasonal demand from products that no longer earn their place?"
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We expanded regional wholesale channels while improving the economics of our assortment. I can share our process for bringing on a channel and reviewing cash conversion and margin by product."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Omar has already added regional wholesale channels without losing control of cash and margins, and Madison already knows how to tell true seasonal demand from underperforming products.",
      "forA": {
        "heading": "Adding Wholesale Channels",
        "problem": "Madison wants to add two regional wholesale channels at Verdant Kitchen Products, but promotional spikes already strain production and she needs to know when her operation is ready for more volume.",
        "whyMatch": "Omar already expanded into new regional wholesale channels at Bluewater Wholesale Partners while keeping a tight watch on product margins and how fast inventory turns back into cash.",
        "business": "Ask Omar which delivery and profit standards he requires before taking on a new wholesale channel.",
        "life": "How to keep roles crystal clear across production and shipping when big orders hit."
      },
      "forB": {
        "heading": "Cutting Slow-Moving Inventory",
        "problem": "Omar carries a huge product line at Bluewater Wholesale Partners where slow-moving items tie up cash, and he wants to cut weak products without leaving regional dealers short on seasonal items.",
        "whyMatch": "Madison manages heavy seasonal and promotional swings at Verdant Kitchen Products. She reviews waste and profit margin product by product so she knows which items still earn their spot.",
        "business": "Ask Madison how she tracks product margins and seasonal swings to tell which items are worth keeping.",
        "life": "How to help your team let go of old product lines without worrying about pushback from long-time dealers."
      }
    },
    "forA": {
      "score": 95,
      "benefit": "Omar has added regional wholesale channels at Bluewater Wholesale Partners and can share how he brings on a new channel while protecting cash flow and product margins.",
      "shareableReason": "Omar leads Bluewater Wholesale Partners and can walk through the checklist and product profit reviews he used when adding regional wholesale channels.",
      "missingInformation": [
        "Current on-time delivery rate at Verdant Kitchen Products",
        "Delivery rules required by the two new wholesale channels Madison is eyeing"
      ]
    },
    "forB": {
      "score": 93,
      "benefit": "Madison handles sharp seasonal and promotional spikes at Verdant Kitchen Products and can explain how she reviews product margins and waste to see what truly performs.",
      "shareableReason": "Madison runs Verdant Kitchen Products and has practical experience reviewing product-by-product margins and peak-season demand.",
      "missingInformation": [
        "Which product lines tie up the most cash at Bluewater Wholesale Partners",
        "Stock promises Omar has made to his regional dealers"
      ]
    },
    "es": {
      "uncertainty": "Madison produce alimentos empacados y Omar distribuye líneas mayoristas técnicas, por lo que conviene confirmar qué tan parecidos son sus ciclos de demanda estacional.",
      "discussion": {
        "why": "Un intercambio directo: Omar ya sumó canales mayoristas regionales cuidando la caja y el margen, y Madison ya sabe cómo distinguir la demanda estacional de los productos que no rinden.",
        "forA": {
          "heading": "Sumar canales mayoristas",
          "problem": "Madison quiere abrir dos canales mayoristas regionales en Verdant Kitchen Products, pero los picos por promociones ya complican la producción y necesita saber qué nivel de cumplimiento exigir antes de crecer.",
          "whyMatch": "Omar ya expandió canales mayoristas regionales en Bluewater Wholesale Partners revisando de cerca el margen por producto y qué tan rápido el inventario se convierte en efectivo.",
          "business": "Pregúntale a Omar qué niveles de entrega y rentabilidad exige antes de abrir un nuevo canal mayorista.",
          "life": "Cómo mantener claras las responsabilidades en planta y entregas cuando se disparan los pedidos."
        },
        "forB": {
          "heading": "Depurar productos lentos",
          "problem": "Omar maneja un catálogo muy amplio en Bluewater Wholesale Partners donde los productos lentos inmovilizan efectivo, y necesita recortar lo que no rota sin dejar sin stock estacional a sus distribuidores.",
          "whyMatch": "Madison maneja fuertes picos estacionales en Verdant Kitchen Products. Revisa mermas y márgenes producto por producto para saber cuáles realmente justifican su lugar.",
          "business": "Pregúntale a Madison cómo revisa el margen por producto y la demanda de temporada alta para decidir qué artículos conservar.",
          "life": "Cómo ayudar a tu equipo comercial a soltar líneas antiguas sin temor a la reacción de los distribuidores."
        }
      },
      "forA": {
        "benefit": "Omar ha abierto canales mayoristas regionales en Bluewater Wholesale Partners y puede compartir cómo incorpora un canal cuidando el efectivo y el margen de cada producto.",
        "shareableReason": "Omar dirige Bluewater Wholesale Partners y puede explicar qué revisó antes de abrir nuevos canales mayoristas regionales.",
        "missingInformation": [
          "Nivel actual de cumplimiento de entregas en Verdant Kitchen Products",
          "Exigencias de entrega de los dos canales mayoristas que Madison quiere sumar"
        ]
      },
      "forB": {
        "benefit": "Madison gestiona fuertes picos estacionales en Verdant Kitchen Products y puede explicar cómo revisa mermas y márgenes por producto para identificar lo que sí es rentable.",
        "shareableReason": "Madison lidera Verdant Kitchen Products y aporta experiencia práctica revisando márgenes por producto y demanda estacional.",
        "missingInformation": [
          "Qué líneas de producto retienen más efectivo en Bluewater Wholesale Partners",
          "Qué compromisos de inventario tiene Omar con sus distribuidores regionales"
        ]
      }
    }
  },
  {
    "a": "grace.lin@cayennearchitecturegroup.example",
    "b": "samuel.porter@helioengineeringconsultants.example",
    "pairScore": 96,
    "uncertainty": "We do not yet know when Grace plans to roll out advisory pricing or how much budget responsibility Samuel wants his senior engineers to take on first.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want more of our one-off design projects to become ongoing advisory work. How should we price that work so clients pay for advice, not just hours?"
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We built a mentoring and promotion path for senior technical staff. I can share how we planned workload and staff capacity."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want senior engineers to take responsibility for client relationships and the financial performance of a practice. How do we judge when they are ready?"
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We turned specialist projects into advisory contracts lasting several years. I can explain how we structured that change."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Samuel has already turned one-off projects into multi-year advisory contracts, and Grace has already built the mentoring and promotion path Samuel needs for his senior engineers.",
      "forA": {
        "heading": "Pricing Ongoing Advisory Work",
        "problem": "Grace wants to turn more of Cayenne Architecture Group's one-time design projects into ongoing advisory relationships, and she wants clients to pay for expert advice rather than billable hours.",
        "whyMatch": "Samuel already made this exact shift at Helio Engineering Consultants, turning specialist engineering projects into multi-year advisory contracts.",
        "business": "Ask Samuel how he structured and priced his multi-year advisory contracts so clients stopped paying by the hour.",
        "life": "How to step back from selling every single project yourself so you have time for long-term client relationships."
      },
      "forB": {
        "heading": "Developing Senior Technical Leaders",
        "problem": "Samuel wants senior engineers at Helio Engineering Consultants to take ownership of client relationships and practice budgets, and he needs a clear way to know when someone is ready.",
        "whyMatch": "Grace built a clear mentoring and promotion path for senior technical staff at Cayenne Architecture Group, paired with workload planning so rising leaders have room to step up.",
        "business": "Ask Grace how she uses her mentoring path and workload planning to tell when senior technical staff are ready to lead.",
        "life": "How to help technical experts make the leap from doing the hands-on work to leading clients and budgets."
      }
    },
    "forA": {
      "score": 97,
      "benefit": "Samuel has turned one-off specialist projects into multi-year advisory contracts at Helio Engineering Consultants and can explain exactly how he structured and priced them.",
      "shareableReason": "Samuel leads Helio Engineering Consultants and has already moved clients from one-off projects to multi-year advisory contracts, matching Grace's exact goal.",
      "missingInformation": [
        "Which design services Grace wants to turn into ongoing advisory work first",
        "When she hopes to roll out the new pricing"
      ]
    },
    "forB": {
      "score": 95,
      "benefit": "Grace built a mentoring and promotion path for senior technical staff at Cayenne Architecture Group and can share how she freed up their workload to take on leadership.",
      "shareableReason": "Grace founded Cayenne Architecture Group and created a practical promotion and workload-planning path for senior technical leaders.",
      "missingInformation": [
        "Which client and budget decisions Samuel wants his senior engineers to handle first",
        "How many senior engineers he is preparing for practice leadership right now"
      ]
    },
    "es": {
      "uncertainty": "Conviene confirmar cuándo planea Grace lanzar sus precios de asesoría continua y qué decisiones financieras quiere Samuel delegar primero en sus ingenieros sénior.",
      "discussion": {
        "why": "Un intercambio directo: Samuel ya convirtió proyectos puntuales en contratos de asesoría de varios años, y Grace ya creó la ruta de mentoría y promoción que Samuel necesita para sus ingenieros sénior.",
        "forA": {
          "heading": "Cobrar por asesoría continua",
          "problem": "Grace quiere que más proyectos puntuales de diseño en Cayenne Architecture Group se conviertan en asesoría continua, cobrando por el valor del consejo y no por horas trabajadas.",
          "whyMatch": "Samuel ya logró este cambio en Helio Engineering Consultants, transformando proyectos técnicos puntuales en contratos de asesoría de varios años.",
          "business": "Pregúntale a Samuel cómo armó y puso precio a sus contratos de asesoría de varios años para dejar de cobrar por hora.",
          "life": "Cómo dejar de vender cada proyecto personalmente para dedicar tiempo a relaciones de largo plazo con los clientes."
        },
        "forB": {
          "heading": "Formar líderes técnicos sénior",
          "problem": "Samuel quiere que los ingenieros sénior de Helio Engineering Consultants se hagan cargo de la relación con clientes y de los números de su área, y necesita saber cómo evaluar si ya están listos.",
          "whyMatch": "Grace creó un camino claro de mentoría y ascenso para el personal técnico sénior en Cayenne Architecture Group, ajustando sus cargas de trabajo para que puedan asumir liderazgo.",
          "business": "Pregúntale a Grace cómo usa la mentoría y la planificación de carga de trabajo para saber cuándo un especialista está listo para liderar.",
          "life": "Cómo acompañar a expertos técnicos para que pasen de hacer todo el trabajo ellos mismos a liderar clientes y presupuestos."
        }
      },
      "forA": {
        "benefit": "Samuel convirtió proyectos de ingeniería puntuales en contratos de asesoría de varios años en Helio Engineering Consultants y puede explicar cómo los estructuró y cotizó.",
        "shareableReason": "Samuel dirige Helio Engineering Consultants y ya transformó proyectos sueltos en contratos de asesoría plurianuales, justo lo que busca Grace.",
        "missingInformation": [
          "Qué servicios de arquitectura quiere Grace ofrecer primero como asesoría continua",
          "Cuándo planea presentar el nuevo esquema de precios"
        ]
      },
      "forB": {
        "benefit": "Grace diseñó una ruta de mentoría y promoción para personal técnico sénior en Cayenne Architecture Group y puede contar cómo organizó su tiempo y carga de trabajo.",
        "shareableReason": "Grace fundó Cayenne Architecture Group y creó un sistema práctico de mentoría y planificación de capacidad para desarrollar líderes técnicos.",
        "missingInformation": [
          "Qué decisiones de clientes y presupuesto quiere Samuel entregar primero a sus ingenieros sénior",
          "Cuántos ingenieros sénior se están preparando hoy para liderar una práctica"
        ]
      }
    }
  },
  {
    "a": "lucia.grant@northbrookfoodproducts.example",
    "b": "nathan.huang@arrowheadworkforcesolutions.example",
    "pairScore": 92,
    "uncertainty": "Both run San Diego companies in different industries—food production and workforce staffing—so it helps to confirm their timelines for price changes and referral handoffs.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to raise prices on low-margin work while keeping valuable customers."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We documented how the sales team should handle referrals so they no longer depended on the founder."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to get regular partner referrals beyond the founder's personal contacts."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We tracked what changed each customer's margin and revised when exceptions needed approval."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Nathan has already tightened customer margin tracking and discount approvals, and Lucia has already trained her sales team to handle partner referrals without the founder.",
      "forA": {
        "heading": "Raising Prices Without Losing Clients",
        "problem": "Lucia wants to raise prices on low-margin work at Northbrook Food Products without losing her best customers.",
        "whyMatch": "Nathan already tackled this at Arrowhead Workforce Solutions. He tracked what was hurting each customer's profit margin and set clear rules for when discounts or exceptions need approval.",
        "business": "Ask Nathan how he tracks what hurts a customer's margin and which discount requests require his approval.",
        "life": "How to back up your account managers so they hold firm on prices instead of sending every complaint to the CEO."
      },
      "forB": {
        "heading": "Team-Run Partner Referrals",
        "problem": "Nathan wants regular partner referrals at Arrowhead Workforce Solutions that do not depend on his personal contacts alone.",
        "whyMatch": "Lucia already solved this at Northbrook Food Products. She wrote a clear playbook so her sales team handles partner referrals on their own without relying on her.",
        "business": "Ask Lucia how she trained her sales team to take over partner referrals from the founder.",
        "life": "How to stop being the only person bringing in partner business so your sales team owns those relationships."
      }
    },
    "forA": {
      "score": 93,
      "benefit": "Nathan tracked what changed each customer's profit margin at Arrowhead Workforce Solutions and tightened the rules on when price exceptions need approval.",
      "shareableReason": "Nathan leads Arrowhead Workforce Solutions and can share how he tracked customer margins and set clear discount rules, helping Lucia raise prices carefully.",
      "missingInformation": [
        "Current profit margins on Northbrook Food Products' lowest-margin accounts",
        "Which customer contracts come up for price review next"
      ]
    },
    "forB": {
      "score": 91,
      "benefit": "Lucia wrote down a clear process at Northbrook Food Products so her sales team handles partner referrals without depending on the founder.",
      "shareableReason": "Lucia is CEO of Northbrook Food Products and can explain how she handed partner referrals over to her sales team, matching Nathan's referral goal.",
      "missingInformation": [
        "Which types of partners Arrowhead Workforce Solutions wants referrals from",
        "How Nathan's sales team currently follows up on warm introductions"
      ]
    },
    "es": {
      "uncertainty": "Ambos dirigen empresas en San Diego en giros distintos (alimentos y personal), por lo que conviene confirmar sus fechas para ajustar precios y delegar referidos.",
      "discussion": {
        "why": "Un intercambio directo: Nathan ya ordenó el control de márgenes por cliente y la aprobación de descuentos, y Lucia ya logró que su equipo de ventas gestione los referidos sin depender de ella.",
        "forA": {
          "heading": "Subir precios cuidando clientes",
          "problem": "Lucia quiere subir precios en los trabajos de bajo margen de Northbrook Food Products sin perder a sus clientes valiosos.",
          "whyMatch": "Nathan ya resolvió esto en Arrowhead Workforce Solutions. Midió qué reducía el margen de cada cliente y puso reglas claras sobre cuándo una excepción de precio necesita aprobación.",
          "business": "Pregúntale a Nathan cómo detecta qué baja el margen de un cliente y cuándo exige que un descuento pase por su aprobación.",
          "life": "Cómo dar seguridad a tu equipo comercial para defender los precios sin que cada queja termine en tu escritorio."
        },
        "forB": {
          "heading": "Referidos manejados por el equipo",
          "problem": "Nathan quiere recibir referidos constantes de socios en Arrowhead Workforce Solutions más allá de sus contactos personales como fundador.",
          "whyMatch": "Lucia ya logró esto en Northbrook Food Products. Documentó un proceso sencillo para que su equipo de ventas atienda y cierre los referidos sin depender de ella.",
          "business": "Pregúntale a Lucia cómo preparó a su equipo de ventas para hacerse cargo de los referidos de socios.",
          "life": "Cómo dejar de ser la única persona que trae negocios por alianzas para que tu equipo comercial sea dueño de esas relaciones."
        }
      },
      "forA": {
        "benefit": "Nathan midió qué cambiaba el margen de cada cliente en Arrowhead Workforce Solutions y definió reglas claras para aprobar excepciones de precio.",
        "shareableReason": "Nathan dirige Arrowhead Workforce Solutions y puede compartir cómo cuidó el margen por cliente y puso orden en las excepciones de precio.",
        "missingInformation": [
          "Margen actual en las cuentas más ajustadas de Northbrook Food Products",
          "Qué clientes entran pronto en revisión de precios"
        ]
      },
      "forB": {
        "benefit": "Lucia documentó paso a paso cómo el equipo de ventas de Northbrook Food Products debe atender los referidos para no depender de la fundadora.",
        "shareableReason": "Lucia es CEO de Northbrook Food Products y puede explicar cómo pasó el manejo de referidos a su equipo comercial, justo lo que busca Nathan.",
        "missingInformation": [
          "Qué tipo de socios busca activar Arrowhead Workforce Solutions para recibir referidos",
          "Cómo da seguimiento hoy el equipo de Nathan cuando recibe una recomendación"
        ]
      }
    }
  },
  {
    "a": "felix.wilson@kestrelfacilityservices.example",
    "b": "emerson.robinson@bridgewelladvisorygroup.example",
    "pairScore": 91,
    "uncertainty": "Felix runs a multi-site facility services company while Emerson leads a B2B advisory firm, so it helps to see how they adapt local hiring and pricing rules to their different models.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to raise prices on low-margin work while keeping valuable customers."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We planned which local managers to hire first when entering a new market."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to set clear criteria for opening another location. Timing: within 90 days."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We tracked what changed each customer's margin and revised when exceptions needed approval."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Emerson has already built the margin tracking and discount rules Felix needs to raise prices, and Felix has already mapped out the local hiring plan Emerson needs for a new location.",
      "forA": {
        "heading": "Raising Low-Margin Prices",
        "problem": "Felix wants to raise prices on low-margin contracts at Kestrel Facility Services while keeping his best customers.",
        "whyMatch": "Emerson already solved this at Bridgewell Advisory Group by tracking what changed each client's margin and tightening when price exceptions needed approval.",
        "business": "Ask Emerson how he tracks what hurts each customer's margin and which price exceptions require his sign-off.",
        "life": "How to replace last-minute price favors with simple rules your account managers can follow on their own."
      },
      "forB": {
        "heading": "Opening Another Location",
        "problem": "Within the next 90 days, Emerson wants to set clear criteria for opening another location at Bridgewell Advisory Group.",
        "whyMatch": "Felix has already entered new markets at Kestrel Facility Services and mapped out which local managers need to be hired first.",
        "business": "Ask Felix which local managers he hires first when entering a new market and what stays at headquarters.",
        "life": "How to pace a new office opening so it does not drain your energy from your main business."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Emerson tracks what changes each client's profit margin at Bridgewell Advisory Group and has clear rules for when price exceptions need approval.",
      "shareableReason": "Emerson leads Bridgewell Advisory Group and can share how he tracks customer margins and handles discount requests as Felix prepares to raise prices.",
      "missingInformation": [
        "How Kestrel Facility Services currently handles price increases at renewal",
        "When Felix wants the new prices in place"
      ]
    },
    "forB": {
      "score": 90,
      "benefit": "Felix has expanded into new markets at Kestrel Facility Services and can explain how he decided which local managers to hire first.",
      "shareableReason": "Felix runs Kestrel Facility Services and can share how he planned his first local manager hires when entering a new market.",
      "missingInformation": [
        "Which city Bridgewell Advisory Group is considering for its next office",
        "Which roles Emerson plans to keep at headquarters during the first few months"
      ]
    },
    "es": {
      "uncertainty": "Felix dirige una empresa de mantenimiento de instalaciones y Emerson una firma de consultoría B2B, por lo que conviene ver cómo adaptan sus reglas de precios y contratación local a cada giro.",
      "discussion": {
        "why": "Un intercambio directo: Emerson ya tiene el control de márgenes y aprobación de descuentos que Felix necesita para subir precios, y Felix ya definió el plan de contratación local que Emerson busca para abrir otra sede.",
        "forA": {
          "heading": "Subir precios de bajo margen",
          "problem": "Felix quiere subir precios en contratos de bajo margen en Kestrel Facility Services sin perder a sus mejores clientes.",
          "whyMatch": "Emerson ya hizo esto en Bridgewell Advisory Group midiendo qué cambiaba el margen de cada cliente y ajustando cuándo una excepción de precio requiere autorización.",
          "business": "Pregúntale a Emerson cómo identifica qué reduce el margen de un cliente y qué excepciones de precio requieren su firma.",
          "life": "Cómo cambiar los descuentos improvisados por reglas claras que tus gerentes de cuenta puedan aplicar solos."
        },
        "forB": {
          "heading": "Abrir una nueva ubicación",
          "problem": "En los próximos 90 días, Emerson quiere definir criterios claros para abrir otra oficina en Bridgewell Advisory Group.",
          "whyMatch": "Felix ya abrió nuevos mercados en Kestrel Facility Services y planificó con precisión qué gerentes locales contratar primero.",
          "business": "Pregúntale a Felix qué gerentes locales contrata primero al entrar a una ciudad nueva y qué puestos mantiene en la oficina central.",
          "life": "Cómo llevar el ritmo al abrir una segunda sede para que no absorba toda tu energía como fundador."
        }
      },
      "forA": {
        "benefit": "Emerson mide qué cambia el margen de cada cliente en Bridgewell Advisory Group y definió reglas claras sobre cuándo se aprueban excepciones de precio.",
        "shareableReason": "Emerson lidera Bridgewell Advisory Group y puede explicar cómo cuida el margen por cliente y regula los descuentos mientras Felix prepara su ajuste de precios.",
        "missingInformation": [
          "Cómo maneja hoy Kestrel Facility Services los ajustes de precio en las renovaciones",
          "Fecha objetivo de Felix para aplicar las nuevas tarifas"
        ]
      },
      "forB": {
        "benefit": "Felix ya planificó qué gerentes locales contratar primero al entrar en un nuevo mercado en Kestrel Facility Services y puede contar qué tomó en cuenta.",
        "shareableReason": "Felix dirige Kestrel Facility Services y puede compartir cómo decidió sus primeras contrataciones gerenciales al abrir mercado.",
        "missingInformation": [
          "Qué ciudad evalúa Bridgewell Advisory Group para su próxima oficina",
          "Qué funciones planea Emerson cubrir desde la oficina principal al principio"
        ]
      }
    }
  },
  {
    "a": "rafael.fischer@harborcrestadvisorygroup.example",
    "b": "camila.blanco@evervalefacilityservices.example",
    "pairScore": 93,
    "uncertainty": "Both work in the Phoenix-Scottsdale area in different industries—advisory and facility services—so it helps to confirm how their contract renewal timelines compare.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to understand which customer groups bring in cash, not just sales on paper. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We reviewed customers at risk of not renewing and assigned follow-up actions."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to spot customers at risk of leaving before their contracts come up for renewal. Timing: within 90 days."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We separated the effect of price changes from changes in what customers bought."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Camila already knows how to break down revenue to see which customers bring in real cash, and Rafael already runs the early renewal check-ins Camila wants to set up.",
      "forA": {
        "heading": "Seeing Which Customers Bring Cash",
        "problem": "Ahead of this year's budget decision, Rafael wants to know which customer groups at Harborcrest Advisory Group actually bring in cash instead of just sales on paper.",
        "whyMatch": "Camila's team at Evervale Facility Services separated the impact of price changes from shifts in what customers bought, making it clear which customer groups generate real money.",
        "business": "Ask Camila how she separates price changes from shifts in what customers buy to see which accounts bring in real cash.",
        "life": "How to get your leadership team focused on customers who generate cash instead of chasing big sales numbers on paper."
      },
      "forB": {
        "heading": "Spotting Renewal Risks Early",
        "problem": "Within the next 90 days, Camila wants a reliable way to spot customers at Evervale Facility Services who are at risk of leaving before their contracts come up for renewal.",
        "whyMatch": "Rafael already runs regular reviews at Harborcrest Advisory Group to flag at-risk renewals early and assign specific follow-up actions to his team.",
        "business": "Ask Rafael how early he reviews upcoming renewals and how he assigns follow-up tasks when a client looks shaky.",
        "life": "How to get account managers fixing customer problems early instead of pulling you into last-minute emergencies."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Camila's team at Evervale Facility Services separated the impact of price changes from changes in what customers bought, showing clearly which accounts generate real cash.",
      "shareableReason": "Camila leads Evervale Facility Services and can explain how separating price changes from customer buying habits reveals which customer groups bring in cash.",
      "missingInformation": [
        "How Harborcrest Advisory Group currently groups its clients when looking at profit and cash",
        "When Rafael makes his annual budget decision"
      ]
    },
    "forB": {
      "score": 94,
      "benefit": "Rafael runs regular reviews of customers at risk of not renewing at Harborcrest Advisory Group and assigns clear follow-up steps well before contracts expire.",
      "shareableReason": "Rafael is CEO of Harborcrest Advisory Group and can share his process for spotting at-risk renewals early and assigning follow-up actions.",
      "missingInformation": [
        "How far in advance Evervale Facility Services usually starts renewal talks",
        "What fixes frontline managers can offer an unhappy client without asking Camila"
      ]
    },
    "es": {
      "uncertainty": "Ambos operan en la zona de Phoenix y Scottsdale en sectores distintos (consultoría y mantenimiento), por lo que conviene confirmar qué tan parecidos son sus plazos de renovación de contratos.",
      "discussion": {
        "why": "Un intercambio directo: Camila ya sabe cómo desglosar las ventas para ver qué clientes traen efectivo real, y Rafael ya tiene el sistema de alerta temprana para renovaciones en riesgo que Camila busca implementar.",
        "forA": {
          "heading": "Identificar clientes que dejan efectivo",
          "problem": "Antes de cerrar el presupuesto de este año, Rafael quiere entender qué grupos de clientes en Harborcrest Advisory Group traen efectivo real y no solo ventas en papel.",
          "whyMatch": "El equipo de Camila en Evervale Facility Services separó el efecto de los cambios de precio frente a los cambios en lo que compran los clientes, dejando claro qué cuentas generan dinero real.",
          "business": "Pregúntale a Camila cómo separa los cambios de precio de lo que compra cada cliente para ver qué grupos realmente dejan efectivo.",
          "life": "Cómo enfocar a tus directores en clientes que generan efectivo real en vez de perseguir solo volumen de facturación."
        },
        "forB": {
          "heading": "Detectar renovaciones en riesgo",
          "problem": "En los próximos 90 días, Camila quiere detectar a tiempo qué clientes de Evervale Facility Services corren riesgo de irse antes de que llegue la fecha de renovación.",
          "whyMatch": "Rafael ya hace revisiones periódicas en Harborcrest Advisory Group para identificar clientes con riesgo de no renovar y asignar tareas claras de seguimiento a su equipo.",
          "business": "Pregúntale a Rafael cómo revisa con anticipación las renovaciones y asigna el seguimiento cuando una cuenta está en riesgo.",
          "life": "Cómo lograr que los gerentes de cuenta resuelvan el desgaste con un cliente a tiempo sin que tengas que entrar de emergencia."
        }
      },
      "forA": {
        "benefit": "El equipo de Camila en Evervale Facility Services separó el efecto de los cambios de precio de los cambios en lo que compraban los clientes, mostrando qué grupos dejan dinero real.",
        "shareableReason": "Camila dirige Evervale Facility Services y puede explicar cómo separar cambios de precio y hábitos de compra revela qué clientes realmente aportan efectivo.",
        "missingInformation": [
          "Cómo agrupa hoy Harborcrest Advisory Group a sus clientes para revisar ganancias y cobros",
          "Fecha límite de Rafael para definir el presupuesto anual"
        ]
      },
      "forB": {
        "benefit": "Rafael revisa de forma preventiva a los clientes en riesgo de no renovar en Harborcrest Advisory Group y asigna acciones concretas de seguimiento antes del vencimiento.",
        "shareableReason": "Rafael es CEO de Harborcrest Advisory Group y puede compartir su método para detectar a tiempo renovaciones en riesgo y asignar responsables.",
        "missingInformation": [
          "Con cuánta anticipación se negocian las renovaciones en Evervale Facility Services",
          "Qué soluciones puede ofrecer un gerente operativo sin pedir autorización a Camila"
        ]
      }
    }
  },
  {
    "a": "damon.becker@fieldstonefacilityservices.example",
    "b": "fatima.alvarez@brooklinepropertypartners.example",
    "pairScore": 92,
    "uncertainty": "Damon runs a facility services company in San Diego while Fatima manages commercial properties in Carlsbad; confirm they have no active vendor-client relationship so they can talk openly as peers.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to stop extra work and customer concessions from eroding profit."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We reviewed customers at risk of not renewing and assigned follow-up actions."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to spot customers at risk of leaving before their contracts come up for renewal. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We set limits on the cash we could tie up in major customer commitments."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Fatima has already set firm limits on big customer commitments to protect profit, and Damon already runs the early renewal check-ins Fatima needs ahead of her budget.",
      "forA": {
        "heading": "Stopping Unpaid Extra Work",
        "problem": "Damon wants to stop free extra work and customer giveaways from eating away profits at Fieldstone Facility Services.",
        "whyMatch": "Fatima already tackled this at Brookline Property Partners by setting strict limits on how much cash and extra commitment her business will tie up in any major customer.",
        "business": "Ask Fatima how she sets clear limits on what her team can commit to a major customer without hurting the relationship.",
        "life": "How to help operations managers say no to free extra work while keeping customers happy."
      },
      "forB": {
        "heading": "Catching Renewal Risks Early",
        "problem": "Ahead of this year's budget decision, Fatima wants to spot customers at Brookline Property Partners who are at risk of leaving before their contracts come up for renewal.",
        "whyMatch": "Damon already runs regular check-ins at Fieldstone Facility Services to flag at-risk customers early and assign specific follow-up actions.",
        "business": "Ask Damon which warning signs he checks before renewal and how he assigns follow-up tasks to save an at-risk account.",
        "life": "How to build an early check-in habit across your team so you are not pulled into last-minute contract rescues."
      }
    },
    "forA": {
      "score": 91,
      "benefit": "Fatima set firm limits at Brookline Property Partners on how much cash can be tied up in major customer commitments, giving a clear boundary against costly giveaways.",
      "shareableReason": "Fatima leads Brookline Property Partners and can share how setting clear limits on customer commitments protects profit from unpaid extra work.",
      "missingInformation": [
        "Where unpaid extra work most often creeps in at Fieldstone Facility Services",
        "What giveaways branch managers can currently approve on their own"
      ]
    },
    "forB": {
      "score": 93,
      "benefit": "Damon regularly reviews customers at risk of not renewing at Fieldstone Facility Services and assigns clear follow-up steps well before renewal time.",
      "shareableReason": "Damon founded Fieldstone Facility Services and can walk through how he spots at-risk renewals early and assigns follow-up actions.",
      "missingInformation": [
        "Which early warning signs Brookline Property Partners currently watches before renewal",
        "When Fatima finalizes her annual budget"
      ]
    },
    "es": {
      "uncertainty": "Damon dirige una empresa de mantenimiento en San Diego y Fatima administra propiedades comerciales en Carlsbad; conviene confirmar que no sean proveedor y cliente para que conversen con total libertad entre pares.",
      "discussion": {
        "why": "Un intercambio directo: Fatima ya puso límites claros a los compromisos con grandes clientes para cuidar las ganancias, y Damon ya aplica las revisiones tempranas de renovación que Fatima necesita antes de su presupuesto.",
        "forA": {
          "heading": "Frenar trabajo extra sin cobro",
          "problem": "Damon quiere evitar que el trabajo adicional no cobrado y las concesiones a clientes se coman las ganancias en Fieldstone Facility Services.",
          "whyMatch": "Fatima ya resolvió esto en Brookline Property Partners fijando límites estrictos al efectivo y a los compromisos que su empresa puede asumir con un cliente grande.",
          "business": "Pregúntale a Fatima cómo fija límites claros a lo que su equipo puede comprometer con un cliente grande sin dañar la relación.",
          "life": "Cómo respaldar a tus gerentes operativos para que digan que no al trabajo extra gratuito sin perder la confianza del cliente."
        },
        "forB": {
          "heading": "Detectar clientes en riesgo",
          "problem": "Antes de decidir el presupuesto de este año, Fatima quiere detectar qué clientes de Brookline Property Partners corren riesgo de irse antes de que toque renovar su contrato.",
          "whyMatch": "Damon ya realiza revisiones preventivas en Fieldstone Facility Services para identificar cuentas en riesgo de no renovar y asignar tareas concretas de seguimiento.",
          "business": "Pregúntale a Damon qué señales de alerta revisa antes de una renovación y cómo asigna el seguimiento para rescatar la cuenta.",
          "life": "Cómo crear el hábito de revisar renovaciones con tiempo para que no tengas que entrar a último minuto a salvar contratos."
        }
      },
      "forA": {
        "benefit": "Fatima fijó en Brookline Property Partners límites claros al efectivo comprometido con grandes clientes, creando un freno práctico contra las concesiones costosas.",
        "shareableReason": "Fatima dirige Brookline Property Partners y puede explicar cómo poner límites a los compromisos con clientes evita que el trabajo extra erosione la ganancia.",
        "missingInformation": [
          "En qué parte de la operación surgen más pedidos extra sin cobro en Fieldstone Facility Services",
          "Qué concesiones pueden autorizar hoy los gerentes sin consultar a Damon"
        ]
      },
      "forB": {
        "benefit": "Damon revisa con anticipación a los clientes en riesgo de no renovar en Fieldstone Facility Services y asigna acciones concretas de seguimiento antes del vencimiento.",
        "shareableReason": "Damon fundó Fieldstone Facility Services y puede compartir su proceso para detectar a tiempo renovaciones en riesgo y asignar responsables.",
        "missingInformation": [
          "Qué señales tempranas de cancelación revisa hoy Brookline Property Partners",
          "Cuándo cierra Fatima su presupuesto anual"
        ]
      }
    }
  },
  {
    "a": "rafael.zhang@pinecresttechnologygroup.example",
    "b": "tessa.foster@newhavenfoodproducts.example",
    "pairScore": 93,
    "uncertainty": "Rafael runs a managed IT company while Tessa runs a packaged-food business, so it helps to check which local hiring roles and partner referral habits carry over best between their industries.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to decide whether we can enter a second market using our existing support teams."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We documented how the sales team should handle referrals so they no longer depended on the founder."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to get regular partner referrals beyond the founder's personal contacts. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We planned which local managers to hire first when entering a new market."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Rafael has solved Tessa's partner-referral bottleneck, and Tessa has already mapped out the new-market hiring plan Rafael needs now.",
      "forA": {
        "heading": "Expanding to a New Market",
        "problem": "Rafael wants to decide whether Pinecrest Technology Group can enter a second market using its existing support teams instead of hiring a full local crew right away.",
        "whyMatch": "Tessa already mapped this out at Newhaven Food Products. She planned which local managers had to be hired first when entering a new market and what her existing teams could cover.",
        "business": "Ask Tessa how she decided which local managers to hire first in a new market versus relying on her existing support team.",
        "life": "How to test a second market without stretching yourself or your current team too thin."
      },
      "forB": {
        "heading": "Partner Referrals",
        "problem": "Right now, partner referrals at Newhaven Food Products only come through Tessa's personal relationships. She wants her team to bring in and handle referrals without everything depending on her.",
        "whyMatch": "Rafael already solved this at Pinecrest Technology Group. He built a clear process so his sales team handles partner referrals on their own instead of relying on him.",
        "business": "Ask Rafael how he trained his sales team to take over partner referrals.",
        "life": "How to step back from personally managing every partner relationship without losing trust."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Tessa planned which local managers to hire first when entering a new market at Newhaven Food Products, giving Rafael a practical way to weigh local hires against shared support.",
      "shareableReason": "Tessa leads Newhaven Food Products and can share how she decided which local managers to hire first when opening a new market.",
      "missingInformation": [
        "Which support tasks Pinecrest Technology Group hopes to keep centralized in its second market",
        "On-site response times promised to IT clients in the new region"
      ]
    },
    "forB": {
      "score": 94,
      "benefit": "Rafael wrote a clear playbook at Pinecrest Technology Group for how the sales team handles referrals so partner deals no longer depend on the founder.",
      "shareableReason": "Rafael founded Pinecrest Technology Group and can walk through how he trained his sales team to run partner referrals beyond his personal network.",
      "missingInformation": [
        "Which types of partners Newhaven Food Products wants to work with ahead of the budget decision",
        "How warm introductions are currently passed to Tessa's sales team"
      ]
    },
    "es": {
      "uncertainty": "Rafael dirige una empresa de servicios de TI y Tessa una compañía de alimentos empacados, por lo que conviene revisar qué aprendizajes sobre contratación local y referidos se adaptan mejor a cada negocio.",
      "discussion": {
        "why": "Un intercambio directo: Rafael ya resolvió el cuello de botella de referidos de socios que enfrenta Tessa, y Tessa ya trazó el plan de contrataciones locales para abrir mercado que Rafael necesita hoy.",
        "forA": {
          "heading": "Abrir un segundo mercado",
          "problem": "Rafael quiere decidir si Pinecrest Technology Group puede entrar a un segundo mercado apoyándose en sus equipos de soporte actuales en lugar de armar toda una estructura local desde el día uno.",
          "whyMatch": "Tessa ya resolvió este dilema en Newhaven Food Products. Planificó qué gerentes locales era indispensable contratar primero al entrar a un nuevo mercado y qué podía cubrir su equipo central.",
          "business": "Pregúntale a Tessa cómo decidió qué gerentes locales contratar primero en un mercado nuevo y qué dejó en manos de su equipo actual.",
          "life": "Cómo probar suerte en una segunda ciudad sin sobrecargarte tú ni agotar a tu equipo actual."
        },
        "forB": {
          "heading": "Referidos de socios",
          "problem": "Hoy en día, los referidos de socios en Newhaven Food Products llegan solo por los contactos personales de Tessa. Ella quiere que su equipo genere y atienda esos referidos sin que todo dependa de ella.",
          "whyMatch": "Rafael ya solucionó esto en Pinecrest Technology Group. Dejó por escrito un proceso claro para que su equipo de ventas gestione los referidos de socios por su cuenta sin depender de él.",
          "business": "Pregúntale a Rafael cómo entrenó a su equipo de ventas para hacerse cargo de los referidos de socios.",
          "life": "Cómo dar un paso atrás y dejar de atender personalmente cada relación con socios sin perder su confianza."
        }
      },
      "forA": {
        "benefit": "Tessa planificó qué gerentes locales contratar primero al entrar en un nuevo mercado en Newhaven Food Products, dándole a Rafael una guía clara para decidir entre personal local y soporte central.",
        "shareableReason": "Tessa dirige Newhaven Food Products y puede contar cómo definió qué gerentes locales contratar primero al abrir un mercado nuevo.",
        "missingInformation": [
          "Qué áreas de soporte quiere mantener centralizadas Pinecrest Technology Group en su segundo mercado",
          "Qué tiempos de respuesta presencial exigen los clientes en esa nueva ciudad"
        ]
      },
      "forB": {
        "benefit": "Rafael documentó en Pinecrest Technology Group cómo debe atender los referidos el equipo de ventas para que dejen de depender del fundador.",
        "shareableReason": "Rafael fundó Pinecrest Technology Group y puede explicar cómo preparó a su equipo comercial para manejar referidos más allá de los contactos del fundador.",
        "missingInformation": [
          "Qué tipo de socios comerciales quiere sumar Newhaven Food Products antes de cerrar su presupuesto",
          "Cómo se reparten hoy las recomendaciones que llegan al equipo de Tessa"
        ]
      }
    }
  },
  {
    "a": "jules.sullivan@brooklinefacilityservices.example",
    "b": "mika.farrell@sandhillworkforcesolutions.example",
    "pairScore": 93,
    "uncertainty": "Both run multi-site service companies in Southern California—facility services in Irvine and staffing in Carlsbad—so it helps to confirm their budget and cash-planning timelines.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to set clear criteria for opening another location. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We showed managers how much cash was tied up in each product or customer."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to avoid cash shortfalls caused by slow customer payments and supplier payment deadlines."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We set approval criteria before opening a permanent location."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Mika has already set the approval checklist Jules needs before opening a permanent location, and Jules has already built the customer cash reports Mika needs to prevent cash crunches.",
      "forA": {
        "heading": "Rules for Opening a Location",
        "problem": "Ahead of this year's budget decision, Jules wants to set clear criteria for when Brookline Facility Services should open another location.",
        "whyMatch": "Mika already put strict approval criteria in place at Sandhill Workforce Solutions before committing to a permanent new office.",
        "business": "Ask Mika which requirements a new market must meet before she approves opening a permanent location.",
        "life": "How to use clear, agreed-upon rules for expansion so growth decisions stay grounded instead of emotional."
      },
      "forB": {
        "heading": "Avoiding Cash Shortfalls",
        "problem": "Mika wants to avoid cash crunches at Sandhill Workforce Solutions when customers pay slowly and supplier or payroll deadlines hit first.",
        "whyMatch": "Jules tackled this at Brookline Facility Services by showing his managers exactly how much cash was tied up in each customer account.",
        "business": "Ask Jules how he shows his managers the exact cash tied up in each customer so they help speed up collections.",
        "life": "How to get frontline managers sharing responsibility for cash flow so the owner is not carrying that worry alone."
      }
    },
    "forA": {
      "score": 94,
      "benefit": "Mika set clear approval rules before opening a permanent location at Sandhill Workforce Solutions and can share which benchmarks had to be met first.",
      "shareableReason": "Mika leads Sandhill Workforce Solutions and has already created approval rules for opening permanent branches, matching Jules's pre-budget expansion goal.",
      "missingInformation": [
        "Which new areas Brookline Facility Services is considering ahead of the budget decision",
        "How much committed customer revenue Jules wants in place before opening an office"
      ]
    },
    "forB": {
      "score": 92,
      "benefit": "Jules showed managers at Brookline Facility Services exactly how much cash was tied up in each customer or service line, turning slow payments into something managers act on early.",
      "shareableReason": "Jules runs Brookline Facility Services and can share how showing managers the exact cash tied up in each customer helps prevent cash crunches.",
      "missingInformation": [
        "Typical gap between paying workers/suppliers and collecting from customers at Sandhill Workforce Solutions",
        "How account managers currently handle overdue customer invoices"
      ]
    },
    "es": {
      "uncertainty": "Ambos operan empresas de servicios en el sur de California (mantenimiento en Irvine y personal en Carlsbad); conviene confirmar sus fechas de presupuesto y revisión de flujo de caja.",
      "discussion": {
        "why": "Un intercambio directo: Mika ya definió los requisitos de aprobación que Jules busca para abrir una sede permanente, y Jules ya creó la visibilidad de efectivo por cliente que Mika necesita para evitar baches de liquidez.",
        "forA": {
          "heading": "Criterios para abrir otra sede",
          "problem": "Antes de la decisión de presupuesto de este año, Jules quiere fijar criterios claros para decidir cuándo abrir otra ubicación en Brookline Facility Services.",
          "whyMatch": "Mika ya estableció requisitos formales de aprobación en Sandhill Workforce Solutions antes de comprometerse con una oficina permanente.",
          "business": "Pregúntale a Mika qué condiciones debe cumplir una plaza antes de que ella apruebe abrir una ubicación permanente.",
          "life": "Cómo usar reglas claras para decidir una expansión y evitar que el entusiasmo le gane a los números."
        },
        "forB": {
          "heading": "Evitar baches de efectivo",
          "problem": "Mika quiere evitar faltantes de efectivo en Sandhill Workforce Solutions cuando los clientes tardan en pagar pero las fechas de pago a proveedores y nómina no esperan.",
          "whyMatch": "Jules resolvió esto en Brookline Facility Services mostrando a sus gerentes con exactitud cuánto dinero de la empresa estaba atrapado en cada cliente.",
          "business": "Pregúntale a Jules cómo muestra a sus gerentes el efectivo retenido en cada cliente para que ayuden a cobrar más rápido.",
          "life": "Cómo hacer que tus gerentes compartan el cuidado del flujo de caja para que esa preocupación no recaiga solo en ti."
        }
      },
      "forA": {
        "benefit": "Mika definió criterios claros de aprobación antes de abrir una sede permanente en Sandhill Workforce Solutions y puede contar qué condiciones exigió antes de firmar.",
        "shareableReason": "Mika dirige Sandhill Workforce Solutions y ya cuenta con reglas claras para aprobar nuevas sucursales permanentes, justo lo que Jules necesita antes de su presupuesto.",
        "missingInformation": [
          "Qué ciudades evalúa abrir Brookline Facility Services antes de cerrar el presupuesto",
          "Qué volumen mínimo de contratos necesita Jules para justificar una oficina nueva"
        ]
      },
      "forB": {
        "benefit": "Jules mostró a los gerentes de Brookline Facility Services cuánto efectivo estaba atrapado en cada producto o cliente, logrando que el equipo actúe rápido ante cobros lentos.",
        "shareableReason": "Jules lidera Brookline Facility Services y puede explicar cómo mostrar a los gerentes el efectivo retenido por cliente ayuda a prevenir faltantes de caja.",
        "missingInformation": [
          "Cuántos días suelen pasar entre pagar nómina o proveedores y cobrar a clientes en Sandhill Workforce Solutions",
          "Qué hacen hoy los gerentes de cuenta cuando un cliente se atrasa en el pago"
        ]
      }
    }
  },
  {
    "a": "jade.banerjee@brightstoneworkforcesolutions.example",
    "b": "nina.mason@arrowheadspecialtycontracting.example",
    "pairScore": 91,
    "uncertainty": "Jade runs a staffing firm in San Francisco while Nina leads a specialty contracting business in San Diego; confirm how their billing schedules and contract cycles compare.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to reduce the cash tied up between delivering work and getting paid. Timing: next quarter."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We separated the effect of price changes from changes in what customers bought."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to set clear rules for discounts and deal approvals before the next contract cycle."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We used a short-term cash forecast alongside the operating plan."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Nina already runs a short-term cash forecast alongside her operating plan to keep cash moving, and Jade already knows how to separate price changes from buying shifts so Nina can set smart discount rules.",
      "forA": {
        "heading": "Freeing Up Cash Faster",
        "problem": "Next quarter, Jade wants to shrink the amount of cash tied up between delivering staffing work and getting paid at Brightstone Workforce Solutions.",
        "whyMatch": "Nina already manages this gap at Arrowhead Specialty Contracting by running a short-term cash forecast right alongside her regular operating plan.",
        "business": "Ask Nina how she pairs her short-term cash forecast with her operating plan to close the gap between finishing work and getting paid.",
        "life": "How to take the stress out of covering growing payroll while waiting on customer payments."
      },
      "forB": {
        "heading": "Setting Clear Discount Rules",
        "problem": "Before the next contract cycle starts, Nina wants to set clear rules for discounts and deal approvals at Arrowhead Specialty Contracting.",
        "whyMatch": "Jade's team at Brightstone Workforce Solutions separated the impact of price cuts from shifts in what customers bought, making it obvious which discounts hurt profit and which deals make sense.",
        "business": "Ask Jade how she separates price changes from customer buying mix to decide where to draw the line on discounts.",
        "life": "How to give your estimators and sales leads clear deal boundaries so you don't have to review every single bid."
      }
    },
    "forA": {
      "score": 91,
      "benefit": "Nina uses a short-term cash forecast right alongside the operating plan at Arrowhead Specialty Contracting, offering a practical routine for closing the gap between work delivery and payment.",
      "shareableReason": "Nina leads Arrowhead Specialty Contracting and can share how pairing a short-term cash forecast with the operating plan helps free up cash tied up after delivery.",
      "missingInformation": [
        "How long it currently takes Brightstone Workforce Solutions to bill and collect after placing workers",
        "Which weekly numbers Jade reviews with finance and operations right now"
      ]
    },
    "forB": {
      "score": 91,
      "benefit": "Jade's team at Brightstone Workforce Solutions separated the effect of price changes from changes in what customers bought, giving a clear factual basis for discount rules.",
      "shareableReason": "Jade runs Brightstone Workforce Solutions and can explain how separating price changes from customer buying mix helps set smart rules for discounts and deal approvals.",
      "missingInformation": [
        "When the next contract cycle starts at Arrowhead Specialty Contracting",
        "What size discount currently requires Nina's personal sign-off"
      ]
    },
    "es": {
      "uncertainty": "Jade dirige una empresa de personal en San Francisco y Nina una firma de contratistas especializados en San Diego; conviene confirmar cómo se comparan sus tiempos de facturación y ciclos de contratos.",
      "discussion": {
        "why": "Un intercambio directo: Nina ya usa un pronóstico de caja de corto plazo junto con su plan operativo para cuidar la liquidez, y Jade ya sabe cómo separar cambios de precio y mezcla de compra para que Nina fije reglas claras de descuento.",
        "forA": {
          "heading": "Destrabar efectivo más rápido",
          "problem": "El próximo trimestre, Jade quiere reducir el efectivo que queda atrapado entre entregar el trabajo y cobrar en Brightstone Workforce Solutions.",
          "whyMatch": "Nina ya controla esa brecha en Arrowhead Specialty Contracting llevando un pronóstico de caja de corto plazo directamente conectado con su plan operativo.",
          "business": "Pregúntale a Nina cómo combina su pronóstico de caja de corto plazo con el plan de operación para acortar el tiempo entre trabajar y cobrar.",
          "life": "Cómo bajar la presión de financiar una nómina en crecimiento mientras esperas que paguen los clientes."
        },
        "forB": {
          "heading": "Fijar reglas claras de descuento",
          "problem": "Antes del próximo ciclo de contratos, Nina quiere establecer reglas claras para descuentos y aprobación de acuerdos en Arrowhead Specialty Contracting.",
          "whyMatch": "El equipo de Jade en Brightstone Workforce Solutions separó el impacto de los cambios de precio de los cambios en lo que compraban los clientes, dejando claro qué descuentos dañan la ganancia.",
          "business": "Pregúntale a Jade cómo separa el efecto de los precios frente al tipo de servicio comprado para definir límites claros de descuento.",
          "life": "Cómo dar reglas claras a quienes cotizan para que no tengas que revisar y aprobar cada propuesta tú misma."
        }
      },
      "forA": {
        "benefit": "Nina utiliza un pronóstico de caja de corto plazo junto con el plan operativo en Arrowhead Specialty Contracting, ofreciendo un método práctico para reducir el dinero inmovilizado entre entrega y cobro.",
        "shareableReason": "Nina dirige Arrowhead Specialty Contracting y puede explicar cómo llevar un pronóstico de caja de corto plazo junto al plan operativo ayuda a liberar efectivo.",
        "missingInformation": [
          "Cuántos días pasan hoy entre prestar el servicio y cobrar en Brightstone Workforce Solutions",
          "Qué números de efectivo revisa Jade cada semana con su equipo"
        ]
      },
      "forB": {
        "benefit": "El equipo de Jade en Brightstone Workforce Solutions separó el efecto de los cambios de precio de los cambios en lo que compraban los clientes, dando una base clara para poner reglas de descuento.",
        "shareableReason": "Jade lidera Brightstone Workforce Solutions y puede compartir cómo separar cambios de precio y mezcla de compra permite fijar reglas claras para descuentos y aprobaciones.",
        "missingInformation": [
          "Cuándo arranca el próximo ciclo de contratos en Arrowhead Specialty Contracting",
          "A partir de qué descuento o margen una cotización necesita hoy la firma de Nina"
        ]
      }
    }
  },
  {
    "a": "felix.sullivan@westhavenadvisorygroup.example",
    "b": "nadia.shah@baypointsoftwarelabs.example",
    "pairScore": 94,
    "uncertainty": "Felix runs an operations consulting firm while Nadia leads a business software company; confirm whether their partner channels use referral fees, joint work, or mutual introductions.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to reach customers through another sales channel without hiring a large sales team."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We created a short guide that helped partners hand over customer work more clearly."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to identify which sales partners bring profitable customers who stay. Timing: within 90 days."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We documented how the sales team should handle referrals so they no longer depended on the founder."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Nadia has already trained a lean sales team to run partner referrals without the founder, and Felix has already created the partner-handover guide Nadia needs to bring in profitable customers who stay.",
      "forA": {
        "heading": "Selling Through Partners Leanly",
        "problem": "Felix wants Westhaven Advisory Group to win customers through a partner channel without hiring a big sales team.",
        "whyMatch": "Nadia already documented a clear process at Baypoint Software Labs so her sales team handles partner referrals smoothly without relying on the founder or a big outbound team.",
        "business": "Ask Nadia how she set up her sales team to handle partner referrals without hiring a large sales force.",
        "life": "How to get day-to-day partner follow-up off the founder's desk and into a simple team routine."
      },
      "forB": {
        "heading": "Finding Partners With Good Clients",
        "problem": "Within 90 days, Nadia wants to figure out which sales partners bring Baypoint Software Labs profitable customers who actually stick around.",
        "whyMatch": "Felix created a short, practical guide at Westhaven Advisory Group that helps partners hand over customer work clearly so bad-fit deals get caught early and good clients stay happy.",
        "business": "Ask Felix how his short partner-handover guide makes sure partners pass over well-matched, profitable clients.",
        "life": "How to prevent friction between outside partners and your delivery team when a newly referred customer comes onboard."
      }
    },
    "forA": {
      "score": 94,
      "benefit": "Nadia wrote down a clear process at Baypoint Software Labs for how the sales team handles referrals so partner leads move forward without depending on the founder or a big sales crew.",
      "shareableReason": "Nadia leads Baypoint Software Labs and can share her sales-team playbook for handling partner referrals without hiring a large sales force.",
      "missingInformation": [
        "What kinds of partners Westhaven Advisory Group wants to work with",
        "How Felix currently screens partner introductions before scoping a project"
      ]
    },
    "forB": {
      "score": 94,
      "benefit": "Felix created a short guide at Westhaven Advisory Group that helps partners hand over customer work clearly, keeping expectations straight from day one.",
      "shareableReason": "Felix founded Westhaven Advisory Group and can share the short handover guide he created so partner-referred customers start off cleanly and profitably.",
      "missingInformation": [
        "How Baypoint Software Labs currently tracks customer retention and profit by partner",
        "Where partner-referred customers usually get stuck after signing up"
      ]
    },
    "es": {
      "uncertainty": "Felix dirige una consultora operativa y Nadia una empresa de software empresarial; conviene confirmar si sus alianzas funcionan con comisión por referido, entrega conjunta o presentaciones mutuas.",
      "discussion": {
        "why": "Un intercambio directo: Nadia ya logró que su equipo comercial opere el canal de referidos sin depender del fundador, y Felix ya creó la guía de traspaso para socios que Nadia necesita para atraer clientes rentables que se queden.",
        "forA": {
          "heading": "Vender mediante socios comerciales",
          "problem": "Felix quiere que Westhaven Advisory Group llegue a más clientes a través de un canal de aliados sin tener que contratar un gran equipo de ventas.",
          "whyMatch": "Nadia ya documentó en Baypoint Software Labs cómo su equipo de ventas debe atender los referidos para que el canal funcione sin depender del fundador ni de una fuerza comercial grande.",
          "business": "Pregúntale a Nadia cómo organizó a su equipo comercial para atender referidos de socios sin contratar un gran equipo de ventas.",
          "life": "Cómo sacar el seguimiento diario de socios de la agenda del fundador y convertirlo en una rutina clara del equipo."
        },
        "forB": {
          "heading": "Identificar socios con clientes rentables",
          "problem": "En los próximos 90 días, Nadia quiere identificar qué socios comerciales traen a Baypoint Software Labs clientes rentables que realmente se quedan.",
          "whyMatch": "Felix creó una guía corta y práctica en Westhaven Advisory Group que ayuda a los socios a entregar a los clientes con expectativas claras desde el primer día.",
          "business": "Pregúntale a Felix qué incluyó en su guía breve de traspaso para que los socios entreguen clientes bien filtrados y rentables.",
          "life": "Cómo evitar roces entre los socios externos que recomiendan clientes y tu equipo interno que recibe el trabajo."
        }
      },
      "forA": {
        "benefit": "Nadia documentó en Baypoint Software Labs cómo debe atender los referidos el equipo de ventas para que el canal crezca sin depender del fundador ni de un gran equipo comercial.",
        "shareableReason": "Nadia dirige Baypoint Software Labs y puede compartir cómo organizó el manejo de referidos en ventas, apoyando la meta de Felix de crecer mediante aliados.",
        "missingInformation": [
          "Qué tipo de socios busca sumar Westhaven Advisory Group",
          "Cómo filtra hoy Felix las presentaciones de socios antes de armar una propuesta"
        ]
      },
      "forB": {
        "benefit": "Felix creó en Westhaven Advisory Group una guía corta que ayudó a los socios a traspasar el trabajo de clientes con mucha más claridad desde el inicio.",
        "shareableReason": "Felix fundó Westhaven Advisory Group y puede compartir la guía breve que usa para que los socios entreguen clientes con expectativas claras y buen margen.",
        "missingInformation": [
          "Cómo compara hoy Baypoint Software Labs la permanencia y ganancia de los clientes según el socio que los trajo",
          "En qué parte del arranque suelen atorarse los clientes referidos por socios"
        ]
      }
    }
  },
  {
    "a": "gabriela.rodriguez@brightstoneriskadvisors.example",
    "b": "sofia.li@meridianfacilityservices.example",
    "pairScore": 91,
    "uncertainty": "Gabriela runs a commercial risk advisory firm in Irvine while Sofia leads a facility services company in San Diego; confirm the timing of their upcoming budget and management handoff decisions.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to identify which repeat customers are profitable and which take too much effort to keep. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We tracked what changed each customer's margin and revised when exceptions needed approval."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to hand day-to-day decisions from the founder to managers while keeping customer trust. Timing: next quarter."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We reviewed prices against the cost of serving each customer."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Sofia has already compared customer prices against the real cost of serving them, and Gabriela has already set the margin and exception rules Sofia needs to hand daily decisions to her managers.",
      "forA": {
        "heading": "Spotting High-Effort, Low-Profit Clients",
        "problem": "Ahead of this year's budget decision, Gabriela wants to see which repeat customers at Brightstone Risk Advisors are truly profitable and which ones take too much work to keep.",
        "whyMatch": "Sofia already tackled this at Meridian Facility Services by checking what each customer pays against the actual cost and effort of serving them.",
        "business": "Ask Sofia how she compares a customer's price against the true cost of serving them to spot repeat accounts that drain her team.",
        "life": "How to help your team reset boundaries with high-maintenance clients without burning out your staff."
      },
      "forB": {
        "heading": "Handing Daily Decisions to Managers",
        "problem": "Next quarter, Sofia wants to hand day-to-day decisions at Meridian Facility Services over to her managers without losing customer trust.",
        "whyMatch": "Gabriela made this work at Brightstone Risk Advisors by tracking what changes each customer's margin and setting clear rules for when exceptions need approval.",
        "business": "Ask Gabriela how she set clear exception rules so her managers know which customer decisions they can make on their own.",
        "life": "How to step back from daily customer approvals while keeping key accounts confident in your managers."
      }
    },
    "forA": {
      "score": 93,
      "benefit": "Sofia reviewed prices against the true cost of serving each customer at Meridian Facility Services, offering a straightforward way to tell profitable repeat clients from high-effort drains.",
      "shareableReason": "Sofia leads Meridian Facility Services and can share how she compared prices against the cost of serving each customer, directly matching Gabriela's goal.",
      "missingInformation": [
        "How Brightstone Risk Advisors currently tracks the time and effort spent on repeat renewals",
        "What options Gabriela's team can offer when a low-margin repeat client pushes back on price"
      ]
    },
    "forB": {
      "score": 89,
      "benefit": "Gabriela tracked what changed each customer's margin at Brightstone Risk Advisors and set clear rules for when exceptions need approval, giving managers safe boundaries for daily decisions.",
      "shareableReason": "Gabriela is CEO of Brightstone Risk Advisors and can explain how clear margin-exception rules let managers handle day-to-day customer decisions safely.",
      "missingInformation": [
        "Which daily customer decisions Sofia plans to hand over to her managers first next quarter",
        "How Meridian Facility Services checks customer happiness during a manager handoff"
      ]
    },
    "es": {
      "uncertainty": "Gabriela dirige una firma de asesoría en riesgos en Irvine y Sofia una empresa de mantenimiento en San Diego; conviene confirmar sus fechas para el presupuesto anual y la delegación a gerentes.",
      "discussion": {
        "why": "Un intercambio directo: Sofia ya comparó los precios frente al costo real de atender a cada cliente, y Gabriela ya definió las reglas de margen y excepciones que Sofia necesita para delegar decisiones diarias en sus gerentes.",
        "forA": {
          "heading": "Detectar clientes que exigen demasiado",
          "problem": "Antes de la decisión de presupuesto de este año, Gabriela quiere identificar qué clientes recurrentes en Brightstone Risk Advisors son realmente rentables y cuáles dan demasiado trabajo para lo que dejan.",
          "whyMatch": "Sofia ya hizo este ejercicio en Meridian Facility Services comparando lo que paga cada cliente contra el costo y esfuerzo real de atenderlo.",
          "business": "Pregúntale a Sofia cómo compara el precio que paga un cliente contra el costo real de atenderlo para detectar cuentas que desgastan al equipo.",
          "life": "Cómo apoyar a tu equipo para poner nuevos límites a clientes antiguos muy demandantes sin agotar a tu gente."
        },
        "forB": {
          "heading": "Delegar decisiones a los gerentes",
          "problem": "El próximo trimestre, Sofia quiere pasar las decisiones diarias de Meridian Facility Services a manos de sus gerentes sin perder la confianza de los clientes.",
          "whyMatch": "Gabriela logró esto en Brightstone Risk Advisors midiendo qué cambia el margen de cada cliente y dejando claro cuándo una excepción necesita autorización.",
          "business": "Pregúntale a Gabriela cómo definió reglas claras de excepción para que sus gerentes sepan qué decisiones tomar solos frente al cliente.",
          "life": "Cómo soltar las aprobaciones diarias frente al cliente manteniendo a las cuentas clave tranquilas y confiando en tus gerentes."
        }
      },
      "forA": {
        "benefit": "Sofia revisó en Meridian Facility Services los precios frente al costo real de atender a cada cliente, ofreciendo una forma directa de distinguir cuentas recurrentes rentables de las que consumen demasiado esfuerzo.",
        "shareableReason": "Sofia dirige Meridian Facility Services y puede contar cómo comparó precios contra el costo de atender a cada cliente, justo lo que busca Gabriela.",
        "missingInformation": [
          "Cómo mide hoy Brightstone Risk Advisors las horas y el esfuerzo dedicados a clientes recurrentes",
          "Qué alternativas ofrece el equipo cuando un cliente antiguo de bajo margen no acepta un ajuste"
        ]
      },
      "forB": {
        "benefit": "Gabriela midió qué cambiaba el margen de cada cliente en Brightstone Risk Advisors y definió cuándo las excepciones requieren aprobación, dando reglas claras para que los gerentes decidan.",
        "shareableReason": "Gabriela es CEO de Brightstone Risk Advisors y puede explicar cómo poner reglas claras sobre excepciones de margen permite delegar decisiones diarias con tranquilidad.",
        "missingInformation": [
          "Qué decisiones diarias frente al cliente quiere Sofia delegar primero el próximo trimestre",
          "Cómo cuida Meridian Facility Services la confianza del cliente cuando un gerente toma el control"
        ]
      }
    }
  },
  {
    "a": "ariana.haddad@baypointwholesalepartners.example",
    "b": "victor.dawson@summitpointcommercialbuilders.example",
    "pairScore": 93,
    "uncertainty": "Both run Las Vegas companies in different industries—specialty wholesale distribution and commercial construction—so confirm they have no active supplier or bidding relationship.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to stop extra work and customer concessions from eroding profit. Timing: the next two operating reviews."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We checked margins consistently before signing complex customer contracts."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to understand which customer groups bring in cash, not just sales on paper. Timing: within six months."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We separated the effect of price changes from changes in what customers bought."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Victor already knows how to separate price giveaways from buying shifts so Ariana can stop profit leaks, and Ariana already runs the pre-contract margin checks Victor needs to focus on real cash.",
      "forA": {
        "heading": "Stopping Profit Leaks from Concessions",
        "problem": "Over the next two operating reviews, Ariana wants to stop free extra work and customer concessions from eating into profits at Baypoint Wholesale Partners.",
        "whyMatch": "Victor's team at SummitPoint Commercial Builders separated the impact of price changes from changes in what customers bought, making it obvious where giveaways and discounts hurt profit.",
        "business": "Ask Victor how he separates price cuts from shifts in what customers buy to show his team where concessions hurt profit.",
        "life": "How to get sales and operations working together to hold the line on customer freebies so it isn't just the CEO saying no."
      },
      "forB": {
        "heading": "Seeing Which Customers Bring Cash",
        "problem": "Within six months, Victor wants to know which customer groups at SummitPoint Commercial Builders actually bring in cash instead of just big sales numbers on paper.",
        "whyMatch": "Ariana solved this at Baypoint Wholesale Partners by running a consistent margin check before signing any complex customer contract.",
        "business": "Ask Ariana which margin numbers she checks before signing a complex contract so paper sales actually turn into cash.",
        "life": "How to keep project leaders focused on deals that bring in real cash instead of chasing big contract volume."
      }
    },
    "forA": {
      "score": 93,
      "benefit": "Victor's team at SummitPoint Commercial Builders separated the effect of price changes from changes in what customers bought, showing clearly where concessions hurt profitability.",
      "shareableReason": "Victor leads SummitPoint Commercial Builders and can share how separating price changes from customer buying mix highlights where concessions eat into profit.",
      "missingInformation": [
        "Which customer concessions or free extras happen most often at Baypoint Wholesale Partners",
        "How Ariana's team currently tracks giveaways in their monthly operating reviews"
      ]
    },
    "forB": {
      "score": 93,
      "benefit": "Ariana put consistent margin checks in place before signing complex customer contracts at Baypoint Wholesale Partners, filtering out low-cash deals before they are signed.",
      "shareableReason": "Ariana is President & CEO of Baypoint Wholesale Partners and can explain how checking margins before signing complex contracts protects real cash flow.",
      "missingInformation": [
        "How SummitPoint Commercial Builders currently compares cash collection across different customer groups",
        "Which contract terms most often slow down cash payments on commercial builds"
      ]
    },
    "es": {
      "uncertainty": "Ambos dirigen empresas en Las Vegas en sectores distintos (distribución mayorista y construcción comercial); conviene confirmar que no tengan licitaciones ni relación proveedor-cliente activa.",
      "discussion": {
        "why": "Un intercambio directo: Victor ya sabe cómo separar los descuentos de los cambios de mezcla de compra para que Ariana frene la pérdida de margen, y Ariana ya aplica las revisiones de margen antes de firmar contratos que Victor necesita para asegurar efectivo real.",
        "forA": {
          "heading": "Frenar concesiones y trabajo extra",
          "problem": "En las próximas dos revisiones operativas, Ariana quiere evitar que el trabajo extra y las concesiones a clientes reduzcan las ganancias en Baypoint Wholesale Partners.",
          "whyMatch": "El equipo de Victor en SummitPoint Commercial Builders separó el efecto de los cambios de precio de los cambios en lo que compraban los clientes, dejando claro dónde se pierde ganancia por descuentos o regalos.",
          "business": "Pregúntale a Victor cómo separa las rebajas de precio de los cambios en lo que compra el cliente para mostrar a su equipo dónde se escapa la ganancia.",
          "life": "Cómo lograr que ventas y operaciones cuiden juntos el margen frente a pedidos extra para que no sea solo la CEO quien pone límites."
        },
        "forB": {
          "heading": "Identificar clientes que traen efectivo",
          "problem": "En un plazo de seis meses, Victor quiere entender qué grupos de clientes en SummitPoint Commercial Builders traen efectivo real y no solo ventas grandes en papel.",
          "whyMatch": "Ariana resolvió esto en Baypoint Wholesale Partners revisando siempre el margen de forma consistente antes de firmar cualquier contrato complejo.",
          "business": "Pregúntale a Ariana qué puntos revisa antes de firmar un contrato complejo para asegurarse de que las ventas en papel se conviertan en efectivo.",
          "life": "Cómo mantener a tus directores de proyecto enfocados en contratos que dejan efectivo real en lugar de perseguir solo volumen de obra."
        }
      },
      "forA": {
        "benefit": "El equipo de Victor en SummitPoint Commercial Builders separó el efecto de los cambios de precio frente a lo que compraban los clientes, mostrando con claridad dónde las concesiones dañan la ganancia.",
        "shareableReason": "Victor dirige SummitPoint Commercial Builders y puede explicar cómo separar precios y mezcla de compra permite ver dónde las concesiones se comen el margen.",
        "missingInformation": [
          "Qué tipo de concesiones o servicios extra sin cobro ocurren más en Baypoint Wholesale Partners",
          "Cómo revisa hoy Ariana esas excepciones en sus reuniones operativas"
        ]
      },
      "forB": {
        "benefit": "Ariana implementó revisiones constantes de margen antes de firmar contratos complejos en Baypoint Wholesale Partners, evitando acuerdos que solo inflan las ventas en papel.",
        "shareableReason": "Ariana preside Baypoint Wholesale Partners y puede compartir cómo revisar márgenes antes de firmar contratos complejos ayuda a quedarse con clientes que dejan efectivo real.",
        "missingInformation": [
          "Cómo compara hoy SummitPoint Commercial Builders el cobro real de efectivo entre distintos tipos de clientes",
          "Qué condiciones de contrato suelen frenar más la entrada de efectivo en sus obras"
        ]
      }
    }
  },
  {
    "a": "devin.rodriguez@meridianprecisionworks.example",
    "b": "ariana.miller@cobaltlogisticsgroup.example",
    "pairScore": 92,
    "uncertainty": "Devin runs a precision machining company in Los Angeles while Ariana leads a regional freight business in Irvine; confirm that any shipping pitch is off the table so the talk stays purely peer-to-peer.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to set clear rules for discounts and deal approvals before the next contract cycle. Timing: before the next annual plan is agreed."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We checked margins consistently before signing complex customer contracts."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to understand which customer groups bring in cash, not just sales on paper. Timing: within six months."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We set limits on the cash we could tie up in major customer commitments."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Ariana has already set strict cash-commitment limits that give Devin a clear boundary for deal approvals, and Devin already runs the pre-contract margin checks Ariana needs to spot customers who bring in real cash.",
      "forA": {
        "heading": "Setting Discount and Deal Rules",
        "problem": "Before the next contract cycle and annual plan, Devin wants to set clear rules for discounts and deal approvals at Meridian Precision Works.",
        "whyMatch": "Ariana already created firm deal boundaries at Cobalt Logistics Group by capping how much cash her company is willing to tie up in any major customer commitment.",
        "business": "Ask Ariana how she uses limits on cash tied up in a customer to decide which discounts and deal terms can be approved.",
        "life": "How to give your sales and estimating leaders clear approval rules so contract renewals don't bottleneck at your desk."
      },
      "forB": {
        "heading": "Spotting Customers Who Bring Cash",
        "problem": "Within six months, Ariana wants to know which customer groups at Cobalt Logistics Group bring in real cash rather than just sales on paper.",
        "whyMatch": "Devin's team at Meridian Precision Works checks profit margins consistently before signing any complex customer contract, weeding out deals that look big on paper but pay poorly.",
        "business": "Ask Devin how his team checks margins before signing complex contracts to see which customer groups actually bring in cash.",
        "life": "How to guide your commercial team to value account quality and steady cash over raw shipping volume."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Ariana set clear limits at Cobalt Logistics Group on the cash that could be tied up in major customer commitments, offering a practical guardrail to pair with discount approval rules.",
      "shareableReason": "Ariana leads Cobalt Logistics Group and can share how capping the cash tied up in customer commitments makes discount and deal-approval rules much clearer.",
      "missingInformation": [
        "When the next contract renewal cycle begins at Meridian Precision Works",
        "How discounts and extended payment terms are currently approved by Devin's team"
      ]
    },
    "forB": {
      "score": 92,
      "benefit": "Devin's team at Meridian Precision Works checks margins consistently before signing complex customer contracts, offering a reliable way to judge which customer groups pay off.",
      "shareableReason": "Devin is President of Meridian Precision Works and can explain how his team checks margins before signing complex contracts so Ariana can spot which customer groups bring in real cash.",
      "missingInformation": [
        "How Cobalt Logistics Group currently tracks customer profit alongside payment speed",
        "Which customer groups require the biggest upfront commitments of trucks and staff"
      ]
    },
    "es": {
      "uncertainty": "Devin preside una empresa de maquinado de precisión en Los Ángeles y Ariana una compañía de carga regional en Irvine; conviene confirmar que la conversación sea solo aprendizaje entre pares, sin ventas de flete.",
      "discussion": {
        "why": "Un intercambio directo: Ariana ya fijó límites al efectivo comprometido por cliente que le dan a Devin una base clara para aprobar descuentos, y Devin ya aplica la revisión de márgenes previa a firmar contratos que Ariana necesita para ver qué clientes traen efectivo real.",
        "forA": {
          "heading": "Reglas para descuentos y contratos",
          "problem": "Antes del próximo ciclo de contratos y del plan anual, Devin quiere fijar reglas claras para descuentos y aprobación de acuerdos en Meridian Precision Works.",
          "whyMatch": "Ariana ya puso límites firmes en Cobalt Logistics Group fijando un tope al efectivo que la empresa puede comprometer con cualquier cliente importante.",
          "business": "Pregúntale a Ariana cómo usa los límites de efectivo comprometido por cliente para decidir qué descuentos y condiciones se pueden aprobar.",
          "life": "Cómo dar a tus líderes de ventas y cotizaciones reglas claras para que las renovaciones no se atoren en tu escritorio."
        },
        "forB": {
          "heading": "Identificar clientes que traen efectivo",
          "problem": "En los próximos seis meses, Ariana quiere entender qué grupos de clientes en Cobalt Logistics Group dejan efectivo real y no solo ventas en papel.",
          "whyMatch": "El equipo de Devin en Meridian Precision Works revisa siempre los márgenes antes de firmar contratos complejos, filtrando desde el inicio los acuerdos que solo hacen bulto en papel.",
          "business": "Pregúntale a Devin cómo revisa los márgenes antes de firmar contratos complejos para identificar qué grupos de clientes realmente dejan dinero en caja.",
          "life": "Cómo orientar a tu equipo comercial para que priorice clientes sanos que pagan bien por encima de mover más volumen."
        }
      },
      "forA": {
        "benefit": "Ariana fijó en Cobalt Logistics Group límites claros al efectivo que se puede comprometer en grandes cuentas, aportando una regla práctica para ordenar los descuentos y aprobaciones.",
        "shareableReason": "Ariana dirige Cobalt Logistics Group y puede contar cómo limitar el efectivo comprometido por cliente ayuda a definir reglas claras para descuentos y contratos.",
        "missingInformation": [
          "Cuándo empieza el próximo ciclo de contratos en Meridian Precision Works",
          "Cómo se aprueban hoy los descuentos y plazos de pago especiales en el equipo de Devin"
        ]
      },
      "forB": {
        "benefit": "El equipo de Devin en Meridian Precision Works revisa los márgenes de forma consistente antes de firmar contratos complejos, ofreciendo un filtro claro para evaluar grupos de clientes.",
        "shareableReason": "Devin preside Meridian Precision Works y puede explicar cómo verifica los márgenes antes de firmar contratos complejos para ayudar a Ariana a ver qué clientes aportan efectivo real.",
        "missingInformation": [
          "Cómo mide hoy Cobalt Logistics Group la ganancia y rapidez de pago de cada grupo de clientes",
          "Qué tipo de clientes exigen comprometer más unidades y capital desde el inicio"
        ]
      }
    }
  },
  {
    "a": "cameron.mendoza@bluecrestretailcollective.example",
    "b": "mina.kapur@redwoodengineeringstudio.example",
    "pairScore": 91,
    "uncertainty": "Cameron runs a multi-store specialty retail company while Mina leads an engineering studio; confirm which shared-support habits and customer commitment limits carry over best between their businesses.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to expand into more areas without overloading our managers. Timing: the next two operating reviews."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We set limits on the cash we could tie up in major customer commitments."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to stop extra work and customer concessions from eroding profit. Timing: before the next annual plan is agreed."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We trialled a regional team using shared finance and operating support."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Mina has already tested a regional team using shared back-office support so managers don't burn out, and Cameron has already set the customer commitment limits Mina needs to protect profit.",
      "forA": {
        "heading": "Expanding Without Overloading Managers",
        "problem": "Over the next two operating reviews, Cameron wants to expand Bluecrest Retail Collective into more areas without overloading current managers.",
        "whyMatch": "Mina already tested a regional team at Redwood Engineering Studio by backing them with shared finance and operations support instead of piling extra admin tasks onto field leads.",
        "business": "Ask Mina how she set up shared finance and operations support so her regional team could grow without overloading managers.",
        "life": "How to pace expansion into new areas so your managers keep their energy and standards high."
      },
      "forB": {
        "heading": "Stopping Unpaid Extra Work",
        "problem": "Before the next annual plan is agreed, Mina wants to stop unpaid extra work and customer concessions from eating into profit at Redwood Engineering Studio.",
        "whyMatch": "Cameron solved a similar problem at Bluecrest Retail Collective by putting firm limits on how much cash and extra commitment the company can tie up in major customer deals.",
        "business": "Ask Cameron how he set clear limits on big customer commitments to keep extra requests from eroding profit.",
        "life": "How to shift from personally granting client favors to having clear boundaries the whole studio follows."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Mina tested a regional team at Redwood Engineering Studio using shared finance and operations support, showing how to expand into a new area without overloading managers.",
      "shareableReason": "Mina leads Redwood Engineering Studio and can share how she backed a new regional team with shared finance and operations support as Cameron plans to expand.",
      "missingInformation": [
        "Which admin and daily tasks currently eat up the most time for Bluecrest Retail Collective's managers",
        "What first-quarter results Cameron expects from a new retail area"
      ]
    },
    "forB": {
      "score": 90,
      "benefit": "Cameron set clear limits at Bluecrest Retail Collective on the cash tied up in major customer commitments, offering a simple model for capping extra work and concessions.",
      "shareableReason": "Cameron runs Bluecrest Retail Collective and can explain how setting firm limits on customer commitments stops concessions from eating into profit.",
      "missingInformation": [
        "How Redwood Engineering Studio currently approves scope changes and extra engineering work",
        "When Mina finalizes her studio's next annual plan"
      ]
    },
    "es": {
      "uncertainty": "Cameron dirige una cadena de tiendas especializadas y Mina un estudio de ingeniería; conviene confirmar qué prácticas de soporte compartido y límites comerciales se adaptan mejor a cada escala.",
      "discussion": {
        "why": "Un intercambio directo: Mina ya probó un equipo regional con soporte compartido para no saturar a los gerentes, y Cameron ya puso los límites a compromisos con clientes que Mina necesita para cuidar sus ganancias.",
        "forA": {
          "heading": "Crecer sin saturar gerentes",
          "problem": "En las próximas dos revisiones operativas, Cameron quiere expandir Bluecrest Retail Collective a más zonas sin sobrecargar a sus gerentes actuales.",
          "whyMatch": "Mina ya puso a prueba un equipo regional en Redwood Engineering Studio apoyándolo con finanzas y operaciones compartidas desde la oficina central para no cargar de administración a los líderes locales.",
          "business": "Pregúntale a Mina cómo organizó el soporte financiero y operativo compartido para que su equipo regional creciera sin saturar a los gerentes.",
          "life": "Cómo llevar un ritmo de expansión a nuevas zonas que cuide la energía y el enfoque de tus gerentes."
        },
        "forB": {
          "heading": "Frenar trabajo extra sin cobro",
          "problem": "Antes de cerrar el próximo plan anual, Mina quiere evitar que el trabajo adicional y las concesiones a clientes reduzcan las ganancias en Redwood Engineering Studio.",
          "whyMatch": "Cameron resolvió un reto similar en Bluecrest Retail Collective poniendo límites estrictos a cuánto efectivo y recursos se pueden comprometer con clientes importantes.",
          "business": "Pregúntale a Cameron cómo fijó límites claros en compromisos con clientes grandes para evitar que los pedidos extra se coman la ganancia.",
          "life": "Cómo pasar de conceder favores a clientes de manera informal a tener límites claros que todo el estudio respete."
        }
      },
      "forA": {
        "benefit": "Mina probó un equipo regional en Redwood Engineering Studio usando soporte financiero y operativo compartido, mostrando cómo crecer en otra zona sin sobrecargar a los gerentes.",
        "shareableReason": "Mina dirige Redwood Engineering Studio y puede contar cómo apoyó a un equipo regional con soporte central compartido mientras Cameron planea abrir más zonas.",
        "missingInformation": [
          "Qué tareas administrativas u operativas quitan hoy más tiempo a los gerentes de Bluecrest Retail Collective",
          "Qué resultados espera ver Cameron en el primer trimestre al entrar a una nueva zona"
        ]
      },
      "forB": {
        "benefit": "Cameron fijó en Bluecrest Retail Collective límites claros al efectivo comprometido con clientes grandes, dando una referencia práctica para frenar concesiones que bajan la utilidad.",
        "shareableReason": "Cameron lidera Bluecrest Retail Collective y puede explicar cómo poner topes a los compromisos con clientes evita que las concesiones erosionen la ganancia.",
        "missingInformation": [
          "Cómo se autorizan hoy los cambios de alcance y trabajos extra en Redwood Engineering Studio",
          "Cuándo cierra Mina su próximo plan anual"
        ]
      }
    }
  },
  {
    "a": "camila.callahan@redwoodlogisticsgroup.example",
    "b": "sofia.roy@southridgeindustrialcomponents.example",
    "pairScore": 94,
    "uncertainty": "Camila runs a regional freight business in Portland while Sofia leads an industrial components company in Denver; confirm the introduction stays focused on peer learning around expansion rules and cash flow.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to reduce the cash tied up between delivering work and getting paid. Timing: the next two operating reviews."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We set approval criteria before opening a permanent location."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to expand into more areas without overloading our managers. Timing: the next two operating reviews."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We showed managers how much cash was tied up in each product or customer."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Sofia has already built the customer cash visibility Camila needs to get paid faster, and Camila has already set the location-approval rules Sofia needs to expand without overloading managers.",
      "forA": {
        "heading": "Freeing Up Cash After Delivery",
        "problem": "Over the next two operating reviews, Camila wants to reduce the cash stuck between delivering freight jobs and getting paid at Redwood Logistics Group.",
        "whyMatch": "Sofia already tackled this at Southridge Industrial Components by showing her managers exactly how much cash was tied up in each customer and product.",
        "business": "Ask Sofia how she shows her managers the exact cash tied up in each customer so they help speed up collections.",
        "life": "How to make cash awareness part of your managers' regular check-ins so you are not chasing collections alone."
      },
      "forB": {
        "heading": "Expanding Without Overloading Managers",
        "problem": "Over the next two operating reviews, Sofia wants to expand Southridge Industrial Components into more areas without overloading her managers.",
        "whyMatch": "Camila set clear approval criteria at Redwood Logistics Group that a new market must meet before she commits to opening a permanent location.",
        "business": "Ask Camila which checkpoints a new territory has to pass before she approves opening a permanent location.",
        "life": "How to hold off on adding local buildings and overhead until demand in a new area is truly proven."
      }
    },
    "forA": {
      "score": 94,
      "benefit": "Sofia showed managers at Southridge Industrial Components exactly how much cash was tied up in each product or customer, turning slow collections into something managers help fix.",
      "shareableReason": "Sofia is CEO of Southridge Industrial Components and can share how showing managers the cash tied up in each customer helps shrink the wait between delivery and payment.",
      "missingInformation": [
        "Which customer accounts at Redwood Logistics Group have the slowest payment times",
        "Which weekly numbers Camila currently tracks alongside her cash forecast"
      ]
    },
    "forB": {
      "score": 94,
      "benefit": "Camila set clear approval criteria before opening a permanent location at Redwood Logistics Group, giving a practical filter to expand into new areas without overloading managers.",
      "shareableReason": "Camila leads Redwood Logistics Group and can explain the approval criteria she requires before opening a permanent location, supporting Sofia's expansion plan.",
      "missingInformation": [
        "Which new regions Southridge Industrial Components is considering over the next two operating reviews",
        "Which support tasks Sofia plans to keep at headquarters when entering a new area"
      ]
    },
    "es": {
      "uncertainty": "Camila dirige una empresa de carga regional en Portland y Sofia una compañía de componentes industriales en Denver; conviene confirmar que la charla se enfoque solo en intercambio entre pares sobre expansión y flujo de caja.",
      "discussion": {
        "why": "Un intercambio directo: Sofia ya creó los reportes de efectivo por cliente que Camila necesita para cobrar más rápido, y Camila ya definió los requisitos para aprobar nuevas sedes que Sofia busca para crecer sin saturar a sus gerentes.",
        "forA": {
          "heading": "Liberar efectivo tras la entrega",
          "problem": "En las próximas dos revisiones operativas, Camila quiere reducir el efectivo que queda atrapado entre hacer un flete y cobrarlo en Redwood Logistics Group.",
          "whyMatch": "Sofia ya resolvió esto en Southridge Industrial Components mostrando a sus gerentes con claridad cuánto dinero quedaba retenido en cada producto y cliente.",
          "business": "Pregúntale a Sofia cómo muestra a sus gerentes el efectivo atrapado en cada cliente para que ayuden a acelerar los cobros.",
          "life": "Cómo integrar el cuidado del efectivo en las reuniones habituales de tus gerentes para no perseguir la cobranza tú sola."
        },
        "forB": {
          "heading": "Expandirse sin saturar gerentes",
          "problem": "En las próximas dos revisiones operativas, Sofia quiere llevar a Southridge Industrial Components a nuevas zonas sin sobrecargar a sus gerentes.",
          "whyMatch": "Camila fijó criterios claros de aprobación en Redwood Logistics Group que cualquier plaza nueva debe cumplir antes de abrir una ubicación permanente.",
          "business": "Pregúntale a Camila qué requisitos debe cumplir una zona nueva antes de aprobar la apertura de una sede permanente.",
          "life": "Cómo evitar sumar instalaciones y gastos fijos en una región nueva antes de que la demanda esté comprobada."
        }
      },
      "forA": {
        "benefit": "Sofia mostró a los gerentes de Southridge Industrial Components cuánto efectivo estaba atrapado en cada producto o cliente, logrando que el equipo tome decisiones que liberan caja.",
        "shareableReason": "Sofia es CEO de Southridge Industrial Components y puede contar cómo mostrar a los gerentes el efectivo retenido por cliente ayuda a cobrar más rápido tras entregar el trabajo.",
        "missingInformation": [
          "En qué cuentas de Redwood Logistics Group se concentra más la demora de pago",
          "Qué indicadores semanales revisa hoy Camila junto con su flujo de caja"
        ]
      },
      "forB": {
        "benefit": "Camila definió en Redwood Logistics Group criterios claros de aprobación antes de abrir una sede permanente, ofreciendo una regla práctica para crecer sin saturar a los gerentes.",
        "shareableReason": "Camila dirige Redwood Logistics Group y puede explicar qué requisitos exige antes de abrir una ubicación permanente, apoyando la expansión que planea Sofia.",
        "missingInformation": [
          "Qué zonas nuevas evalúa abrir Southridge Industrial Components en las próximas dos revisiones operativas",
          "Qué funciones quiere Sofia mantener en la oficina central al entrar a una nueva región"
        ]
      }
    }
  },
  {
    "a": "victor.wilson@crestwoodriskadvisors.example",
    "b": "nico.foster@seabrightindustrialcomponents.example",
    "pairScore": 91,
    "uncertainty": "Both run San Diego businesses in different industries—commercial risk advisory and industrial components—so it helps to confirm their 90-day plans for pricing and customer cash reviews.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to raise prices on low-margin work while keeping valuable customers. Timing: within 90 days."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We reviewed prices against the cost of serving each customer."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to understand which customer groups bring in cash, not just sales on paper. Timing: within 90 days."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We used lessons from completed projects to improve estimates for the next job."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Nico already uses lessons from finished jobs to fix underpriced estimates, and Victor already compares customer prices against true service costs to see who brings in real cash.",
      "forA": {
        "heading": "Re-Pricing Low-Margin Work",
        "problem": "Within 90 days, Victor wants to raise prices on low-margin work at Crestwood Risk Advisors while keeping his best customers.",
        "whyMatch": "Nico's team at Seabright Industrial Components uses lessons from finished projects to tighten their estimates for the next job, giving solid proof when a renewal needs a higher price.",
        "business": "Ask Nico how he feeds lessons from finished work into the next estimate so low-margin renewals get priced right.",
        "life": "How to give your account leads real proof from past jobs so they feel confident raising prices."
      },
      "forB": {
        "heading": "Finding Customers Who Bring Cash",
        "problem": "Within 90 days, Nico wants to see which customer groups at Seabright Industrial Components bring in real cash instead of just sales on paper.",
        "whyMatch": "Victor already solved this at Crestwood Risk Advisors by comparing what each customer pays against the true cost of serving them.",
        "business": "Ask Victor how he compares customer prices against the real cost of serving them to spot which groups bring in cash.",
        "life": "How to help sales and engineering let go of high-effort, low-cash orders without worrying about raw sales volume."
      }
    },
    "forA": {
      "score": 90,
      "benefit": "Nico's team at Seabright Industrial Components uses lessons from completed jobs to improve estimates for the next project, offering a clear way to re-price low-margin renewals.",
      "shareableReason": "Nico leads Seabright Industrial Components and can share how using lessons from past jobs helps fix underpriced estimates on upcoming renewals.",
      "missingInformation": [
        "How Crestwood Risk Advisors currently estimates service time before quoting a renewal",
        "Which low-margin accounts come up for renewal in the next 90 days"
      ]
    },
    "forB": {
      "score": 92,
      "benefit": "Victor compared prices directly against the cost of serving each customer at Crestwood Risk Advisors, providing a clear way to see which customer groups generate real cash.",
      "shareableReason": "Victor is President & CEO of Crestwood Risk Advisors and can explain how comparing prices against the cost of serving each account shows which customer groups bring in cash.",
      "missingInformation": [
        "How Seabright Industrial Components currently counts inventory and engineering support costs across customer groups",
        "Which profit or cash number Nico wants his sales team to focus on this quarter"
      ]
    },
    "es": {
      "uncertainty": "Ambos dirigen empresas en San Diego en giros distintos (asesoría en riesgos y componentes industriales); conviene confirmar sus prioridades en estos 90 días para ajustar precios y analizar el efectivo por cliente.",
      "discussion": {
        "why": "Un intercambio directo: Nico ya usa lo aprendido en trabajos terminados para corregir cotizaciones bajas, y Victor ya compara los precios contra el costo real de atender a cada cliente para ver quién deja efectivo.",
        "forA": {
          "heading": "Subir precios de bajo margen",
          "problem": "En los próximos 90 días, Victor quiere subir precios en trabajos de bajo margen en Crestwood Risk Advisors sin perder a sus clientes valiosos.",
          "whyMatch": "El equipo de Nico en Seabright Industrial Components usa las lecciones de proyectos terminados para afinar las cotizaciones del siguiente trabajo, teniendo datos reales cuando hay que subir una tarifa.",
          "business": "Pregúntale a Nico cómo usa lo aprendido en proyectos terminados para cotizar mejor la siguiente renovación.",
          "life": "Cómo respaldar a tus ejecutivos de cuenta con datos reales de trabajos anteriores para que negocien nuevos precios con seguridad."
        },
        "forB": {
          "heading": "Identificar clientes que dejan efectivo",
          "problem": "En un plazo de 90 días, Nico quiere saber qué grupos de clientes en Seabright Industrial Components traen efectivo real y no solo ventas en papel.",
          "whyMatch": "Victor ya hizo este trabajo en Crestwood Risk Advisors comparando lo que paga cada cliente contra el costo real de atenderlo.",
          "business": "Pregúntale a Victor cómo compara el precio cobrado contra el costo real de atender a cada cliente para ver qué grupos dejan efectivo.",
          "life": "Cómo ayudar a ventas e ingeniería a soltar pedidos que dan mucho trabajo y dejan poco efectivo sin obsesionarse con el volumen de ventas."
        }
      },
      "forA": {
        "benefit": "El equipo de Nico en Seabright Industrial Components usa lecciones de trabajos terminados para mejorar las estimaciones del siguiente proyecto, ofreciendo una forma práctica de corregir precios bajos.",
        "shareableReason": "Nico dirige Seabright Industrial Components y puede compartir cómo aprovechar lo aprendido en trabajos previos ayuda a corregir precios en renovaciones de bajo margen.",
        "missingInformation": [
          "Cómo calcula hoy Crestwood Risk Advisors el tiempo de atención antes de cotizar una renovación",
          "Qué clientes de bajo margen tocan renovación en los próximos 90 días"
        ]
      },
      "forB": {
        "benefit": "Victor revisó en Crestwood Risk Advisors los precios frente al costo real de atender a cada cliente, dando un método claro para ver qué grupos de clientes dejan efectivo.",
        "shareableReason": "Victor preside Crestwood Risk Advisors y puede explicar cómo comparar precios contra el costo de atención muestra qué grupos de clientes traen efectivo real.",
        "missingInformation": [
          "Cómo reparte hoy Seabright Industrial Components los costos de inventario y soporte técnico entre sus clientes",
          "Qué indicador de ganancia o efectivo quiere Nico que su equipo cuide este trimestre"
        ]
      }
    }
  },
  {
    "a": "mina.baker@wellspringlogisticsgroup.example",
    "b": "rohan.wang@southridgeadvisorygroup.example",
    "pairScore": 93,
    "uncertainty": "Mina runs a regional freight business in Scottsdale while Rohan leads an operations consulting firm in Portland; confirm which weekly payment and pricing numbers matter most in their current planning cycle.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "I want to make our cash forecast reliable enough to guide hiring and major spending."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "We assigned responsibility for collecting payments and used delays to inform operating decisions."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to avoid cash shortfalls caused by slow customer payments and supplier payment deadlines."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We reviewed prices against the cost of serving each customer."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Rohan already checks customer prices against the real cost of service so cash forecasts reflect true profit, and Mina already assigns clear collection owners and uses late-payment warnings to prevent cash crunches.",
      "forA": {
        "heading": "Building a Reliable Cash Forecast",
        "problem": "Mina wants to make the cash forecast at Wellspring Logistics Group reliable enough to guide hiring and major spending decisions.",
        "whyMatch": "Rohan's team at Southridge Advisory Group compares prices directly against the true cost of serving each customer, making it much clearer how much real cash each account will bring in.",
        "business": "Ask Rohan how he checks customer prices against the true cost of serving them so his cash forecast reflects real profit.",
        "life": "How to give your leadership team the confidence to pace hiring and big spending around solid cash numbers."
      },
      "forB": {
        "heading": "Preventing Cash Shortfalls",
        "problem": "Rohan wants to avoid cash crunches at Southridge Advisory Group when customers pay slowly and supplier bills come due.",
        "whyMatch": "Mina solved this at Wellspring Logistics Group by making specific people responsible for collecting payments and using early payment delays to adjust daily operating decisions.",
        "business": "Ask Mina how she assigns responsibility for collecting payments and uses early delay warnings to adjust operations.",
        "life": "How to take the panic out of cash flow by making collections a normal, shared habit across your team."
      }
    },
    "forA": {
      "score": 92,
      "benefit": "Rohan reviewed prices against the real cost of serving each customer at Southridge Advisory Group, helping make sure cash forecasts reflect true account profit before hiring or spending.",
      "shareableReason": "Rohan leads Southridge Advisory Group and can share how comparing prices against the cost of serving each customer makes cash forecasts much more reliable.",
      "missingInformation": [
        "Which upcoming hiring or spending decisions at Wellspring Logistics Group depend on the cash forecast",
        "How Mina's team currently checks where the cash forecast missed"
      ]
    },
    "forB": {
      "score": 94,
      "benefit": "Mina assigned clear responsibility for collecting payments at Wellspring Logistics Group and used early collection delays to adjust operating decisions before cash got tight.",
      "shareableReason": "Mina runs Wellspring Logistics Group and can explain how assigning clear owners for payment collection and acting early on delays prevents cash shortfalls.",
      "missingInformation": [
        "Who currently follows up on late customer invoices at Southridge Advisory Group",
        "Typical gap between supplier/payroll deadlines and client payments"
      ]
    },
    "es": {
      "uncertainty": "Mina dirige una empresa de logística regional en Scottsdale y Rohan una consultora operativa en Portland; conviene confirmar qué indicadores semanales de cobro y precios priorizan hoy.",
      "discussion": {
        "why": "Un intercambio directo: Rohan ya revisa los precios frente al costo real de atender a cada cliente para que el pronóstico de caja sea confiable, y Mina ya asigna responsables claros de cobranza usando alertas de atraso para evitar baches de efectivo.",
        "forA": {
          "heading": "Mejorar el pronóstico de caja",
          "problem": "Mina quiere que el pronóstico de efectivo de Wellspring Logistics Group sea lo bastante confiable como para guiar contrataciones y gastos fuertes.",
          "whyMatch": "El equipo de Rohan en Southridge Advisory Group compara los precios contra el costo real de atender a cada cliente, dejando mucho más claro cuánto efectivo real dejará cada cuenta.",
          "business": "Pregúntale a Rohan cómo compara el precio de cada cliente contra el costo real de atenderlo para que el pronóstico de caja refleje dinero real.",
          "life": "Cómo dar tranquilidad a tu equipo directivo para decidir contrataciones e inversiones con números de caja confiables."
        },
        "forB": {
          "heading": "Evitar faltantes de efectivo",
          "problem": "Rohan quiere evitar apuros de caja en Southridge Advisory Group cuando los clientes tardan en pagar y se vencen los pagos a proveedores.",
          "whyMatch": "Mina resolvió esto en Wellspring Logistics Group asignando responsables claros para cobrar cada cuenta y usando cualquier atraso temprano para ajustar decisiones operativas.",
          "business": "Pregúntale a Mina cómo asigna responsables de cobranza y cómo usa las primeras señales de atraso para ajustar gastos u operación.",
          "life": "Cómo quitarle la angustia al flujo de efectivo convirtiendo la cobranza en un hábito compartido por el equipo."
        }
      },
      "forA": {
        "benefit": "Rohan revisó en Southridge Advisory Group los precios frente al costo real de atender a cada cliente, ayudando a que el pronóstico de caja refleje la ganancia real antes de gastar o contratar.",
        "shareableReason": "Rohan dirige Southridge Advisory Group y puede compartir cómo comparar precios contra el costo de atender a cada cliente vuelve más confiable el pronóstico de efectivo.",
        "missingInformation": [
          "Qué contrataciones o inversiones próximas en Wellspring Logistics Group dependen del pronóstico de caja",
          "Con qué frecuencia compara hoy Mina su pronóstico de efectivo contra lo que realmente entró"
        ]
      },
      "forB": {
        "benefit": "Mina asignó en Wellspring Logistics Group responsables claros de cobrar y usó los atrasos de pago para ajustar decisiones operativas a tiempo.",
        "shareableReason": "Mina lidera Wellspring Logistics Group y puede explicar cómo poner responsables claros de cobranza y actuar ante los primeros atrasos evita faltantes de efectivo.",
        "missingInformation": [
          "Quién da seguimiento hoy a las facturas vencidas en Southridge Advisory Group",
          "Cuántos días de diferencia suele haber entre pagar a proveedores y cobrar los proyectos"
        ]
      }
    }
  },
  {
    "a": "lena.anderson@oakridgeretailcollective.example",
    "b": "owen.reyes@crescentfoodproducts.example",
    "pairScore": 90,
    "uncertainty": "Lena Anderson is an event chair with automatic matching turned off, so the organizer or Wefter needs to get both people's agreement and introduce them personally, with zero sales pitches.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "Help participants discuss scalable regional expansion without sales pitches."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "Can lead a peer discussion on regional specialty retail."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to expand into more areas without overloading our managers. Timing: this year, ahead of the budget decision."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We set limits on the cash we could tie up in major customer commitments."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Owen brings a live regional-expansion case and practical cash-limit rules to Lena's peer discussion, and Lena brings multi-site retail lessons to help Owen expand without overloading his managers.",
      "forA": {
        "heading": "Real-World Regional Expansion Case",
        "problem": "Lena hosts pitch-free peer discussions at Oakridge Retail Collective on how leaders can expand into new regions without breaking their operations.",
        "whyMatch": "Owen is actively planning regional expansion at Crescent Food Products right now and has already set firm limits on how much cash his company ties up in big customer commitments.",
        "business": "Ask Owen how he caps the cash tied up in major customer commitments while planning expansion into new areas.",
        "life": "How to keep executive peer conversations grounded in honest operational trade-offs instead of sales pitches."
      },
      "forB": {
        "heading": "Expanding Without Overloading Managers",
        "problem": "Ahead of this year's budget decision, Owen wants to expand Crescent Food Products into more areas without overloading his managers.",
        "whyMatch": "Lena chairs executive peer discussions at Oakridge Retail Collective on regional specialty retail and how multi-location businesses grow sustainably.",
        "business": "Ask Lena which warning signs show that a regional expansion is about to overload territory or store managers.",
        "life": "How to step back before locking in the annual budget and test your expansion assumptions with an experienced event chair."
      }
    },
    "forA": {
      "score": 89,
      "benefit": "Owen leads Crescent Food Products and brings a live regional-expansion challenge plus hands-on experience setting limits on cash tied up in major customer commitments.",
      "shareableReason": "Owen is President & CEO of Crescent Food Products and can share practical lessons on capping customer cash commitments during a pitch-free peer discussion on regional growth.",
      "missingInformation": [
        "Whether Lena prefers a small roundtable or a one-to-one format for an organizer-arranged discussion",
        "Confirmation from the organizer that both Lena and Owen want the introduction"
      ]
    },
    "forB": {
      "score": 91,
      "benefit": "Lena chairs executive peer discussions at Oakridge Retail Collective focused on regional specialty retail and scalable regional expansion in a strictly pitch-free setting.",
      "shareableReason": "Lena is an Executive Coach and Chair with Oakridge Retail Collective who leads pitch-free peer discussions on regional expansion, matching Owen's goal of growing without overloading managers.",
      "missingInformation": [
        "Which new areas Crescent Food Products is considering ahead of the annual budget decision",
        "Which manager tasks currently create the biggest bottleneck when opening a new territory"
      ]
    },
    "es": {
      "uncertainty": "Lena Anderson es presidenta de sesión (Chair) y tiene desactivado el emparejamiento automático; el organizador o Wefter debe confirmar que ambos estén de acuerdo y presentarlos personalmente, sin discursos de ventas.",
      "discussion": {
        "why": "Un intercambio directo: Owen aporta un caso real de expansión regional y reglas para limitar el efectivo comprometido por cliente a la mesa de Lena, y Lena aporta lecciones de comercio minorista multisede para que Owen crezca sin saturar a sus gerentes.",
        "forA": {
          "heading": "Caso real de expansión regional",
          "problem": "Lena facilita conversaciones entre pares en Oakridge Retail Collective sobre cómo expandirse a nuevas regiones sin discursos de ventas ni sobrecarga operativa.",
          "whyMatch": "Owen está planeando ahora mismo la expansión regional de Crescent Food Products y ya fijó límites claros al efectivo que su empresa compromete con clientes grandes.",
          "business": "Pregúntale a Owen cómo limita el efectivo comprometido con grandes clientes mientras planea entrar a nuevas zonas.",
          "life": "Cómo mantener las conversaciones entre directivos enfocadas en decisiones reales de negocio y libres de discursos comerciales."
        },
        "forB": {
          "heading": "Crecer sin saturar gerentes",
          "problem": "Antes de decidir el presupuesto de este año, Owen quiere expandir Crescent Food Products a más zonas sin sobrecargar a sus gerentes.",
          "whyMatch": "Lena modera conversaciones ejecutivas en Oakridge Retail Collective sobre comercio minorista regional y cómo crecer en varias ubicaciones de forma sostenible.",
          "business": "Pregúntale a Lena qué señales avisan que una expansión regional está a punto de sobrecargar a los gerentes.",
          "life": "Cómo hacer una pausa antes de cerrar el presupuesto anual para poner a prueba tu plan de expansión con una Chair experimentada."
        }
      },
      "forA": {
        "benefit": "Owen dirige Crescent Food Products y aporta un caso vivo de expansión regional junto con experiencia práctica fijando límites al efectivo comprometido con grandes clientes.",
        "shareableReason": "Owen preside Crescent Food Products y puede compartir cómo limita el efectivo comprometido en cuentas grandes dentro de una charla entre pares libre de ventas.",
        "missingInformation": [
          "Qué formato prefiere Lena para una conversación coordinada por el organizador",
          "Confirmación del organizador de que ambos están de acuerdo antes de presentarlos"
        ]
      },
      "forB": {
        "benefit": "Lena facilita conversaciones ejecutivas en Oakridge Retail Collective sobre expansión regional y comercio minorista especializado en un espacio totalmente libre de ventas.",
        "shareableReason": "Lena es Executive Coach y Chair en Oakridge Retail Collective y guía diálogos sobre expansión regional escalable, justo en línea con la meta de Owen de crecer sin saturar a sus gerentes.",
        "missingInformation": [
          "Qué zonas nuevas evalúa abrir Crescent Food Products antes de definir su presupuesto",
          "Qué tareas gerenciales representan hoy el mayor cuello de botella al abrir una región"
        ]
      }
    }
  },
  {
    "a": "quinn.tran@rivertonadvisorygroup.example",
    "b": "tessa.price@highcrestworkforcesolutions.example",
    "pairScore": 88,
    "uncertainty": "Quinn Tran represents an event sponsor with automatic matching turned off, so the organizer or Wefter needs to get both people's agreement and introduce them personally, with zero sales pitches.",
    "evidence": [
      {
        "who": "a",
        "field": "goals",
        "quote": "Support the event within the sponsorship terms agreed with the organizer."
      },
      {
        "who": "a",
        "field": "offers",
        "quote": "Can provide general context on specialist advisory services."
      },
      {
        "who": "b",
        "field": "goals",
        "quote": "I want to set clear criteria for opening another location. Timing: within six months."
      },
      {
        "who": "b",
        "field": "offers",
        "quote": "We separated the effect of price changes from changes in what customers bought."
      }
    ],
    "discussion": {
      "why": "A two-way trade: Tessa shares a candid operator's view on separating price changes from buying habits while planning a new branch, and Quinn shares general, no-pitch market context on how service firms judge a new location.",
      "forA": {
        "heading": "Operator View on Pricing",
        "problem": "Quinn is attending as an event sponsor to support the program within the organizer's no-sales-pitch rules and wants grounded perspective from operating CEOs.",
        "whyMatch": "Tessa runs Highcrest Workforce Solutions, where her team separated the effect of price changes from shifts in what customers bought while setting six-month criteria for a new location.",
        "business": "Ask Tessa how she separated price changes from customer buying habits while deciding whether to open another branch.",
        "life": "How to contribute useful market perspective as an event sponsor while strictly respecting a pitch-free room."
      },
      "forB": {
        "heading": "Criteria for a New Location",
        "problem": "Within the next six months, Tessa wants to set clear criteria for opening another location at Highcrest Workforce Solutions.",
        "whyMatch": "Quinn is Managing Partner at Riverton Advisory Group and can share general, no-pitch context on what B2B service firms look for before opening a new regional office.",
        "business": "Ask Quinn which common benchmarks service firms check before committing to another location.",
        "life": "How to set clear first-quarter goals for a new branch before signing a lease or hiring local staff."
      }
    },
    "forA": {
      "score": 87,
      "benefit": "Tessa leads Highcrest Workforce Solutions and can offer an operator's view on separating price changes from customer mix shifts while planning a new branch.",
      "shareableReason": "Tessa is Owner & CEO of Highcrest Workforce Solutions and brings hands-on experience separating price changes from buying habits in an organizer-coordinated, pitch-free talk.",
      "missingInformation": [
        "Organizer confirmation of the approved sponsor discussion format",
        "Agreement from both Quinn and Tessa before arranging the introduction"
      ]
    },
    "forB": {
      "score": 89,
      "benefit": "Quinn is Managing Partner at Riverton Advisory Group and can share general, pitch-free context on how specialist service firms evaluate opening a new location.",
      "shareableReason": "Quinn leads Riverton Advisory Group and can provide general market context in an organizer-approved, no-pitch conversation as Tessa sets criteria for a new location.",
      "missingInformation": [
        "Which first-quarter numbers Highcrest Workforce Solutions plans to track in a new market",
        "Confirmation that Tessa wants an organizer-introduced, pitch-free conversation with a sponsor representative"
      ]
    },
    "es": {
      "uncertainty": "Quinn Tran representa a un patrocinador del evento y tiene desactivado el emparejamiento automático; el organizador o Wefter debe confirmar el acuerdo de ambos y presentarlos personalmente, sin discursos de ventas.",
      "discussion": {
        "why": "Un intercambio directo: Tessa aporta la experiencia real de una CEO separando cambios de precio y hábitos de compra mientras planea abrir otra sucursal, y Quinn aporta contexto general y libre de ventas sobre cómo evalúan nuevas plazas las firmas de servicios.",
        "forA": {
          "heading": "Precios y criterios de expansión",
          "problem": "Quinn participa como patrocinador para apoyar el evento bajo las reglas del organizador (sin discursos de ventas) y busca conocer de cerca cómo toman decisiones los CEOs operativos.",
          "whyMatch": "Tessa dirige Highcrest Workforce Solutions, donde su equipo separó el efecto de los cambios de precio frente a lo que compraban los clientes mientras define criterios a seis meses para abrir otra sucursal.",
          "business": "Pregúntale a Tessa cómo separó el impacto de los precios de los cambios en lo que compran los clientes mientras evalúa abrir otra ubicación.",
          "life": "Cómo aportar contexto útil como patrocinador respetando al cien por ciento un espacio libre de ventas."
        },
        "forB": {
          "heading": "Criterios para abrir otra ubicación",
          "problem": "En los próximos seis meses, Tessa quiere definir criterios claros para abrir otra ubicación en Highcrest Workforce Solutions.",
          "whyMatch": "Quinn es socio director en Riverton Advisory Group y puede compartir referencias generales, sin enfoque de ventas, sobre qué revisan las empresas de servicios antes de abrir una oficina regional.",
          "business": "Pregúntale a Quinn qué indicadores suelen revisar las empresas de servicios antes de comprometerse con una nueva sede.",
          "life": "Cómo definir metas claras para el primer trimestre de una sucursal nueva antes de comprometer capital y equipo."
        }
      },
      "forA": {
        "benefit": "Tessa dirige Highcrest Workforce Solutions y puede compartir la experiencia práctica de una operadora separando cambios de precio y mezcla de compra al evaluar una nueva sede.",
        "shareableReason": "Tessa es propietaria y CEO de Highcrest Workforce Solutions y aporta experiencia directa separando el efecto de precios y hábitos de compra en una charla coordinada por el organizador.",
        "missingInformation": [
          "Confirmación del organizador sobre el formato permitido para la charla con el patrocinador",
          "Acuerdo explícito de Quinn y Tessa antes de presentarlos"
        ]
      },
      "forB": {
        "benefit": "Quinn es socio director en Riverton Advisory Group y puede ofrecer contexto general, libre de ventas, sobre cómo evalúan nuevas ubicaciones las firmas de servicios.",
        "shareableReason": "Quinn lidera Riverton Advisory Group y puede compartir contexto general del sector en una conversación aprobada por el organizador y sin discursos comerciales.",
        "missingInformation": [
          "Qué indicadores del primer trimestre planea medir Highcrest Workforce Solutions en una plaza nueva",
          "Confirmación de que Tessa desea tener una charla de aprendizaje coordinada por el organizador"
        ]
      }
    }
  }
];
