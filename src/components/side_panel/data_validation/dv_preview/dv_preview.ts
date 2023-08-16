import { Component } from "@odoo/owl";
import { FIGURE_BORDER_COLOR } from "../../../../constants";
import { DataValidationRule, SpreadsheetChildEnv } from "../../../../types";
import { css } from "../../../helpers";
import { dataValidationPanelCriteriaRegistry } from "../../../helpers/dv_panel_helper";

css/* scss */ `
  .o-sidepanel {
    .o-dv-preview {
      height: 70px;
      border-bottom: 1px solid ${FIGURE_BORDER_COLOR};
      box-sizing: border-box;

      .o-dv-container {
        min-width: 0; // otherwise flex won't shrink correctly
      }

      .o-dv-preview-description {
        font-size: 13px;
      }

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
        cursor: pointer;
      }

      &:not(:hover) .o-dv-preview-delete {
        display: none !important;
      }
    }
  }
`;
interface Props {
  onClick: () => void;
  dvRule: DataValidationRule;
}

export class DataValidationPreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPreview";

  deleteDataValidation() {
    console.log("deleteDataValidation", this.props.dvRule.id);
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_DATA_VALIDATION_RULE", { sheetId, id: this.props.dvRule.id });
  }

  get rangesString(): string {
    return this.props.dvRule.ranges.join(", ");
  }

  get descriptionString(): string {
    const item = dataValidationPanelCriteriaRegistry.get(this.props.dvRule.criterion.type);
    if (!item) {
      throw new Error(`No component found for criterion type ${this.props.dvRule.criterion.type}`);
    }
    return item.getPreview(this.props.dvRule.criterion, this.env);
  }
}

DataValidationPreview.props = {
  onClick: Function,
  dvRule: Object,
};
