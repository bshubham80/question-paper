import { expect, test, type Locator, type Page } from "@playwright/test";
import { SYLLABUS } from "../../src/lib/syllabus";

// Phone-layout checks at a typical small phone size. They run once, in the "mobile" project.
const W = 375;
const H = 812;
test.skip(({ isMobile }) => !isMobile, "phone layout is checked in the mobile project");
test.use({ viewport: { width: W, height: H } });

async function expectNoSideScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width, `page is ${width}px wide on a ${W}px screen`).toBeLessThanOrEqual(W);
}

async function expectOnScreen(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(W + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(H + 1);
}

const startButton = (page: Page) => page.getByRole("button", { name: /^Start exam/ });
const tabBar = (page: Page) => page.getByRole("navigation", { name: "Main" });
const examBar = (page: Page) => page.getByRole("navigation", { name: "Question navigation" });
const position = (page: Page) => page.locator("header").getByText(/^Q \d+\/\d+ · /);

/** Starts an exam from /new and returns its path. */
async function startExam(page: Page, { count = 5, unit }: { count?: number; unit?: number } = {}) {
  await page.goto("/new");
  if (unit) {
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByRole("checkbox", { name: new RegExp(`^${unit}\\. `) }).check();
  }
  await page.getByLabel("Custom number of questions").fill(String(count));
  await startButton(page).click();
  await expect(page).toHaveURL(/\/exam\//);
  await expect(examBar(page)).toBeVisible();
  return new URL(page.url()).pathname;
}

/** Answers the current question with option a and submits. Returns the results path. */
async function answerAndSubmit(page: Page) {
  await page.getByRole("button", { name: /^a\s/ }).click();
  await page.locator("header").getByRole("button", { name: "Submit" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit" }).click();
  await expect(page).toHaveURL(/\/results\//);
  return new URL(page.url()).pathname;
}

test.describe("A. nothing is wider than the screen", () => {
  test("dashboard, new exam, exam, results and history all fit 375px", async ({ page }) => {
    await page.goto("/");
    await expectNoSideScroll(page);

    await page.goto("/new");
    await expectNoSideScroll(page);
    await page.getByRole("button", { name: "By topic" }).click();
    await expectNoSideScroll(page);

    await startExam(page);
    await expectNoSideScroll(page);

    await answerAndSubmit(page);
    await expectNoSideScroll(page);

    await page.goto("/");
    await expectNoSideScroll(page);
    await page.goto("/history");
    await expectNoSideScroll(page);
  });

  test("long unit names wrap inside the dashboard cards", async ({ page }) => {
    await page.goto("/");
    const longest = page.getByText("6. Business Management and Human Resource Management", { exact: true });
    const box = (await longest.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(W);
  });
});

test.describe("A2. history on phones", () => {
  test("each exam is a card with score, %, time taken and a Review button", async ({ page }) => {
    await startExam(page, { count: 3, unit: 8 });
    const results = await answerAndSubmit(page);

    await page.goto("/history");
    await expect(page.getByRole("table")).toBeHidden();
    const card = page.getByRole("listitem").filter({ has: page.locator(`a[href="${results}"]`) });
    await expect(card).toContainText("Marketing Management");
    await expect(card).toContainText(/\d\/3/);
    await expect(card).toContainText(/\d+%/);
    await expect(card).toContainText("Time taken");
    // Other tests add exams in parallel, so the card may be further down the list: check it isn't cut off sideways.
    const review = (await card.getByRole("link", { name: "Review" }).boundingBox())!;
    expect(review.x + review.width).toBeLessThanOrEqual(W);
  });

  test("an unsubmitted exam shows In progress and a Resume button", async ({ page }) => {
    const exam = await startExam(page, { count: 2, unit: 9 });
    await page.goto("/history");
    const card = page.getByRole("listitem").filter({ has: page.locator(`a[href="${exam}"]`) });
    await expect(card).toContainText("In progress");
    await expect(card.getByRole("link", { name: "Resume" })).toBeVisible();
  });

  test("the unit filter applies as soon as a unit is picked", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByRole("button", { name: "Filter" })).toHaveCount(0);
    const filter = page.getByLabel("Filter by unit");
    const box = (await filter.boundingBox())!;
    expect(box.width).toBeGreaterThan(W - 40); // full width
    await filter.selectOption("7");
    await expect(page).toHaveURL(/\/history\?unit=7$/);
    await filter.selectOption("");
    await expect(page).toHaveURL(/\/history$/);
  });
});

test.describe("A3 + B. exam screen", () => {
  test("action bar is always on screen, even after scrolling a long question", async ({ page }) => {
    await startExam(page, { count: 10 });
    await expectOnScreen(examBar(page));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expectOnScreen(examBar(page));
    for (const name of ["Previous question", "All questions", "Mark for review and go to next", "Save and next question"])
      await expectOnScreen(examBar(page).getByRole("button", { name }));
  });

  test("Next, Prev and Mark work from the bottom bar", async ({ page }) => {
    await startExam(page, { count: 5 });
    await expect(position(page)).toHaveText(/^Q 1\/5/);
    await examBar(page).getByRole("button", { name: "Save and next question" }).click();
    await expect(position(page)).toHaveText(/^Q 2\/5/);
    await examBar(page).getByRole("button", { name: "Previous question" }).click();
    await expect(position(page)).toHaveText(/^Q 1\/5/);

    await examBar(page).getByRole("button", { name: "Mark for review and go to next" }).click();
    await expect(position(page)).toHaveText(/^Q 2\/5/);
    await examBar(page).getByRole("button", { name: "Previous question" }).click();
    await expect(examBar(page).getByRole("button", { name: "Unmark review" })).toHaveAttribute("aria-pressed", "true");
  });

  test("question panel slides up on screen; tapping a number jumps there and closes it", async ({ page }) => {
    await startExam(page, { count: 8 });
    await examBar(page).getByRole("button", { name: "All questions" }).click();
    const sheet = page.getByRole("dialog", { name: "All questions" });
    await expectOnScreen(sheet.getByRole("button", { name: /^Question 1,/ }));
    await expectOnScreen(sheet.getByRole("button", { name: /^Question 8,/ }));
    await expect(sheet).toContainText("Not visited");

    await sheet.getByRole("button", { name: /^Question 4,/ }).click();
    await expect(sheet).toBeHidden();
    await expect(position(page)).toHaveText(/^Q 4\/8/);
  });

  test("question panel closes with Close and with Escape", async ({ page }) => {
    await startExam(page, { count: 3 });
    const sheet = page.getByRole("dialog", { name: "All questions" });
    await examBar(page).getByRole("button", { name: "All questions" }).click();
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toBeHidden();
    await examBar(page).getByRole("button", { name: "All questions" }).click();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("header shows position, answered count and a progress bar", async ({ page }) => {
    await startExam(page, { count: 4 });
    await expect(position(page)).toHaveText("Q 1/4 · 0 answered");
    await page.getByRole("button", { name: /^b\s/ }).click();
    await expect(position(page)).toHaveText("Q 1/4 · 1 answered");
    await expect(page.getByRole("progressbar", { name: "Questions answered" })).toHaveAttribute("aria-valuenow", "1");
  });

  test("Clear response appears under the options once answered", async ({ page }) => {
    await startExam(page, { count: 3 });
    const clear = page.getByRole("button", { name: "Clear response" }).filter({ visible: true });
    await expect(clear).toHaveCount(0);
    await page.getByRole("button", { name: /^c\s/ }).click();
    await expect(page.getByRole("button", { name: /^c\s/ })).toHaveAttribute("aria-pressed", "true");
    await clear.click();
    await expect(page.getByRole("button", { name: /^c\s/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("question card uses the full screen width", async ({ page }) => {
    await startExam(page, { count: 2 });
    const box = (await page.locator("section").first().boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(W - 1);
  });

  test("site tab bar is not shown during an exam", async ({ page }) => {
    await startExam(page, { count: 2 });
    await expect(tabBar(page)).toHaveCount(0);
  });
});

test.describe("C. new exam page", () => {
  test("Start bar is visible without scrolling and sits just above the tab bar", async ({ page }) => {
    await page.goto("/new");
    await expectOnScreen(startButton(page));
    const start = (await page.getByTestId("start-bar").boundingBox())!;
    const tabs = (await tabBar(page).boundingBox())!;
    expect(start.y + start.height).toBeLessThanOrEqual(tabs.y + 1);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await expectOnScreen(startButton(page));
  });

  test("all 10 units fit in about one screen, with large checkboxes", async ({ page }) => {
    await page.goto("/new");
    const boxes = page.getByRole("checkbox");
    await expect(boxes).toHaveCount(SYLLABUS.length);
    const first = (await boxes.first().boundingBox())!;
    const last = (await boxes.last().boundingBox())!;
    expect(last.y + last.height - first.y).toBeLessThan(H);
    expect(first.width).toBeGreaterThanOrEqual(20);
  });

  test("text boxes and dropdowns use 16px text so iPhones don't zoom in", async ({ page }) => {
    const fontSize = (l: Locator) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    await page.goto("/new");
    expect(await fontSize(page.getByLabel("Custom number of questions"))).toBeGreaterThanOrEqual(16);
    await page.getByRole("button", { name: "Custom", exact: true }).click();
    expect(await fontSize(page.getByLabel("Minutes"))).toBeGreaterThanOrEqual(16);
    await page.getByRole("button", { name: "By topic" }).click();
    expect(await fontSize(page.getByLabel("Unit", { exact: true }))).toBeGreaterThanOrEqual(16);
    await page.goto("/history");
    expect(await fontSize(page.getByLabel("Filter by unit"))).toBeGreaterThanOrEqual(16);
  });
});

test.describe("D. tab bar and results tidy-up", () => {
  test("bottom tab bar replaces the header links and highlights the current page", async ({ page }) => {
    await page.goto("/");
    await expectOnScreen(tabBar(page));
    await expect(page.locator("header").getByRole("link", { name: "History" })).toHaveCount(0);
    await expect(tabBar(page).getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

    await tabBar(page).getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(tabBar(page).getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
    await expect(tabBar(page).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");

    await tabBar(page).getByRole("link", { name: "New exam" }).click();
    await expect(page.getByRole("heading", { name: "New exam" })).toBeVisible();
  });

  test("page content is not hidden behind the tab bar", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const lastCard = (await page.locator("main section").last().boundingBox())!;
    const tabs = (await tabBar(page).boundingBox())!;
    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(tabs.y + 1);
  });

  test("results: even 2×2 score cards, full-width buttons, review filters in one row", async ({ page }) => {
    await startExam(page, { count: 4 });
    await answerAndSubmit(page);

    const cards = page.locator("main .grid.grid-cols-2 > .card");
    await expect(cards).toHaveCount(4);
    const boxes = await Promise.all([0, 1, 2, 3].map(async (i) => (await cards.nth(i).boundingBox())!));
    expect(new Set(boxes.map((b) => Math.round(b.width))).size).toBe(1); // same width
    expect(Math.round(boxes[0].y)).toBe(Math.round(boxes[1].y)); // two per row
    expect(Math.round(boxes[2].y)).toBe(Math.round(boxes[3].y));
    expect(boxes[2].y).toBeGreaterThan(boxes[0].y);

    const del = (await page.getByRole("button", { name: "Delete" }).boundingBox())!;
    const again = (await page.getByRole("link", { name: "Practise again" }).boundingBox())!;
    expect(del.width + again.width).toBeGreaterThan(W - 50);

    const chips = page.getByTestId("review-filters").getByRole("button");
    await expect(chips).toHaveCount(5);
    const tops = await Promise.all([0, 1, 2, 3, 4].map(async (i) => Math.round((await chips.nth(i).boundingBox())!.y)));
    expect(new Set(tops).size).toBe(1);
    await expectNoSideScroll(page);
  });
});
