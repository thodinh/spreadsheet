import { createRange } from "../../../../helpers";
import { LineBarPieConfigPanel } from "../line_bar_pie_panel/config_panel";

export class PieConfigPanel extends LineBarPieConfigPanel {
  static template = "o-spreadsheet-PieConfigPanel";

  doesDataSetContainNegativeValues() {
    let isNegative = false;
    this.props.definition.dataSets.forEach((dataSet) => {
      const getters = this.env.model.getters;
      const sheetId = getters.getActiveSheetId();
      const dataRange = createRange(getters, sheetId, dataSet)!;
      const data = getters.getRangeValues(dataRange);

      data.forEach((value) => {
        if (typeof value === "number" && value < 0) {
          isNegative = true;
        }
      });
    });

    return isNegative;
  }
}
