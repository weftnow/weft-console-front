import { attendees } from "./es/attendees";
import { auth } from "./es/auth";
import { common } from "./es/common";
import { errors } from "./es/errors";
import { events } from "./es/events";
import { insights } from "./es/insights";
import { nav } from "./es/nav";
import { network } from "./es/network";
import { organizations } from "./es/organizations";
import { sponsors } from "./es/sponsors";
import { wefter } from "./es/wefter";
import type { Dictionary } from "./types";

export const es = { common, nav, auth, events, attendees, network, insights, organizations, sponsors, errors, wefter } satisfies Dictionary;
