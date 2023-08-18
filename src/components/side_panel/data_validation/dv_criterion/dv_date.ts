import { Component, onMounted } from "@odoo/owl";
import { DATES_VALUES } from "../../../../helpers/dv_helpers";
import {
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  SpreadsheetChildEnv,
} from "../../../../types";
import { DataValidationInput } from "./dv_input";

interface Props {
  initialCriterion: DataValidationDateCriterion;
  onCriterionChanged: (criterion: DataValidationCriterion) => void;
}

export class DataValidationDateCriterionForm extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationDateCriterion";
  static components = { DataValidationInput };

  value = "";
  dateValue: DateCriterionValue = "exactDate";

  setup() {
    this.value = this.props.initialCriterion.values[0] || "";
    this.dateValue = this.props.initialCriterion.dateValue || "exactDate";
    onMounted(() => {
      this.updateCriterion();
    });
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