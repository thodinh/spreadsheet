import { Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import {
  addDataValidation,
  merge,
  resizeColumns,
  resizeRows,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getStylePropertyInPx, mountSpreadsheet, nextTick } from "../test_helpers/helpers";
// import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

// mockGetBoundingClientRect({
//     "o-grid-overlay": { width: 1000, height: 1000 },
// });

describe("Checkbox overlay", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    ({ fixture, model } = await mountSpreadsheet({ model }));
  });

  test("checkbox container has the size fo the cell and hides overflows", async () => {
    addDataValidation(model, "B2", "id", { type: "isCheckbox", values: [] });
    resizeRows(model, [1], 100);
    resizeColumns(model, ["B"], 100);
    await nextTick();

    const container = fixture.querySelector<HTMLElement>(".o-dv-checkbox-container")!;
    expect(getStylePropertyInPx(container, "width")).toBe(100);
    expect(getStylePropertyInPx(container, "height")).toBe(100);
    expect(getStylePropertyInPx(container, "left")).toBe(DEFAULT_CELL_WIDTH);
    expect(getStylePropertyInPx(container, "top")).toBe(DEFAULT_CELL_HEIGHT);

    expect(container.classList).toContain("overflow-hidden");
  });

  test("Clicking on the checkbox changes the cell content", async () => {
    addDataValidation(model, "B2", "id", { type: "isCheckbox", values: [] });
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe(undefined);
    expect(checkbox.checked).toBe(false);

    await click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("true");

    await click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("false");
  });

  test("Checkboxes on formula cells have the right value but checkbox is disabled", async () => {
    addDataValidation(model, "B2", "id", { type: "isCheckbox", values: [] });
    setCellContent(model, "A1", "TRUE");
    setCellContent(model, "B2", "=A1");
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    expect(checkbox.checked).toBe(true);

    await click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(model.getters.getCell({ sheetId, col: 1, row: 1 })?.content).toBe("=A1");

    setCellContent(model, "A1", "FALSE");
    await nextTick();
    expect(checkbox.checked).toBe(false);
  });

  test("Clicking on the checkbox also selects the cell", async () => {
    addDataValidation(model, "B2", "id", { type: "isCheckbox", values: [] });
    await nextTick();

    const checkbox = fixture.querySelector<HTMLInputElement>(".o-dv-checkbox")!;
    triggerMouseEvent(checkbox, "mousedown", DEFAULT_CELL_WIDTH, DEFAULT_CELL_HEIGHT);

    expect(model.getters.getSelectedZone()).toEqual(toZone("B2"));
  });

  test("Checkboxes with merge: only a single checkbox is displayed on the center of th merge", async () => {
    addDataValidation(model, "A1:B2", "id", { type: "isCheckbox", values: [] });
    setCellContent(model, "A1", "TRUE");
    merge(model, "A1:B2");
    await nextTick();

    const container = fixture.querySelector<HTMLElement>(".o-dv-checkbox-container")!;
    expect(getStylePropertyInPx(container, "width")).toBe(2 * DEFAULT_CELL_WIDTH);
    expect(getStylePropertyInPx(container, "height")).toBe(2 * DEFAULT_CELL_HEIGHT);
    expect(getStylePropertyInPx(container, "left")).toBe(0);
    expect(getStylePropertyInPx(container, "top")).toBe(0);
  });
});
