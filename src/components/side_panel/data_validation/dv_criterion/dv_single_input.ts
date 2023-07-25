import { Component } from "@odoo/owl";
import { DataValidationCriterion, SpreadsheetChildEnv } from "../../../../types";

interface Props {
  initialCriterion: DataValidationCriterion;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export class DataValidationSingleInputCriterionForm extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationSingleInput";

  value = "";

  setup() {
    this.value = this.props.initialCriterion.values[0] || "";
  }

  onValueChanged(ev: Event) {
    this.value = (ev.target as HTMLInputElement).value;
    this.props.onCriterionChanged({
      ...this.props.initialCriterion,
      values: [this.value],
    });
  }
}
