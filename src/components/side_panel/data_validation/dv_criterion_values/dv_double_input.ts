import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";

css/* scss */ ``;
interface Props {
  initialValues: string[];
  onValuesChanged: (values: string[]) => void;
}

export class DataValidationDoubleInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationDoubleInput";

  value1 = "";
  value2 = "";

  setup() {
    this.value1 = this.props.initialValues[0] || "";
    this.value2 = this.props.initialValues[1] || "";
  }

  onFirstValueChanged(ev: Event) {
    this.value1 = (ev.target as HTMLInputElement).value;
    this.props.onValuesChanged([this.value1, this.value2]);
  }

  onSecondValueChanged(ev: Event) {
    this.value2 = (ev.target as HTMLInputElement).value;
    this.props.onValuesChanged([this.value1, this.value2]);
  }
}

DataValidationDoubleInput.props = {
  onValuesChanged: Function,
  initialValues: Array,
};
