import {
  connectionKinds,
  demandReasons,
  goalResults,
  type ReportBreakdown,
  type ReportCount,
  type ReportProjection,
  type ReportQuery,
  type ReportingEvidence,
} from "./reporting-contract";
import {
  agreedValue,
  compareSegments,
  compareText,
  groupBy,
  keyLabel,
  rate,
  segmentLabel,
  segmentOptions,
  textLabel,
  type PreparedReportEvent,
} from "./reporting-source";

const followUpStages = ["followUp", "secondMeeting", "opportunity"] as const;
const coverageBuckets = ["zero", "one", "twoOrMore"] as const;
export const dayInMilliseconds = 86_400_000;

type Participant = ReportingEvidence["participants"][number];
type FollowUpStage = typeof followUpStages[number];

function surveyCoverage(people: Participant[]): ReportCount | undefined {
  if (!people.some((person) => person.surveyInvited !== undefined)) return undefined;
  const invited = people.filter((person) => person.surveyInvited === true);
  return {
    count: invited.filter((person) => person.surveyResponded === true).length,
    total: invited.length,
  };
}

function goalCounts(answers: (Participant["goals"][number]["result"])[]): ReportCount[] {
  const total = answers.filter((answer) => answer !== null).length;
  return goalResults.map((result) => ({ count: answers.filter((answer) => answer === result).length, total }));
}

export function projectGoals(source: PreparedReportEvent | undefined, segment: string | undefined): ReportProjection {
  const participants = [...source?.participants.values() ?? []];
  const selected = participants.filter((person) => segment === undefined || person.segment === segment);
  const respondents = selected.filter((person) => person.goals.some((goal) => goal.result !== null));
  const count = respondents.filter((person) => person.goals.some((goal) => goal.result === "achieved")).length;
  const details: Record<string, ReportBreakdown> = {};

  const rows = connectionKinds.flatMap((kind) => {
    const peopleWithGoal = selected.flatMap((person) => {
      const goal = person.goals.find((entry) => entry.kind === kind);
      return goal ? [{ person, answer: goal.result }] : [];
    });
    if (!peopleWithGoal.length) return [];
    const counts = goalCounts(peopleWithGoal.map(({ answer }) => answer));

    const segments = groupBy(peopleWithGoal, ({ person }) => person.segment);
    details[kind] = {
      columns: ["segment", ...goalResults, "responses", "eligible", "surveyResponses", "surveyInvited"],
      rows: [...segments.keys()].sort(compareSegments).map((segment, index) => {
        const group = segments.get(segment)!;
        const byResult = goalCounts(group.map(({ answer }) => answer));
        const feedback = surveyCoverage(group.map(({ person }) => person));
        return {
          id: String(index),
          cells: [
            segmentLabel(segment),
            ...byResult.map(({ count }) => textLabel(count)),
            textLabel(byResult[0].total ?? 0),
            textLabel(group.length),
            feedback ? textLabel(feedback.count) : keyLabel("unknown"),
            feedback ? textLabel(feedback.total ?? 0) : keyLabel("unknown"),
          ],
        };
      }),
    };

    return [{ id: kind, label: keyLabel(kind), values: counts.map(rate), counts }];
  });

  return {
    id: "goals",
    status: respondents.length ? "ready" : "unavailable",
    measure: respondents.length ? { count, total: respondents.length } : undefined,
    responseCoverage: surveyCoverage(selected),
    columns: ["goal", ...goalResults],
    rows,
    breakdown: {
      columns: ["goal", ...goalResults, "responses"],
      rows: rows.map(({ id, label, counts }) => ({
        id,
        cells: [label, ...counts.map(({ count }) => textLabel(count)), textLabel(counts[0].total ?? 0)],
      })),
    },
    details,
    options: segmentOptions(participants.map((person) => person.segment)),
  };
}

export function projectDemand(
  source: PreparedReportEvent | undefined,
  segment: string | undefined,
  now: number,
): ReportProjection {
  const requests = source?.event.evidence?.requests;
  const projection: ReportProjection = { id: "demand", status: "unavailable", columns: ["connectionType", "open"], rows: [] };
  if (!source || requests == null) return projection;
  // A revision records request state, with no timestamps for reconstructing an earlier cutoff.
  if (now < source.endsAt) return { ...projection, status: "collecting" };

  const recorded = [...groupBy(requests, (request) => request.id).values()].flatMap((group) => {
    const personId = agreedValue(group.map((request) => request.personId));
    const kind = agreedValue(group.map((request) => request.kind));
    const status = agreedValue(group.map((request) => request.status));
    const reason = agreedValue(group.map((request) => request.reason));
    return personId && source.people.has(personId) && kind && status ? [{ personId, kind, status, reason }] : [];
  });
  const options = segmentOptions(recorded.map((request) => source.participants.get(request.personId)?.segment));
  const selected = recorded.filter((request) =>
    segment === undefined || source.participants.get(request.personId)?.segment === segment);
  const details: Record<string, ReportBreakdown> = {};
  let open = 0;

  const rows = [...groupBy(selected, (request) => request.kind)].map(([kind, group]) => {
    const unresolved = group.filter((request) => request.status === "open");
    open += unresolved.length;
    const reasons = groupBy(unresolved, (request) => request.reason ?? "unknown");
    const segments = groupBy(unresolved, (request) => source.participants.get(request.personId)?.segment);
    const requestingPeople = new Set(unresolved.map((request) => request.personId));
    const goals = new Map<Participant["goals"][number]["kind"], number>();
    for (const personId of requestingPeople) {
      for (const goal of source.participants.get(personId)?.goals ?? []) {
        goals.set(goal.kind, (goals.get(goal.kind) ?? 0) + 1);
      }
    }

    details[kind] = {
      columns: ["breakdown", "category", "count"],
      rows: [
        ...demandReasons.map((reason) => ({
          id: reason,
          cells: [keyLabel("reason"), keyLabel(reason), textLabel(reasons.get(reason)?.length ?? 0)],
        })),
        ...[...segments.keys()].sort(compareSegments).map((segment, index) => ({
          id: `segment:${index}`,
          cells: [keyLabel("segment"), segmentLabel(segment), textLabel(segments.get(segment)?.length ?? 0)],
        })),
        ...connectionKinds.filter((goal) => goals.has(goal)).map((goal) => ({
          id: `goal:${goal}`,
          cells: [keyLabel("goal"), keyLabel(goal), textLabel(goals.get(goal)!)],
        })),
      ],
    };

    return {
      id: kind,
      label: keyLabel(kind),
      values: [unresolved.length],
      counts: [{ count: unresolved.length, total: group.length }],
    };
  }).sort((a, b) => b.values[0] - a.values[0] || compareText(a.id, b.id));

  return {
    ...projection,
    status: "ready",
    measure: { count: open, total: selected.length },
    rows,
    breakdown: {
      columns: ["connectionType", "open", "requests"],
      rows: rows.map(({ id, label, counts: [count] }) => ({
        id,
        cells: [label, textLabel(count.count), textLabel(count.total)],
      })),
    },
    details,
    options,
  };
}

type PairCheckIn = {
  method?: PreparedReportEvent["event"]["matches"][number]["method"];
  responded: boolean;
  answers: Record<FollowUpStage, boolean | undefined>;
};

function stageCount(pairs: PairCheckIn[], stage: FollowUpStage): ReportCount {
  return {
    count: pairs.filter((pair) => pair.answers[stage] === true).length,
    total: pairs.filter((pair) => pair.answers[stage] !== undefined).length,
  };
}

export function projectFollowThrough(
  source: PreparedReportEvent | undefined,
  window: ReportQuery["window"],
  now: number,
): ReportProjection {
  const projection: ReportProjection = { id: "follow-through", status: "unavailable", columns: ["stage", "rate"], rows: [] };
  if (!source) return projection;

  const collecting = now < source.endsAt + window * dayInMilliseconds;
  const checkIns = groupBy(source.event.evidence?.followUps.filter((entry) => entry.window === window) ?? [],
    (entry) => entry.matchId);
  const pairs: PairCheckIn[] = [];
  if (!collecting) {
    for (const matches of source.completedPairs.values()) {
      const responses = matches.flatMap((match) => checkIns.get(match.id) ?? []);
      pairs.push({
        method: agreedValue(matches.map((match) => match.method)),
        responded: responses.some((entry) => followUpStages.some((stage) => entry[stage] !== null)),
        answers: {
          followUp: agreedValue(responses.map((entry) => entry.followUp)),
          secondMeeting: agreedValue(responses.map((entry) => entry.secondMeeting)),
          opportunity: agreedValue(responses.map((entry) => entry.opportunity)),
        },
      });
    }
  }

  const methods = groupBy(pairs, (pair) => pair.method ?? "unknown");
  const details: Record<string, ReportBreakdown> = {};
  const rows = followUpStages.map((stage) => {
    const count = stageCount(pairs, stage);
    details[stage] = {
      columns: ["method", "reported", "responses", "checkedIn", "due"],
      rows: [...methods.keys()].sort(compareText).map((method) => {
        const group = methods.get(method)!;
        const answers = stageCount(group, stage);
        return {
          id: method,
          cells: [
            keyLabel(method), textLabel(answers.count), textLabel(answers.total ?? 0),
            textLabel(group.filter((pair) => pair.responded).length), textLabel(group.length),
          ],
        };
      }),
    };
    return { id: stage, label: keyLabel(stage), values: [rate(count)], counts: [count] };
  });

  const lead = rows[0].counts[0];
  const hasUsableAnswers = rows.some((row) => row.values[0] !== null);
  return {
    ...projection,
    status: collecting ? "collecting" : hasUsableAnswers ? "ready" : "unavailable",
    measure: lead.total ? lead : undefined,
    responseCoverage: { count: pairs.filter((pair) => pair.responded).length, total: pairs.length },
    rows,
    breakdown: {
      columns: ["stage", "reported", "responses"],
      rows: rows.map(({ id, label, counts: [count] }) => ({
        id,
        cells: [label, textLabel(count.count), textLabel(count.total ?? 0)],
      })),
    },
    details,
  };
}

export function projectCoverage(source: PreparedReportEvent | undefined, segment: string | undefined): ReportProjection {
  const projection: ReportProjection = { id: "coverage", status: "unavailable", columns: ["segment", ...coverageBuckets], rows: [] };
  if (!source?.tracking) return projection;

  const eligible = [...source.people.values()].filter((person) => person.eligible);
  // Choose the basis at event level so a segment cannot silently fall back to the roster.
  const attendance = [...source.participants.values()].some((person) => person.attended !== undefined);
  const basis = attendance ? "attendance" : "roster";
  const people = eligible.flatMap(({ personId }) => {
    const participant = source.participants.get(personId);
    return !attendance || participant?.attended === true ? [{ personId, segment: participant?.segment, networkKey: participant?.networkKey }] : [];
  });
  const options = segmentOptions(eligible.map(({ personId }) => source.participants.get(personId)?.segment));
  const selected = people.filter((person) => segment === undefined || person.segment === segment);
  const introductions = new Map<string, number>();
  for (const [match] of source.completedPairs.values()) {
    for (const id of match.personIds) introductions.set(id, (introductions.get(id) ?? 0) + 1);
  }

  const previous = new Set(source.event.priorNetworkKeys);
  const groupByHistory = source.event.priorNetworkKeys !== undefined && selected.some((person) => person.networkKey);
  const groups = groupBy(selected, (person) => {
    if (!groupByHistory) return person.segment;
    if (!person.networkKey) return "identityUnknown";
    return previous.has(person.networkKey) ? "returning" : "firstTracked";
  });
  const details: Record<string, ReportBreakdown> = {};
  let introduced = 0;
  const rows = [...groups.keys()].sort(compareSegments).map((segment) => {
    const group = groups.get(segment)!;
    const counts = coverageBuckets.map(() => ({ count: 0, total: group.length }));
    for (const person of group) {
      const completed = introductions.get(person.personId) ?? 0;
      counts[Math.min(completed, 2)].count += 1;
      if (completed) introduced += 1;
    }
    const id = segment === undefined ? "unsegmented" : `segment:${segment}`;
    details[id] = {
      columns: ["bucket", "count", "eligible"],
      rows: coverageBuckets.map((bucket, index) => ({
        id: bucket,
        cells: [keyLabel(bucket), textLabel(counts[index].count), textLabel(group.length)],
      })),
    };
    for (const row of details[id].rows) {
      details[`${id}:${row.id}`] = { columns: details[id].columns, rows: [row] };
    }
    return { id, label: groupByHistory && segment ? keyLabel(segment) : segmentLabel(segment), values: counts.map(rate), counts };
  });

  return {
    ...projection,
    status: selected.length ? "ready" : "unavailable",
    measure: selected.length ? { count: introduced, total: selected.length } : undefined,
    basis,
    rows,
    breakdown: {
      columns: [groupByHistory ? "attendanceHistory" : "segment", ...coverageBuckets, "eligible"],
      rows: rows.map(({ id, label, counts }) => ({
        id,
        cells: [label, ...counts.map(({ count }) => textLabel(count)), textLabel(counts[0].total)],
      })),
    },
    details,
    options,
  };
}
