// Manual regression runner for the brain dump extraction engine. Run with:
//   npx tsx server/scripts/testExtraction.ts
//
// There's no automated test framework in this project — this script exists
// so prompt/guardrail changes in extraction.ts / llmExtraction.ts can be
// eyeballed and spot-checked against a fixed set of transcripts instead of
// going through the Brain Dump UI by hand every time. It makes real OpenAI
// calls (needs OPENAI_API_KEY set).
import { extractionEngine, type ExtractionResult } from "../extraction";

interface Fixture {
  name: string;
  transcript: string;
  // Substrings that must NOT show up in tasks/appointments — these are the
  // precision failure modes (aspirations, venting, rhetorical questions,
  // hypothetical musing) that should land in notes/ideas instead.
  forbiddenInActionable?: string[];
  // Substrings that should show up somewhere in tasks/appointments —
  // recall checks for real, concrete commitments.
  expectActionable?: string[];
}

const FIXTURES: Fixture[] = [
  {
    name: "concrete task with day",
    transcript:
      "need to call the pediatrician tomorrow about jake's rash",
    expectActionable: ["pediatrician"],
  },
  {
    name: "concrete appointment",
    transcript: "dentist appointment thursday at 2",
    expectActionable: ["dentist"],
  },
  {
    name: "shopping phrased as a to-do",
    transcript:
      "we're out of milk and diapers, need to grab both at the store",
    expectActionable: [],
  },
  {
    name: "vague aspiration",
    transcript:
      "I really need to stop putting things off and be more organized",
    forbiddenInActionable: ["organized", "putting things off"],
  },
  {
    name: "venting",
    transcript:
      "ugh I am so behind on everything this week, this house is a disaster",
    forbiddenInActionable: ["disaster", "behind"],
  },
  {
    name: "rhetorical self-question",
    transcript: "did I ever text sarah back about the play date",
    forbiddenInActionable: ["sarah"],
  },
  {
    name: "hypothetical musing",
    transcript:
      "we should probably think about doing a garage sale sometime this summer",
    forbiddenInActionable: ["garage sale"],
  },
  {
    name: "prayer request",
    transcript: "please pray for my mom's surgery next week",
    forbiddenInActionable: ["surgery"],
  },
  {
    name: "idea + task mix",
    transcript:
      "what if we did a family game night sometime, also need to sign emma's permission slip by friday",
    expectActionable: ["permission slip"],
    forbiddenInActionable: ["game night"],
  },
  {
    name: "realistic rambling multi-category dump",
    transcript:
      "okay so tomorrow I need to drop off the library books and also pick up milk and eggs on the way home, " +
      "dentist for the kids is next tuesday at 9am, honestly I've been so tired lately I don't even know, " +
      "did we ever pay the water bill this month, oh also pray for grandma she's not feeling well, " +
      "and maybe sometime we should try doing meal prep on sundays",
    expectActionable: ["library books", "dentist"],
    forbiddenInActionable: ["tired", "meal prep"],
  },
];

function actionableText(result: ExtractionResult): string {
  return [
    ...result.tasks.map((t) => t.title),
    ...result.appointments.map((a) => a.title),
  ]
    .join(" | ")
    .toLowerCase();
}

function printResult(result: ExtractionResult) {
  const categories: [string, { confidence: number }[]][] = [
    ["appointments", result.appointments],
    ["tasks", result.tasks],
    ["shoppingItems", result.shoppingItems],
    ["notes", result.notes],
    ["ideas", result.ideas],
    ["prayerRequests", result.prayerRequests],
  ];
  for (const [name, items] of categories) {
    if (items.length === 0) continue;
    console.log(`  ${name}:`);
    for (const item of items as any[]) {
      const label = item.title ?? item.content ?? item.item;
      console.log(
        `    - [${item.confidence.toFixed(2)}] ${label}${item.dueDate ? ` (due ${item.dueDate})` : ""}${item.startTime ? ` (${item.startTime})` : ""}`,
      );
      console.log(`          ${item.reasoning}`);
    }
  }
}

async function main() {
  let failures = 0;

  for (const fixture of FIXTURES) {
    console.log(`\n=== ${fixture.name} ===`);
    console.log(`"${fixture.transcript}"`);

    const result = await extractionEngine.extract(fixture.transcript);
    printResult(result);

    const actionable = actionableText(result);

    for (const forbidden of fixture.forbiddenInActionable ?? []) {
      if (actionable.includes(forbidden.toLowerCase())) {
        console.log(
          `  FAIL: "${forbidden}" ended up in tasks/appointments — should be a note or idea.`,
        );
        failures++;
      }
    }

    for (const expected of fixture.expectActionable ?? []) {
      if (!actionable.includes(expected.toLowerCase())) {
        console.log(
          `  FAIL: expected "${expected}" to show up in tasks/appointments — nothing matched.`,
        );
        failures++;
      }
    }
  }

  console.log(
    failures === 0
      ? "\nAll checks passed."
      : `\n${failures} check(s) failed — see FAIL lines above.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
