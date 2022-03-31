import { App } from "@odoo/owl";
import { CommandResult, Model, Spreadsheet } from "../../src";
import { ChartTerms } from "../../src/components/translations_terms";
import { BACKGROUND_CHART_COLOR, MENU_WIDTH } from "../../src/constants";
import { Figure } from "../../src/types/figure";
import {
  createChart,
  createGaugeChart,
  createScorecardChart,
} from "../test_helpers/commands_helpers";
import {
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  makeTestFixture,
  mockChart,
  mountSpreadsheet,
  nextTick,
  spyDispatch,
  textContentAll,
} from "../test_helpers/helpers";

type TestChartType = "basicChart" | "scorecard" | "gauge";

const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: ["B1:B4"],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: "hello",
    background: BACKGROUND_CHART_COLOR,
    verticalAxisPosition: "left" as const,
    stackedBar: false,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: "hello",
    baselineDescr: "description",
    baselineMode: "absolute" as const,
  },
  gauge: {
    type: "gauge" as const,
    dataRange: "B1:B4",
    title: "hello",
    sectionRule: {
      rangeMin: "0",
      rangeMax: "100",
      colors: {
        lowerColor: "#6aa84f",
        middleColor: "#f1c232",
        upperColor: "#cc0000",
      },
      lowerInflectionPoint: {
        type: "number" as const,
        value: "33",
      },
      upperInflectionPoint: {
        type: "number" as const,
        value: "66",
      },
    },
  },
};

function createTestChart(type: TestChartType) {
  switch (type) {
    case "basicChart":
      createChart(model, TEST_CHART_DATA.basicChart, chartId);
      break;
    case "scorecard":
      createScorecardChart(model, TEST_CHART_DATA.scorecard, chartId);
      break;
    case "gauge":
      createGaugeChart(model, TEST_CHART_DATA.gauge, chartId);
      break;
  }
}

function getChartUIDefinition(chartType: TestChartType) {
  switch (chartType) {
    case "basicChart":
      return model.getters.getBasicChartDefinitionUI(sheetId, chartId);
    case "scorecard":
      return model.getters.getScorecardChartDefinitionUI(sheetId, chartId);
    case "gauge":
      return model.getters.getGaugeChartDefinitionUI(sheetId, chartId);
  }
}

function getChartRuntime(chartType: TestChartType) {
  switch (chartType) {
    case "basicChart":
      return model.getters.getBasicChartRuntime(chartId);
    case "scorecard":
      return model.getters.getScorecardChartRuntime(chartId);
    case "gauge":
      return model.getters.getGaugeChartRuntime(chartId);
  }
}

function errorMessages(): string[] {
  return textContentAll(".o-sidepanel-error div");
}

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

const originalGetBoundingClientRect = HTMLDivElement.prototype.getBoundingClientRect;
jest
  .spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
  // @ts-ignore the mock should return a complete DOMRect, not only { top, left }
  .mockImplementation(function (this: HTMLDivElement) {
    if (this.className.includes("o-spreadsheet")) {
      return { top: 100, left: 200 };
    } else if (this.className.includes("o-chart-container")) {
      return { top: 500, left: 500 };
    }
    return originalGetBoundingClientRect.call(this);
  });

let fixture: HTMLElement;
let model: Model;
let mockChartData = mockChart();
let chartId: string;
let sheetId: string;

let parent: Spreadsheet;
let app: App;
describe("figures", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    mockChartData = mockChart();
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
            B1: { content: "first column dataset" },
            C1: { content: "second column dataset" },
            B2: { content: "10" },
            B3: { content: "11" },
            B4: { content: "12" },
            B5: { content: "13" },
            C2: { content: "20" },
            C3: { content: "19" },
            C4: { content: "18" },
            A2: { content: "P1" },
            A3: { content: "P2" },
            A4: { content: "P3" },
            A5: { content: "P4" },
          },
        },
      ],
    };
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
    model = parent.model;
    await nextTick();
    await nextTick();
  });
  afterEach(() => {
    app.destroy();
    fixture.remove();
  });
  test.each(["basicChart", "scorecard", "gauge"])(
    "can export a chart %s",
    (chartType: TestChartType) => {
      createTestChart(chartType);
      const data = model.exportData();
      const activeSheetId = model.getters.getActiveSheetId();
      const sheet = data.sheets.find((s) => s.id === activeSheetId)!;
      expect(sheet.figures).toMatchObject([
        {
          data: {
            ...TEST_CHART_DATA[chartType],
          },
          id: chartId,
          height: 335,
          tag: "chart",
          width: 536,
          x: 0,
          y: 0,
        },
      ]);
    }
  );
  test.each(["basicChart", "scorecard", "gauge"])(
    "charts have a menu button",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      expect(fixture.querySelector(".o-chart-menu")).not.toBeNull();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Click on Menu button open context menu in %s",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      await simulateClick(".o-figure");
      expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
      expect(fixture.querySelector(".o-chart-menu")).not.toBeNull();
      await simulateClick(".o-chart-menu");
      expect(fixture.querySelector(".o-menu")).not.toBeNull();
    }
  );

  test.each(["scorecard", "basicChart", "gauge"])(
    "Context menu is positioned according to the spreadsheet position in %s",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      const menuPopover = fixture.querySelector(".o-menu")?.parentElement;
      expect(menuPopover?.style.top).toBe(`${500 - 100}px`);
      expect(menuPopover?.style.left).toBe(`${500 - 200 - MENU_WIDTH}px`);
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Click on Delete button will delete the chart %s",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      expect(getChartUIDefinition(chartType)).toMatchObject(TEST_CHART_DATA[chartType]);
      expect(fixture.querySelector(".o-figure")).not.toBeNull();
      await simulateClick(".o-figure");
      expect(document.activeElement).toBe(fixture.querySelector(".o-figure"));
      expect(fixture.querySelector(".o-chart-menu")).not.toBeNull();
      await simulateClick(".o-chart-menu");
      expect(fixture.querySelector(".o-menu")).not.toBeNull();
      const deleteButton = fixture.querySelectorAll(".o-menu-item")[1];
      expect(deleteButton.textContent).toBe("Delete");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(getChartRuntime(chartType)).toBeUndefined();
    }
  );

  test.each(["scorecard", "basicChart", "gauge"])(
    "Click on Edit button will prefill sidepanel",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      const editButton = fixture.querySelectorAll(".o-menu-item")[0];
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const panelChartType = fixture.querySelectorAll(".o-input")[0];
      switch (chartType) {
        case "basicChart": {
          const dataSeries = fixture.querySelectorAll(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          )[0];
          const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement)
            .checked;
          const labels = fixture.querySelector(".o-data-labels");
          expect((panelChartType as HTMLSelectElement).value).toBe(TEST_CHART_DATA.basicChart.type);
          expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.basicChart.dataSets[0]
          );
          expect(hasTitle).toBe(true);
          expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.basicChart.labelRange
          );
          break;
        }
        case "scorecard": {
          const keyValue = fixture.querySelector(
            ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
          );
          const baseline = fixture.querySelector(".o-data-labels");
          expect((panelChartType as HTMLSelectElement).value).toBe(TEST_CHART_DATA.scorecard.type);
          expect((keyValue!.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.scorecard.keyValue
          );
          expect((baseline!.querySelector(".o-selection input") as HTMLInputElement).value).toBe(
            TEST_CHART_DATA.scorecard.baseline
          );
          break;
        }
      }
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "can edit charts %s",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      const editButton = fixture.querySelectorAll(".o-menu-item")[0];
      expect(editButton.textContent).toBe("Edit");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      const dataSeries = fixture.querySelectorAll(
        ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
      )[0] as HTMLInputElement;
      const dataSeriesValues = dataSeries.querySelector("input");
      const dispatch = spyDispatch(parent);
      switch (chartType) {
        case "basicChart":
          setInputValueAndTrigger(dataSeriesValues, "B2:B4", "change");
          const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
          triggerMouseEvent(hasTitle, "click");
          expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
            id: chartId,
            sheetId,
            definition: {
              dataSets: ["B2:B4"],
              dataSetsHaveTitle: false,
            },
          });
          break;
        case "scorecard":
          setInputValueAndTrigger(dataSeriesValues, "B2:B4", "change");
          expect(dispatch).toHaveBeenLastCalledWith("CHANGE_RANGE", {
            value: "B2:B4",
            id: expect.anything(),
            rangeId: expect.anything(),
          });
          break;
      }
      await simulateClick(".o-panel .inactive");
      setInputValueAndTrigger(".o-chart-title input", "hello", "change");
      expect(dispatch).toHaveBeenLastCalledWith("UPDATE_CHART", {
        id: chartId,
        sheetId,
        definition: {
          title: "hello",
        },
      });
    }
  );

  test.each([
    ["basicChart", [".o-data-labels"], ["labelRange"]],
    ["scorecard", [".o-data-labels", ".o-data-series"], ["baseline", "keyValue"]],
    ["gauge", [".o-data-series"], ["dataRange"]],
  ])(
    "remove ranges in chart %s",
    async (chartType: TestChartType, rangesDomClasses, nameInChartDef) => {
      createTestChart(chartType);
      await nextTick();

      const figure = model.getters.getFigure(sheetId, chartId);
      for (let i = 0; i < rangesDomClasses.length; i++) {
        const domClass = rangesDomClasses[i];
        const attrName = nameInChartDef[i];
        expect(getChartUIDefinition(chartType)?.[attrName]).not.toBeUndefined();
        parent.env.openSidePanel("ChartPanel", { figure });
        await nextTick();
        await simulateClick(domClass + " input");
        setInputValueAndTrigger(domClass + " input", "", "change");
        await nextTick();
        await simulateClick(domClass + " .o-selection-ok");
        expect(parent.model.getters.getBasicChartDefinition(chartId)?.[attrName]).toBeUndefined();
      }
    }
  );

  test("drawing of chart will receive new data after update", async () => {
    createTestChart("basicChart");
    await nextTick();
    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    const editButton = fixture.querySelectorAll(".o-menu-item")[0];
    expect(editButton.textContent).toBe("Edit");
    await simulateClick(".o-menu div[data-name='edit']");
    await nextTick();
    expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
    const chartType = fixture.querySelectorAll(".o-input")[0] as HTMLSelectElement;
    const dataSeries = fixture.querySelectorAll(
      ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
    )[0] as HTMLInputElement;
    const dataSeriesValues = dataSeries.querySelector("input");
    const hasTitle = dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement;
    setInputValueAndTrigger(chartType, "pie", "change");
    setInputValueAndTrigger(dataSeriesValues, "B2:B5", "change");
    triggerMouseEvent(hasTitle, "click");
    await nextTick();
    expect((mockChartData.data! as any).labels).toEqual(["P1", "P2", "P3", ""]);
    expect((mockChartData.data! as any).datasets[0].data).toEqual([10, 11, 12, 13]);
    expect(mockChartData.type).toBe("pie");
    expect((mockChartData.options!.title as any).text).toBe("hello");
  });

  test.each(["basicChart", "scorecard", "gauge"])(
    "deleting chart %s will close sidePanel",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      await simulateClick(".o-menu div[data-name='delete']");
      expect(model.getters.getBasicChartRuntime("someuuid")).toBeUndefined();
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "can refresh a chart",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeFalsy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      await simulateClick(".o-figure");
      await simulateClick(".o-chart-menu");
      const dispatch = spyDispatch(parent);
      await simulateClick(".o-menu div[data-name='refresh']");
      expect(dispatch).toHaveBeenCalledWith("REFRESH_CHART", {
        id: "someuuid",
      });
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "selecting other chart will adapt sidepanel",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      createChart(model, {
        dataSets: ["C1:C4"],
        labelRange: "A2:A4",
        title: "second",
        type: "line",
      });
      await nextTick();
      const figures = fixture.querySelectorAll(".o-figure");
      await simulateClick(figures[0] as HTMLElement);
      await simulateClick(".o-chart-menu");
      await simulateClick(".o-menu div[data-name='edit']");
      await nextTick();
      expect(fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-chart")).toBeTruthy();
      await simulateClick(figures[1] as HTMLElement);
      await nextTick();
      const panelChartType = fixture.querySelectorAll(".o-input")[0];
      const dataSeries = fixture.querySelectorAll(
        ".o-sidePanel .o-sidePanelBody .o-chart .o-data-series"
      )[0];
      const hasTitle = (dataSeries.querySelector("input[type=checkbox]") as HTMLInputElement)
        .checked;
      const labels = fixture.querySelector(".o-data-labels");
      expect((panelChartType as HTMLSelectElement).value).toBe("line");
      expect((dataSeries.querySelector(" .o-selection input") as HTMLInputElement).value).toBe(
        "C1:C4"
      );
      expect(hasTitle).toBe(true);
      expect((labels!.querySelector(".o-selection input") as HTMLInputElement).value).toBe("A2:A4");
      await simulateClick(".o-panel .inactive");
      expect((fixture.querySelector(".o-panel .inactive") as HTMLElement).textContent).toBe(
        " Configuration "
      );
    }
  );

  test.each(["basicChart", "scorecard", "gauge"])(
    "Selecting a figure and hitting Ctrl does not unselect it",
    async (chartType: TestChartType) => {
      createTestChart(chartType);
      await nextTick();

      await simulateClick(".o-figure");
      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Control", bubbles: true })
      );
      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Control", bubbles: true })
      );

      expect(model.getters.getSelectedFigureId()).toBe("someuuid");
    }
  );

  test("Can remove the last data series", async () => {
    createTestChart("basicChart");
    await nextTick();

    await simulateClick(".o-figure");
    await simulateClick(".o-chart-menu");
    await simulateClick(".o-menu div[data-name='edit']");
    await simulateClick(".o-data-series .o-add-selection");
    const element = document.querySelectorAll(".o-data-series input")[1];
    setInputValueAndTrigger(element, "C1:C4", "change");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual([
      "B1:B4",
      "C1:C4",
    ]);
    const remove = document.querySelectorAll(".o-data-series .o-remove-selection")[1];
    await simulateClick(remove);
    expect(model.getters.getBasicChartDefinitionUI(sheetId, chartId)!.dataSets).toEqual(["B1:B4"]);
  });

  describe("Chart error messages", () => {
    test.each([
      ["basicChart", [CommandResult.EmptyDataSet]],
      ["scorecard", [CommandResult.EmptyScorecardKeyValue]],
      ["gauge", [CommandResult.EmptyGaugeDataRange]],
    ])(
      "update chart with empty dataset/keyValue/dataRange",
      async (chartType: TestChartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu");
        await simulateClick(".o-menu div[data-name='edit']");

        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each([
      ["basicChart", []],
      ["scorecard", []],
    ])(
      "update basic chart with empty labels/baseline",
      async (chartType: TestChartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu");
        await simulateClick(".o-menu div[data-name='edit']");

        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "", "change");
        await nextTick();
        await simulateClick(".o-data-labels .o-selection-ok");

        const expectedErrors = expectedResults.map((result) =>
          ChartTerms.Errors[result].toString()
        );

        expect(errorMessages()).toEqual(expectedErrors);
      }
    );

    test.each([
      ["basicChart", [CommandResult.InvalidDataSet]],
      ["scorecard", [CommandResult.InvalidScorecardKeyValue]],
      ["gauge", [CommandResult.InvalidGaugeDataRange]],
    ])(
      "update chart with invalid dataset/keyValue/dataRange",
      async (chartType: TestChartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu");
        await simulateClick(".o-menu div[data-name='edit']");
        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "This is not valid", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        expect(errorMessages()).toEqual(
          expectedResults.map((result) => ChartTerms.Errors[result].toString())
        );
      }
    );

    test.each([
      ["basicChart", [CommandResult.InvalidLabelRange]],
      ["scorecard", [CommandResult.InvalidScorecardBaseline]],
    ])(
      "update chart with invalid labels/baseline",
      async (chartType: TestChartType, expectedResults: CommandResult[]) => {
        createTestChart(chartType);
        await nextTick();

        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu");
        await simulateClick(".o-menu div[data-name='edit']");
        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "this is not valid", "change");
        await nextTick();
        await simulateClick(".o-data-labels .o-selection-ok");
        expect(errorMessages()).toEqual(
          expectedResults.map((result) => ChartTerms.Errors[result].toString())
        );
      }
    );

    describe("update chart with invalid section rule", () => {
      beforeEach(async () => {
        createTestChart("gauge");
        await nextTick();
        await simulateClick(".o-figure");
        await simulateClick(".o-chart-menu");
        await simulateClick(".o-menu div[data-name='edit']");
        // change configuration panel to design panel
        await simulateClick(".o-panel-design");
      });

      test("empty rangeMin", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMin].toString()
        );
      });

      test("NaN rangeMin", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "I'm not a number", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinNaN].toString()
        );
      });

      test("empty rangeMax", async () => {
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.EmptyGaugeRangeMax].toString()
        );
      });

      test("NaN rangeMax", async () => {
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "I'm not a number", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMaxNaN].toString()
        );
      });

      test("rangeMin > rangeMax", async () => {
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "100", "input");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "0", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeRangeMinBiggerThanRangeMax].toString()
        );
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-input-lowerInflectionPoint");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "I'm not a number", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeLowerInflectionPointNaN].toString()
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-input-upperInflectionPoint");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "I'm not a number", "input");
        await simulateClick(".o-section-rule-save");
        expect(errorMessages()[0]).toEqual(
          ChartTerms.Errors[CommandResult.GaugeUpperInflectionPointNaN].toString()
        );
      });
    });

    test.each(["scorecard"])(
      "error displayed on input fields",
      async (chartType: TestChartType) => {
        createTestChart(chartType);
        await nextTick();

        const model = parent.model;
        const sheetId = model.getters.getActiveSheetId();
        const figure = model.getters.getFigure(sheetId, chartId);
        parent.env.openSidePanel("ChartPanel", { figure });
        await nextTick();

        // empty dataset/key value
        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
        expect(document.querySelector(".o-data-labels input")?.classList).not.toContain(
          "o-invalid"
        );

        // invalid labels/baseline
        await simulateClick(".o-data-labels input");
        setInputValueAndTrigger(".o-data-labels input", "Invalid Label Range", "change");
        await simulateClick(".o-data-labels .o-selection-ok");
        expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
        expect(document.querySelector(".o-data-labels input")?.classList).toContain("o-invalid");
      }
    );

    describe("gauge > error displayed on input fields", () => {
      let model: Model;
      let sheetId: string;
      let figure: Figure | undefined;

      beforeEach(async () => {
        createTestChart("gauge");
        await nextTick();
        model = parent.model;
        sheetId = model.getters.getActiveSheetId();
        figure = model.getters.getFigure(sheetId, chartId);
        parent.env.openSidePanel("ChartPanel", { figure });
        await nextTick();
      });

      test("empty dataRange", async () => {
        await simulateClick(".o-data-series input");
        setInputValueAndTrigger(".o-data-series input", "", "change");
        await nextTick();
        await simulateClick(".o-data-series .o-selection-ok");
        expect(document.querySelector(".o-data-series input")?.classList).toContain("o-invalid");
      });

      test("empty rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "", "input");
        await nextTick();
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMin", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "bla bla bla", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
      });

      test("empty rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "bla bla bla", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("rangeMin > rangeMax", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-data-range-min");
        setInputValueAndTrigger(".o-data-range-min", "100", "input");
        await simulateClick(".o-data-range-max");
        setInputValueAndTrigger(".o-data-range-max", "0", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-data-range-min")?.classList).toContain("o-invalid");
        expect(document.querySelector(".o-data-range-max")?.classList).toContain("o-invalid");
      });

      test("NaN LowerInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-input-lowerInflectionPoint");
        setInputValueAndTrigger(".o-input-lowerInflectionPoint", "bla bla bla", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-input-lowerInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });

      test("NaN UpperInflectionPoint", async () => {
        await simulateClick(".o-panel-design");
        await simulateClick(".o-input-upperInflectionPoint");
        setInputValueAndTrigger(".o-input-upperInflectionPoint", "bla bla bla", "input");
        await simulateClick(".o-section-rule-save");
        expect(document.querySelector(".o-input-upperInflectionPoint")?.classList).toContain(
          "o-invalid"
        );
      });
    });
  });
});

describe("charts with multiple sheets", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    mockChartData = mockChart();
    const data = {
      sheets: [
        {
          name: "Sheet1",
          cells: {
            B1: { content: "first dataset" },
            B2: { content: "12" },
            B3: { content: "13" },
            B4: { content: "14" },
            C1: { content: "second dataset" },
            C2: { content: "2" },
            C3: { content: "3" },
            C4: { content: "4" },
            A2: { content: "Emily Anderson (Emmy)" },
            A3: { content: "Sophie Allen (Saffi)" },
            A4: { content: "Chloe Adams" },
          },
        },
        {
          name: "Sheet2",
          figures: [
            {
              id: "1",
              tag: "chart",
              width: 400,
              height: 300,
              x: 100,
              y: 100,
              data: {
                type: "line",
                title: "demo chart",
                labelRange: "Sheet1!A2:A4",
                dataSets: ["Sheet1!B1:B4", "Sheet1!C1:C4"],
                dataSetsHaveTitle: true,
              },
            },
            {
              id: "2",
              tag: "chart",
              width: 400,
              height: 300,
              x: 500,
              y: 300,
              data: {
                type: "scorecard",
                title: "demo scorecard",
                baseline: "Sheet1!A2:A4",
                keyValue: "Sheet1!B1:B4",
              },
            },
          ],
        },
      ],
    };
    ({ app, parent } = await mountSpreadsheet(fixture, { model: new Model(data) }));
    model = parent.model;
    await nextTick();
  });
  afterEach(() => {
    fixture.remove();
    app.destroy();
  });
  test("delete sheet containing chart data does not crash", async () => {
    expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toBe("Sheet1");
    model.dispatch("DELETE_SHEET", { sheetId: model.getters.getActiveSheetId() });
    const runtimeChart = model.getters.getBasicChartRuntime("1");
    expect(runtimeChart).toBeDefined();
    await nextTick();
    expect(fixture.querySelector(".o-chart-container")).not.toBeNull();
  });
});
