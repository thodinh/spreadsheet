import { Component } from "@odoo/owl";
import { DataValidationCriterion, SpreadsheetChildEnv } from "../../../../types";

interface Props {
  initialCriterion: DataValidationCriterion;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export class DataValidationDoubleInputCriterionForm extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationDoubleInput";

  value1 = "";
  value2 = "";

  setup() {
    this.value1 = this.props.initialCriterion.values[0] || "";
    this.value2 = this.props.initialCriterion.values[1] || "";
  }

  onFirstValueChanged(ev: Event) {
    this.value1 = (ev.target as HTMLInputElement).value;
    this.props.onCriterionChanged({
      ...this.props.initialCriterion,
      values: [this.value1, this.value2],
    });
  }

  onSecondValueChanged(ev: Event) {
    this.value2 = (ev.target as HTMLInputElement).value;
    this.props.onCriterionChanged({
      ...this.props.initialCriterion,
      values: [this.value1, this.value2],
    });
  }
}
