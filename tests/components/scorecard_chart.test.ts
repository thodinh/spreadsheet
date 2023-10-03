import { Model } from "../../src";
import {
  formatBaselineDescr,
  ScorecardChartDesign,
  ScorecardChartDrawer,
} from "../../src/helpers/figures/charts";
import { UID } from "../../src/types";
import {
  ScorecardChartDefinition,
  ScorecardChartRuntime,
} from "../../src/types/chart/scorecard_chart";
import { MockCanvasRenderingContext2D } from "../setup/canvas.mock";
import {
  createScorecardChart as createScorecardChartHelper,
  setCellContent,
  updateChart,
} from "../test_helpers/commands_helpers";
import { dragElement, getElStyle, simulateClick } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick, target } from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;
let chartId: string;
let sheetId: string;

function getChartElement(): HTMLElement {
  return fixture.querySelector(".o-figure")!;
}

async function createScorecardChart(
  model: Model,
  data: Partial<ScorecardChartDefinition>,
  chartId?: UID,
  sheetId?: UID
) {
  createScorecardChartHelper(model, data, chartId, sheetId);
  await nextTick();
}

async function updateScorecardChartSize(width: number, height: number) {
  model.dispatch("UPDATE_FIGURE", {
    sheetId,
    id: chartId,
    x: 0,
    y: 0,
    width,
    height,
  });
  await nextTick();
}

function getFontSize(font: string) {
  return Number(font.match(/([0-9\.]*)px/)?.[1]);
}

function getScorecardData(chartId: UID): ScorecardChartDesign {
  const canvas = document.createElement("canvas");
  const figure = model.getters.getFigure(sheetId, chartId)!;
  const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
  const drawer = new ScorecardChartDrawer({ figure }, canvas, runtime);
  return drawer.computeChart();
}

let scorecardChartStyle;

describe("Scorecard charts snapshots", () => {
  beforeEach(async () => {
    chartId = "someuuid";
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A1: { content: "2" },
            A2: { content: "3" },
            A3: { content: "2.1234" },
            B1: { content: "1" },
            B2: { content: "2" },
            B3: { content: "3" },
          },
        },
      ],
    };
    ({ model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("Scorecard snapshot", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    expect(getChartElement()).toMatchSnapshot();
  });

  test("scorecard text is resized while figure is resized", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    await simulateClick(".o-figure");
    expect(getElStyle(".o-figure-wrapper", "width")).toBe("536px");
    expect(getElStyle(".o-figure-wrapper", "height")).toBe("335px");
    await dragElement(".o-fig-anchor.o-topLeft", { x: 300, y: 200 });
    expect(getElStyle(".o-figure-wrapper", "width")).toBe("236px");
    expect(getElStyle(".o-figure-wrapper", "height")).toBe("135px");
    // force a triggering of all resizeObservers to ensure the grid is resized
    //@ts-ignore
    window.resizers.resize();
    await nextTick();
    expect(getChartElement()).toMatchSnapshot();
  });
});

describe("Scorecard charts rendering", () => {
  beforeEach(async () => {
    chartId = "someuuid";
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A1: { content: "2" },
            A2: { content: "3" },
            A3: { content: "2.1234" },
            B1: { content: "1" },
            B2: { content: "2" },
            B3: { content: "3" },
          },
        },
      ],
    };
    ({ model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
    scorecardChartStyle = {
      title: {
        fontSize: 0,
        color: "",
      },
      key: {
        fontSize: 0,
        color: "",
      },
      baseline: {
        fontSize: 0,
        color: "",
      },
      baselineDescr: {
        fontSize: 0,
        color: "",
      },
    };
    jest
      .spyOn(MockCanvasRenderingContext2D.prototype, "fillText")
      .mockImplementation(function (
        this: MockCanvasRenderingContext2D,
        text: string,
        x: number,
        y: number
      ) {
        const runtime = model.getters.getChartRuntime(chartId) as ScorecardChartRuntime;
        if (runtime.baselineDisplay === text) {
          scorecardChartStyle.baseline.fontSize = getFontSize(this.font);
          scorecardChartStyle.baseline.color = this.fillStyle;
          scorecardChartStyle.baseline.bold = this.font.includes("bold");
          scorecardChartStyle.baseline.italic = this.font.includes("italic");
        } else if (text === runtime.keyValue) {
          scorecardChartStyle.key.fontSize = getFontSize(this.font);
          scorecardChartStyle.key.color = this.fillStyle;
          scorecardChartStyle.key.bold = this.font.includes("bold");
          scorecardChartStyle.key.italic = this.font.includes("italic");
        } else if (text === runtime.title) {
          scorecardChartStyle.title.fontSize = getFontSize(this.font);
          scorecardChartStyle.title.color = this.fillStyle;
          scorecardChartStyle.title.bold = this.font.includes("bold");
          scorecardChartStyle.title.italic = this.font.includes("italic");
        } else if (text === formatBaselineDescr(runtime.baselineDescr, runtime.baselineDisplay)) {
          scorecardChartStyle.baselineDescr.fontSize = getFontSize(this.font);
          scorecardChartStyle.baselineDescr.color = this.fillStyle;
          scorecardChartStyle.baselineDescr.bold = this.font.includes("bold");
          scorecardChartStyle.baselineDescr.italic = this.font.includes("italic");
        }
      });
  });

  afterEach(() => {
    jest.spyOn(MockCanvasRenderingContext2D.prototype, "fillText").mockRestore();
  });

  test("Baseline with mode 'text' is plainly displayed", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "text" },
      chartId
    );
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#525252");
  });

  test("Key < baseline display in red with down arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#DC6965");
  });

  test("Key > baseline display in green with up arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#00A04A");
  });

  test("Key = baseline display default font color with no arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#525252");
  });

  test("Key value and baseline are displayed with the cell style", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: {
        textColor: "#FF0000",
        bold: true,
        italic: true,
      },
    });
    await createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
    for (const style of [scorecardChartStyle.key, scorecardChartStyle.baseline]) {
      expect(style.italic).toEqual(true);
      expect(style.bold).toEqual(true);
      expect(style.color).toBeSameColorAs("#FF0000");
    }
  });

  test("Baseline mode percentage don't inherit of the style of the cell", async () => {
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: { bold: true },
      format: "0.0",
    });
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    expect(scorecardChartStyle.baseline.bold).not.toEqual(true);
  });

  test("High contrast font colors with dark background", async () => {
    await createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "A1",
        baselineDescr: "descr",
        title: "title",
        background: "#000000",
      },
      chartId
    );

    expect(scorecardChartStyle.title.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.baseline.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.baselineDescr.color).toBeSameColorAs("#C8C8C8");
    expect(scorecardChartStyle.key.color).toBeSameColorAs("#FFFFFF");
  });

  test("Increasing size of the chart scale up the font sizes", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );

    await updateScorecardChartSize(100, 100);

    const baselineFontSize = scorecardChartStyle.baseline.fontSize;
    const titleFontSize = scorecardChartStyle.title.fontSize;
    const keyFontSize = scorecardChartStyle.key.fontSize;

    await updateScorecardChartSize(200, 200);

    expect(scorecardChartStyle.baseline.fontSize).toBeGreaterThan(baselineFontSize);
    expect(scorecardChartStyle.title.fontSize).toEqual(titleFontSize);
    expect(scorecardChartStyle.key.fontSize).toBeGreaterThan(keyFontSize);
  });

  test("Decreasing size of the chart scale down the font sizes", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );

    await updateScorecardChartSize(200, 200);

    const baselineFontSize = scorecardChartStyle.baseline.fontSize;
    const titleFontSize = scorecardChartStyle.title.fontSize;
    const keyFontSize = scorecardChartStyle.key.fontSize;

    await updateScorecardChartSize(100, 100);

    expect(scorecardChartStyle.baseline.fontSize).toBeLessThan(baselineFontSize);
    expect(scorecardChartStyle.title.fontSize).toEqual(titleFontSize);
    expect(scorecardChartStyle.key.fontSize).toBeLessThan(keyFontSize);
  });

  test("Font size scale down if we put a long key value", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
    const baselineFontSize = scorecardChartStyle.baseline.fontSize;
    const titleFontSize = scorecardChartStyle.title.fontSize;
    const keyFontSize = scorecardChartStyle.key.fontSize;
    setCellContent(model, "A1", "123456789123456789123456789");
    await nextTick();
    expect(scorecardChartStyle.baseline.fontSize).toBeLessThan(baselineFontSize);
    expect(scorecardChartStyle.title.fontSize).toEqual(titleFontSize);
    expect(scorecardChartStyle.key.fontSize).toBeLessThan(keyFontSize);
  });

  test("Font size scale up if we remove a long description", async () => {
    await createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "B2",
        baselineDescr: "This is a very very very very long description",
      },
      chartId
    );
    const baselineFontSize = scorecardChartStyle.baseline.fontSize;
    updateChart(model, chartId, { baselineDescr: "" }, sheetId);
    await nextTick();
    expect(scorecardChartStyle.baseline.fontSize).toBeGreaterThan(baselineFontSize);
  });
});

describe("Scorecard charts computation", () => {
  beforeEach(async () => {
    chartId = "someuuid";
    sheetId = "Sheet1";
    const data = {
      sheets: [
        {
          name: sheetId,
          colNumber: 10,
          rowNumber: 10,
          rows: {},
          cells: {
            A1: { content: "2" },
            A2: { content: "3" },
            A3: { content: "2.1234" },
            B1: { content: "1" },
            B2: { content: "2" },
            B3: { content: "3" },
          },
        },
      ],
    };
    ({ model, fixture } = await mountSpreadsheet({ model: new Model(data) }));
  });

  test("Chart display correct info", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", title: "hello", baselineDescr: "description" },
      chartId
    );
    const chartData = getScorecardData(chartId);

    expect(chartData.title.text).toEqual("hello");
    expect(chartData.baseline.text).toEqual("1");
    expect(chartData.baselineDescr.text).toEqual(" description");
    expect(chartData.key.text).toEqual("2");
  });

  test("Baseline = 0 correctly displayed", async () => {
    setCellContent(model, "B1", "0");
    setCellContent(model, "A1", "0");
    await createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    const chartData = getScorecardData(chartId);

    expect(chartData.key.text).toEqual("0");
    expect(chartData.baseline.text).toEqual("0");
    expect(chartData.baselineDescr).toBeUndefined();
    expect(chartData.baselineArrow.text).toEqual("");
  });

  test("Percentage baseline display a percentage", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    const chartData = getScorecardData(chartId);

    expect(chartData.baseline.text).toEqual("100%");
  });

  test("Baseline with mode 'text' is plainly displayed", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "text" },
      chartId
    );
    const chartData = getScorecardData(chartId);

    expect(chartData.baseline.text).toEqual("1");
    expect(chartData.baseline.style.color).toBeSameColorAs("#525252");
  });

  test("Key < baseline display in red with down arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B3" }, chartId);
    const chartData = getScorecardData(chartId);

    expect(chartData.baselineArrow.text).toBe("\u{1F873}");
    expect(chartData.baselineArrow.style.color).toBeSameColorAs("#DC6965");
    expect(chartData.baseline.style.color).toBeSameColorAs("#DC6965");
    expect(chartData.baseline.text).toEqual("1");
  });

  test("Key > baseline display in green with up arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B1" }, chartId);
    const chartData = getScorecardData(chartId);

    expect(chartData.baselineArrow.text).toBe("\u{1F871}");
    expect(chartData.baselineArrow.style.color).toBeSameColorAs("#00A04A");
    expect(chartData.baseline.style.color).toBeSameColorAs("#00A04A");
    expect(chartData.baseline.text).toEqual("1");
  });

  test("Key = baseline display default font color with no arrow", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "B2" }, chartId);
    const chartData = getScorecardData(chartId);

    expect(chartData.baselineArrow.text).toBe("");
    expect(chartData.baseline.style.color).toBeSameColorAs("#525252");
    expect(chartData.baseline.text).toEqual("0");
  });

  test("Key value is displayed with the cell evaluated format", async () => {
    await createScorecardChart(model, { keyValue: "C1" }, chartId);
    setCellContent(model, "C1", "=A1");
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      format: "0%",
    });
    const chartData = getScorecardData(chartId);
    expect(chartData.key.text).toEqual("200%");
  });

  test("Baseline is displayed with the cell evaluated format", async () => {
    setCellContent(model, "C1", "=B2");
    await createScorecardChart(model, { keyValue: "A3", baseline: "C1" }, chartId);
    let chartData = getScorecardData(chartId);
    expect(chartData.baseline.text).toEqual((0.12).toLocaleString());

    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B2"),
      format: "[$$]#,##0.00",
    });
    await nextTick();
    chartData = getScorecardData(chartId);
    expect(chartData.baseline.text).toEqual("$0.12");
  });

  test("Baseline with lot of decimal is truncated", async () => {
    setCellContent(model, "C1", "=B2");
    await createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    const chartData = getScorecardData(chartId);
    expect(chartData.baseline.text).toEqual((0.12).toLocaleString());
    expect(getCellContent(model, "A3")).toEqual("2.1234");
  });

  test("Baseline with lot of decimal isn't truncated if the cell has a format", async () => {
    await createScorecardChart(model, { keyValue: "A3", baseline: "B2" }, chartId);
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B2"),
      format: "[$$]#,####0.0000",
    });
    await nextTick();
    const chartData = getScorecardData(chartId);
    expect(chartData.baseline.text).toEqual("$0.1234");
  });

  test("Baseline percentage mode format has priority over cell format", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("B1"),
      format: "[$$]#,####0.0000",
    });
    await nextTick();
    const chartData = getScorecardData(chartId);
    expect(chartData.baseline.text).toEqual("100%");
  });

  test("Key value and baseline are displayed with the cell style", async () => {
    await createScorecardChart(model, { keyValue: "A1", baseline: "A1" }, chartId);
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: {
        textColor: "#FF0000",
        bold: true,
        italic: true,
        strikethrough: true,
        underline: true,
      },
    });
    const chartData = getScorecardData(chartId);
    for (const style of [chartData.key.style, chartData.baseline.style]) {
      expect(style.font.includes("bold")).toBeTruthy();
      expect(style.font.includes("italic")).toBeTruthy();
      expect(style.color).toBeSameColorAs("#FF0000");
      expect(style.strikethrough).not.toBeUndefined();
      expect(style.underline).not.toBeUndefined();
    }
  });

  test("Baseline mode percentage don't inherit of the style/format of the cell", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B1", baselineMode: "percentage" },
      chartId
    );
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1"),
      style: { bold: true },
      format: "0.0",
    });
    const chartData = getScorecardData(chartId);
    expect(chartData.baseline.style.font.includes("bold")).toBeFalsy();
    expect(chartData.baseline.text).toEqual("100%");
  });

  test("High contrast font colors with dark background", async () => {
    await createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "A1",
        baselineDescr: "descr",
        title: "title",
        background: "#000000",
      },
      chartId
    );
    const chartData = getScorecardData(chartId);

    expect(chartData.title.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartData.baseline.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartData.baselineDescr.style.color).toBeSameColorAs("#C8C8C8");
    expect(chartData.key.style.color).toBeSameColorAs("#FFFFFF");
  });

  test("Font size scale down if we put a long key value", async () => {
    await createScorecardChart(
      model,
      { keyValue: "A1", baseline: "B2", title: "This is a title" },
      chartId
    );
    const chartData1 = getScorecardData(chartId);
    setCellContent(model, "A1", "123456789123456789123456789");
    await nextTick();
    const chartData2 = getScorecardData(chartId);
    expect(getFontSize(chartData2.baseline.style.font)).toBeLessThan(
      getFontSize(chartData1.baseline.style.font)
    );
    expect(getFontSize(chartData2.title.style.font)).toEqual(
      getFontSize(chartData1.title.style.font)
    );
    expect(getFontSize(chartData2.key.style.font)).toBeLessThan(
      getFontSize(chartData1.key.style.font)
    );
  });

  test("Font size scale up if we remove a long description", async () => {
    await createScorecardChart(
      model,
      {
        keyValue: "A1",
        baseline: "B2",
        baselineDescr: "This is a very very very very long description",
      },
      chartId
    );
    const chartData1 = getScorecardData(chartId);
    updateChart(model, chartId, { baselineDescr: "" }, sheetId);
    await nextTick();
    const chartData2 = getScorecardData(chartId);
    expect(getFontSize(chartData2.baseline.style.font)).toBeGreaterThan(
      getFontSize(chartData1.baseline.style.font)
    );
  });
});
