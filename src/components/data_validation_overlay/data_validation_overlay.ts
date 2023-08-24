import { Component } from "@odoo/owl";
import { getPositionsInRanges } from "../../helpers/dv_helpers";
import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import { DOMCoordinates, SpreadsheetChildEnv } from "../../types";
import { css } from "../helpers/css";
import { IsCheckbox } from "./../../types/data_validation";
import { DataValidationCheckbox } from "./dv_checkbox/dv_checkbox";

css/* scss */ ``;

interface Props {
  gridPosition: DOMCoordinates;
}

export class DataValidationOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationOverlay";
  static defaultProps = {
    gridPosition: { x: 0, y: 0 },
  };
  static components = { DataValidationCheckbox };

  checkboxCriterion: IsCheckbox = { type: "isCheckbox", values: [] };
  checkBoxCriterionEvaluator = dataValidationEvaluatorRegistry.get("isCheckbox");
  evaluatorArgs = { getters: this.env.model.getters };

  get checkBoxCellPositions() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.dataValidationCheckboxRules.map((rule) => rule.ranges).flat();
    return getPositionsInRanges(ranges)
      .map((pos) => ({ ...pos, sheetId }))
      .filter((pos) => this.env.model.getters.isCellValidCheckbox(pos));
  }

  get dataValidationCheckboxRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters
      .getDataValidationRules(sheetId)
      .filter((rule) => rule.criterion.type === "isCheckbox");
  }
}

DataValidationOverlay.props = {
  gridPosition: { type: Object, optional: true },
};
