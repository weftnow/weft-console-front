import { attendees } from "./en/attendees";
import { auth } from "./en/auth";
import { common } from "./en/common";
import { errors } from "./en/errors";
import { events } from "./en/events";
import { insights } from "./en/insights";
import { nav } from "./en/nav";
import { network } from "./en/network";
import { organizations } from "./en/organizations";
import { sponsors } from "./en/sponsors";
import { wefter } from "./en/wefter";

/** Source of truth for the dictionary shape; `es.ts` must satisfy it. */
export const en = { common, nav, auth, events, attendees, network, insights, organizations, sponsors, errors, wefter } as const;
