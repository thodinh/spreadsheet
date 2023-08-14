import { Component, useState } from "@odoo/owl";
import { DataValidationCriterionType, SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";

interface Props {
  initialValue: string;
  criterionType: DataValidationCriterionType;
  onValueChanged: (value: any) => void;
}

css/* scss */ `
  .o-dv-input {
    .o-invalid {
      background-color: #ffdddd;
    }
    .error-icon {
      right: 7px;
      top: 7px;
    }
  }
`;

export class DataValidationInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationInput";

  state = useState({
    value: this.props.initialValue,
    shouldDisplayError: !!this.props.initialValue, // Don't display error if user inputted nothing yet
  });

  onValueChanged(ev: Event) {
    this.state.value = (ev.target as HTMLInputElement).value;
    this.state.shouldDisplayError = true;
    this.props.onValueChanged(ev);
  }

  get errorMessage(): string | undefined {
    if (!this.state.shouldDisplayError) {
      return undefined;
    }
    const error = this.env.model.getters.getDataValidationInvalidCriterionValueMessage(
      this.props.criterionType,
      this.state.value
    );
    return error;
  }
}
