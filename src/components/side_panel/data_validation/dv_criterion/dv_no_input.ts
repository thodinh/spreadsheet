import { Component } from "@odoo/owl";
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

export class DataValidationNoInput extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationNoInput";
}
