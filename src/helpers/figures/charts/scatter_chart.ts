import { ChartDataset } from "chart.js";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import { ChartCreationContext, DataSet, ExcelChartDefinition } from "../../../types/chart/chart";
import { LegendPosition, VerticalAxisPosition } from "../../../types/chart/common_chart";
import { ScatterChartDefinition, ScatterChartRuntime } from "../../../types/chart/scatter_chart";
import { Validator } from "../../../types/validator";
import { formatValue } from "../../format";
import { createRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { createLineOrScatterChartRuntime } from "./chart_common_line_scatter";
import { getChartDatasetFormat, getChartLabelFormat } from "./chart_ui_common";

export class ScatterChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly verticalAxisPosition: VerticalAxisPosition;
  readonly legendPosition: LegendPosition;
  readonly labelsAsText: boolean;
  readonly aggregated?: boolean;
  readonly type = "scatter";
  readonly dataSetsHaveTitle: boolean;

  constructor(definition: ScatterChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(this.getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.verticalAxisPosition = definition.verticalAxisPosition;
    this.legendPosition = definition.legendPosition;
    this.labelsAsText = definition.labelsAsText;
    this.aggregated = definition.aggregated;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ScatterChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    definition: ScatterChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ScatterChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): ScatterChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      labelsAsText: false,
      legendPosition: "top",
      title: context.title || "",
      type: "scatter",
      verticalAxisPosition: "left",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: false,
    };
  }

  getDefinition(): ScatterChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ScatterChartDefinition {
    return {
      type: "scatter",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId)
      ),
      legendPosition: this.legendPosition,
      verticalAxisPosition: this.verticalAxisPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
      labelsAsText: this.labelsAsText,
      aggregated: this.aggregated,
    };
  }

  getContextCreation(): ChartCreationContext {
    return {
      background: this.background,
      title: this.title,
      range: this.dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  updateRanges(applyChange: ApplyRangeChange): ScatterChart {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new ScatterChart(definition, this.sheetId, this.getters);
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined; // TODO
  }

  copyForSheetId(sheetId: UID): ScatterChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new ScatterChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ScatterChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ScatterChart(definition, sheetId, this.getters);
  }
}

export function createScatterChartRuntime(
  chart: ScatterChart,
  getters: Getters
): ScatterChartRuntime {
  const runtime = createLineOrScatterChartRuntime(chart, getters);
  runtime.chartJsConfig.type = "line";

  const configOptions = runtime.chartJsConfig.options!;
  configOptions.elements = {
    point: {
      radius: 3,
      hoverRadius: 3, // chartJS seems bugged, the point starts with the "hoverRadius" value
      hitRadius: 8,
    },
  };

  const locale = getters.getLocale();
  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const labelFormat = getChartLabelFormat(getters, chart.labelRange);

  configOptions.plugins!.tooltip!.callbacks!.title = () => "";
  configOptions.plugins!.tooltip!.callbacks!.label = (tooltipItem) => {
    console.log(tooltipItem);
    const formattedX = formatValue((tooltipItem.raw as any).x, { locale, format: labelFormat });
    const formattedY = formatValue((tooltipItem.raw as any).y, { locale, format: dataSetFormat });
    const dataSetTitle = tooltipItem.dataset.label;
    return `${dataSetTitle}: (${formattedX}, ${formattedY})`;
  };

  for (const dataSet of runtime.chartJsConfig.data!.datasets!) {
    (dataSet as ChartDataset<"line">).showLine = false;
  }

  return runtime;
}
