import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";

css/* scss */ ``;
interface Props {
  initialValues: string[];
  onValuesChanged: (values: string[]) => void;
}

export class DataValidationSingleInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationSingleInput";

  value = "";

  setup() {
    this.value = this.props.initialValues[0] || "";
  }

  onValueChanged(ev: Event) {
    this.value = (ev.target as HTMLInputElement).value;
    this.props.onValuesChanged([this.value]);
  }
}

DataValidationSingleInput.props = {
  onValuesChanged: Function,
  initialValues: Array,
};
