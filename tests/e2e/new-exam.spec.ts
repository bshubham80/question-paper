import { expect, test, type Page } from "@playwright/test";
import { SETUPS } from "../../src/lib/setups";
import { SYLLABUS } from "../../src/lib/syllabus";
import { TOTAL, topicCount, unitCount } from "./bank";

const unitBox = (page: Page, n: number) => page.getByRole("checkbox", { name: new RegExp(`^${n}\\. `) });
const startButton = (page: Page) => page.getByRole("button", { name: /^Start exam/ });
const available = (page: Page) => page.getByText(/^\d+ available$/);
const unitSelect = (page: Page) => page.getByLabel("Unit", { exact: true });
const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const topicName = (id: string) => SYLLABUS.flatMap((u) => u.topics).find((t) => t.id === id)!.name;
const topicBox = (page: Page, id: string) => page.getByRole("checkbox", { name: new RegExp(`^${escapeRe(topicName(id))} `) });
const selectedLine = (page: Page) => page.getByText(/^Topics · \d+ of \d+ selected$/);
/** "Question 1 of 10" on desktop; "Q 1/10 · …" in the header on phones. */
const atQuestion = (page: Page, i: number, n: number) =>
  page.getByText(new RegExp(`^(Question ${i} of ${n}|Q ${i}/${n} · )`)).filter({ visible: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/new");
  await expect(page.getByRole("heading", { name: "New exam" })).toBeVisible();
});

test.describe("page layout", () => {
  test("shows the three setup steps and the navigation", async ({ page }) => {
    for (const step of ["What to practise", "Paper setup", "Number of questions and time"])
      await expect(page.getByRole("heading", { name: step })).toBeVisible();
    for (const link of ["Dashboard", "New exam", "History"]) await expect(page.getByRole("link", { name: link })).toBeVisible();
  });

  test("lists all 10 Commerce units with their question counts", async ({ page }) => {
    for (const u of SYLLABUS) {
      const box = unitBox(page, u.unit);
      await expect(box).toBeVisible();
      await expect(page.getByText(`${u.unit}. ${u.name}`, { exact: true })).toBeVisible();
      await expect(page.locator("label", { has: box }).getByText(`${unitCount(u.unit)} questions`, { exact: true })).toBeVisible();
    }
  });
});

test.describe("defaults", () => {
  test("starts in across-subjects mode with every unit selected", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Across subjects" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "By topic" })).toHaveAttribute("aria-pressed", "false");
    for (const u of SYLLABUS) await expect(unitBox(page, u.unit)).toBeChecked();
    await expect(available(page)).toHaveText(`${TOTAL} available`);
  });

  test("Balanced Mix, 25 questions and real-exam pace are preselected", async ({ page }) => {
    await expect(page.getByRole("radio", { name: /Balanced Mix/ })).toBeChecked();
    await expect(page.getByRole("button", { name: "25", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Real exam pace (30 min)" })).toHaveAttribute("aria-pressed", "true");
    await expect(startButton(page)).toHaveText("Start exam · 25 questions");
    await expect(startButton(page)).toBeEnabled();
  });
});

test.describe("choosing units (across subjects)", () => {
  test("Clear deselects everything and disables Start", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    for (const u of SYLLABUS) await expect(unitBox(page, u.unit)).not.toBeChecked();
    await expect(available(page)).toHaveText("0 available");
    await expect(startButton(page)).toBeDisabled();
  });

  test("Select all brings every unit back", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByRole("button", { name: "Select all" }).click();
    for (const u of SYLLABUS) await expect(unitBox(page, u.unit)).toBeChecked();
    await expect(available(page)).toHaveText(`${TOTAL} available`);
  });

  test("unticking and re-ticking a unit updates the available count", async ({ page }) => {
    await unitBox(page, 7).uncheck();
    await expect(available(page)).toHaveText(`${TOTAL - unitCount(7)} available`);
    await unitBox(page, 7).check();
    await expect(available(page)).toHaveText(`${TOTAL} available`);
  });

  test("picking two units counts only those", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await unitBox(page, 3).check();
    await unitBox(page, 9).check();
    await expect(available(page)).toHaveText(`${unitCount(3) + unitCount(9)} available`);
    await expect(startButton(page)).toBeEnabled();
  });
});

test.describe("by-topic mode", () => {
  const unit7 = SYLLABUS.find((u) => u.unit === 7)!;

  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: "By topic" }).click();
  });

  test("replaces the unit cards with a unit dropdown and topic checkboxes, all ticked", async ({ page }) => {
    await expect(page.getByRole("button", { name: "By topic" })).toHaveAttribute("aria-pressed", "true");
    await expect(unitBox(page, 1)).toHaveCount(0);
    await expect(unitSelect(page)).toHaveValue("7");
    for (const t of unit7.topics) await expect(topicBox(page, t.id)).toBeChecked();
    await expect(selectedLine(page)).toHaveText(`Topics · ${unit7.topics.length} of ${unit7.topics.length} selected`);
    await expect(available(page)).toHaveText(`${unitCount(7)} available`);
  });

  test("lists every sub-topic of the chosen unit with its question count", async ({ page }) => {
    await expect(page.getByRole("checkbox")).toHaveCount(unit7.topics.length);
    for (const t of unit7.topics)
      await expect(page.locator("label", { has: topicBox(page, t.id) })).toContainText(`${topicCount(t.id)} questions`);
  });

  test("ticking several topics adds up their question counts", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await topicBox(page, "u07-t03").check();
    await expect(available(page)).toHaveText(`${topicCount("u07-t03")} available`);
    await topicBox(page, "u07-t05").check();
    await topicBox(page, "u07-t10").check();
    await expect(available(page)).toHaveText(`${topicCount("u07-t03") + topicCount("u07-t05") + topicCount("u07-t10")} available`);
    await expect(selectedLine(page)).toHaveText(`Topics · 3 of ${unit7.topics.length} selected`);
    await topicBox(page, "u07-t05").uncheck();
    await expect(available(page)).toHaveText(`${topicCount("u07-t03") + topicCount("u07-t10")} available`);
  });

  test("Clear unticks every topic, warns and disables Start; Select all restores", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    for (const t of unit7.topics) await expect(topicBox(page, t.id)).not.toBeChecked();
    await expect(page.getByText("Tick at least one topic.")).toBeVisible();
    await expect(available(page)).toHaveText("0 available");
    await expect(startButton(page)).toBeDisabled();
    await page.getByRole("button", { name: "Select all" }).click();
    await expect(available(page)).toHaveText(`${unitCount(7)} available`);
    await expect(page.getByText("Tick at least one topic.")).toHaveCount(0);
  });

  test("changing the unit shows that unit's topics, all ticked", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await unitSelect(page).selectOption("2");
    const unit2 = SYLLABUS[1];
    await expect(page.getByRole("checkbox")).toHaveCount(unit2.topics.length);
    for (const t of unit2.topics) await expect(topicBox(page, t.id)).toBeChecked();
    await expect(available(page)).toHaveText(`${unitCount(2)} available`);
  });

  test("switching back to across subjects keeps the earlier unit selection", async ({ page }) => {
    await page.getByRole("button", { name: "Across subjects" }).click();
    for (const u of SYLLABUS) await expect(unitBox(page, u.unit)).toBeChecked();
    await expect(available(page)).toHaveText(`${TOTAL} available`);
  });
});

test.describe("links from other pages", () => {
  test("?unit= opens by-topic mode on that unit with every topic ticked", async ({ page }) => {
    await page.goto("/new?unit=4");
    await expect(page.getByRole("button", { name: "By topic" })).toHaveAttribute("aria-pressed", "true");
    await expect(unitSelect(page)).toHaveValue("4");
    await expect(available(page)).toHaveText(`${unitCount(4)} available`);
  });

  test("?unit=&topic= preselects one sub-topic", async ({ page }) => {
    await page.goto("/new?unit=7&topic=u07-t10");
    await expect(unitSelect(page)).toHaveValue("7");
    await expect(topicBox(page, "u07-t10")).toBeChecked();
    await expect(topicBox(page, "u07-t01")).not.toBeChecked();
    await expect(available(page)).toHaveText(`${topicCount("u07-t10")} available`);
  });

  test("repeated &topic= preselects several sub-topics; unknown ids are ignored", async ({ page }) => {
    await page.goto("/new?unit=7&topic=u07-t02&topic=u07-t09&topic=u03-t01");
    await expect(topicBox(page, "u07-t02")).toBeChecked();
    await expect(topicBox(page, "u07-t09")).toBeChecked();
    await expect(selectedLine(page)).toHaveText(/^Topics · 2 of /);
    await expect(available(page)).toHaveText(`${topicCount("u07-t02") + topicCount("u07-t09")} available`);
  });
});

test.describe("paper setup", () => {
  test("offers exactly the three setups from the skill, word for word", async ({ page }) => {
    await expect(page.getByRole("radio")).toHaveCount(3);
    for (const s of Object.values(SETUPS)) {
      const card = page.locator("label", { has: page.getByRole("radio", { name: new RegExp(s.label) }) });
      await expect(card).toContainText(s.label);
      await expect(card).toContainText(s.description);
    }
  });

  test("only one setup can be selected at a time", async ({ page }) => {
    await page.getByText("Analytical Mix", { exact: true }).click();
    await expect(page.getByRole("radio", { name: /Analytical Mix/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Balanced Mix/ })).not.toBeChecked();
    await page.getByText("Assertion-Focused", { exact: true }).click();
    await expect(page.getByRole("radio", { name: /Assertion-Focused/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Analytical Mix/ })).not.toBeChecked();
  });
});

test.describe("number of questions", () => {
  for (const [n, minutes] of [
    [10, 12],
    [25, 30],
    [50, 60],
    [100, 120],
  ] as const) {
    test(`preset ${n} → button and real-exam pace show ${minutes} min`, async ({ page }) => {
      await page.getByRole("button", { name: String(n), exact: true }).click();
      await expect(page.getByRole("button", { name: String(n), exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(startButton(page)).toHaveText(`Start exam · ${n} questions`);
      await expect(page.getByRole("button", { name: `Real exam pace (${minutes} min)` })).toBeVisible();
    });
  }

  test("custom number updates the button and un-highlights presets", async ({ page }) => {
    await page.getByLabel("Custom number of questions").fill("37");
    await expect(startButton(page)).toHaveText("Start exam · 37 questions");
    for (const n of [10, 25, 50, 100]) await expect(page.getByRole("button", { name: String(n), exact: true })).toHaveAttribute("aria-pressed", "false");
  });

  test("custom number below 1 is raised to 1", async ({ page }) => {
    await page.getByLabel("Custom number of questions").fill("0");
    await expect(page.getByLabel("Custom number of questions")).toHaveValue("1");
    await expect(startButton(page)).toHaveText("Start exam · 1 questions");
  });

  test("asking for more than the bank has shows a warning and caps the exam", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await unitBox(page, 1).check();
    await page.getByRole("button", { name: "100", exact: true }).click();
    const n = unitCount(1);
    await expect(page.getByText(`Only ${n} questions match this selection — the exam will have ${n}.`)).toBeVisible();
    await expect(startButton(page)).toHaveText(`Start exam · ${n} questions`);
  });

  test("no warning when the bank has enough", async ({ page }) => {
    await expect(page.getByText(/^Only \d+ questions match/)).toHaveCount(0);
  });
});

test.describe("timer", () => {
  test("Custom reveals a minutes box; other options hide it", async ({ page }) => {
    await expect(page.getByLabel("Minutes")).toHaveCount(0);
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await expect(page.getByRole("button", { name: "Custom", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Minutes")).toHaveValue("30");
    await page.getByRole("button", { name: "Untimed" }).click();
    await expect(page.getByRole("button", { name: "Untimed" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Minutes")).toHaveCount(0);
  });

  test("real-exam pace follows the capped question count", async ({ page }) => {
    await page.goto("/new?unit=7&topic=u07-t10");
    const n = topicCount("u07-t10");
    await expect(page.getByRole("button", { name: `Real exam pace (${Math.round((n * 72) / 60)} min)` })).toBeVisible();
  });
});

test.describe("starting an exam", () => {
  const timeLeft = (page: Page) => page.locator('[title="Time left"]');
  const timeElapsed = (page: Page) => page.locator('[title="Time elapsed"]');

  test("across subjects: opens the exam with the chosen size, setup and pace timer", async ({ page }) => {
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page).toHaveURL(/\/exam\/[0-9a-f-]{36}$/);
    await expect(atQuestion(page, 1, 10)).toBeVisible();
    await expect(page.getByText("All units", { exact: true })).toBeVisible();
    await expect(page.getByText("Balanced Mix · 10 questions")).toBeAttached();
    await expect(timeLeft(page)).toHaveText(/^(12:00|11:[0-5]\d)$/);
  });

  test("shows 'Preparing exam…' while the exam is being created", async ({ page }) => {
    // Hold the server action for a moment; locally it is too quick to observe the pending state.
    await page.route("**/new", async (route) => {
      if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page.getByRole("button", { name: "Preparing exam…" })).toBeDisabled();
    await expect(page).toHaveURL(/\/exam\//);
  });

  test("shows the server's error message if the exam cannot be created", async ({ page }) => {
    // Tamper with the submitted units so the real server-side validation rejects the request.
    await page.route("**/new", async (route) => {
      const body = route.request().postData();
      if (route.request().method() !== "POST" || !body) return route.continue();
      await route.continue({ postData: body.replace(/"units":\[[^\]]*\]/, '"units":[]') });
    });
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page.getByText("Select at least one unit.")).toBeVisible();
    await expect(page).toHaveURL(/\/new$/);
    await expect(startButton(page)).toBeEnabled();
  });

  test("selected units only: the title names the units", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await unitBox(page, 2).check();
    await unitBox(page, 5).check();
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page.getByText("Units 2, 5", { exact: true })).toBeVisible();
    await expect(atQuestion(page, 1, 10)).toBeVisible();
  });

  test("single topic: capped to the topic's size, titled with the topic name", async ({ page }) => {
    await page.goto("/new?unit=7&topic=u07-t10");
    const n = topicCount("u07-t10");
    await startButton(page).click();
    await expect(atQuestion(page, 1, n)).toBeVisible();
    await expect(page.getByText("Insurance: types, principles, IRDAI and ombudsman", { exact: true })).toBeVisible();
  });

  test("several topics: exam draws only from them and is titled '<unit> · N topics'", async ({ page }) => {
    await page.goto("/new?unit=7&topic=u07-t01&topic=u07-t07");
    const n = topicCount("u07-t01") + topicCount("u07-t07");
    await startButton(page).click();
    await expect(atQuestion(page, 1, n)).toBeVisible();
    await expect(page.getByText("Banking and Financial Institutions · 2 topics", { exact: true })).toBeVisible();
  });

  test("whole unit: titled '(whole unit)'", async ({ page }) => {
    await page.goto("/new?unit=3");
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page.getByText("Business Economics (whole unit)", { exact: true })).toBeVisible();
  });

  test("chosen paper setup is carried into the exam", async ({ page }) => {
    await page.getByText("Assertion-Focused", { exact: true }).click();
    await page.getByRole("button", { name: "10", exact: true }).click();
    await startButton(page).click();
    await expect(page.getByText("Assertion-Focused · 10 questions")).toBeAttached();
  });

  test("custom timer starts from the chosen minutes", async ({ page }) => {
    await page.getByRole("button", { name: "10", exact: true }).click();
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Minutes").fill("5");
    await startButton(page).click();
    await expect(timeLeft(page)).toHaveText(/^(05:00|04:[0-5]\d)$/);
  });

  test("untimed exam shows elapsed time counting up", async ({ page }) => {
    await page.getByRole("button", { name: "10", exact: true }).click();
    await page.getByRole("button", { name: "Untimed" }).click();
    await startButton(page).click();
    await expect(timeElapsed(page)).toHaveText(/^00:0\d$/);
    await expect(timeLeft(page)).toHaveCount(0);
  });

  test("the new exam appears in History as in progress", async ({ page }) => {
    await page.getByRole("button", { name: "Clear" }).click();
    await unitBox(page, 6).check();
    await page.getByLabel("Custom number of questions").fill("7");
    await startButton(page).click();
    await expect(atQuestion(page, 1, 7)).toBeVisible();
    const examPath = new URL(page.url()).pathname;

    await page.goto("/history");
    // A table row on desktop, a card on phones.
    const row = page.locator("tr, li").filter({ has: page.locator(`a[href="${examPath}"]`) }).filter({ visible: true });
    await expect(row).toContainText("Business Management and Human Resource Management");
    await expect(row).toContainText("Across subjects");
    await expect(row).toContainText("Balanced Mix");
    await expect(row).toContainText("—/7");
    await expect(row).toContainText("In progress");
    await expect(row.getByRole("link", { name: "Resume" })).toBeVisible();
  });
});
