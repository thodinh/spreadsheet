import { canChartParseLabels } from "../../../../helpers/figures/charts/chart_common_line_scatter";
import { ScatterChart } from "../../../../helpers/figures/charts/scatter_chart";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class ScatterConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-ScatterConfigPanel";

  get canTreatLabelsAsText() {
    const chart = this.env.model.getters.getChart(this.props.figureId);
    if (chart && chart instanceof ScatterChart) {
      return canChartParseLabels(chart.labelRange, this.env.model.getters);
    }
    return false;
  }

  onUpdateLabelsAsText(ev: MouseEvent) {
    this.props.updateChart(this.props.figureId, {
      labelsAsText: (ev.target as HTMLInputElement).checked,
    });
  }

  onUpdateAggregated(ev: MouseEvent) {
    this.props.updateChart(this.props.figureId, {
      aggregated: (ev.target as HTMLInputElement).checked,
    });
  }
}
