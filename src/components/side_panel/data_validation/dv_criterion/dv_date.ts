import { Component } from "@odoo/owl";
import { DATES_VALUES } from "../../../../helpers/dv_helpers";
import {
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  SpreadsheetChildEnv,
} from "../../../../types";

interface Props {
  initialCriterion: DataValidationDateCriterion;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export class DataValidationDateCriterionForm extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationDateCriterion";

  value = "";
  dateValue: DateCriterionValue = "exactDate";

  setup() {
    this.value = this.props.initialCriterion.values[0] || "";
    this.dateValue = this.props.initialCriterion.dateValue || "exactDate";
  }

  onValueChanged(ev: Event) {
    this.value = (ev.target as HTMLInputElement).value;
    this.updateCriterion();
  }

  onDateValueChanged(ev: Event) {
    this.dateValue = (ev.target as HTMLInputElement).value as DateCriterionValue;
    this.updateCriterion();
  }

  updateCriterion() {
    const criterion = {
      ...this.props.initialCriterion,
      dateValue: this.dateValue,
    };
    if (this.dateValue === "exactDate") {
      criterion.values = [this.value];
    }
    this.props.onCriterionChanged(criterion);
  }

  get dateValues() {
    return Object.keys(DATES_VALUES).map((key) => ({
      value: key,
      title: DATES_VALUES[key],
    }));
  }
}
