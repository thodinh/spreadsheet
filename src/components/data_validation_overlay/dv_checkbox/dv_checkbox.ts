import { Component } from "@odoo/owl";
import { CellPosition, Rect, SpreadsheetChildEnv } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";

const CHECKBOX_WIDTH = 15;

css/* scss */ `
  .o-dv-checkbox-container {
    .o-dv-checkbox {
      width: ${CHECKBOX_WIDTH}px;
      height: ${CHECKBOX_WIDTH}px;
      accent-color: #808080;
    }
  }
`;

interface Props {
  cellPosition: CellPosition;
}

export class DataValidationCheckbox extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationCheckbox";

  onCheckboxChange(ev: Event) {
    const newValue = (ev.target as HTMLInputElement).checked;
    if (this.isDisabled) {
      (ev.target as HTMLInputElement).checked = !newValue;
      return;
    }
    const { sheetId, col, row } = this.props.cellPosition;
    this.env.model.dispatch("UPDATE_CELL", {
      sheetId,
      col,
      row,
      content: newValue ? "TRUE" : "FALSE",
    });
  }

  get containerStyle() {
    const { width, height, x, y } = this.cellRect;
    return cssPropertiesToCss({
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  get cellRect(): Rect {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const merge = this.env.model.getters.getMerge(this.props.cellPosition);
    const { col, row } = this.props.cellPosition;

    const startX = this.env.model.getters.getColDimensions(sheetId, col).start;
    const startY = this.env.model.getters.getRowDimensions(sheetId, row).start;
    const endX = this.env.model.getters.getColDimensions(sheetId, merge ? merge.right : col).end;
    const endY = this.env.model.getters.getRowDimensions(sheetId, merge ? merge.bottom : row).end;
    return {
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
    };
  }

  get checkBoxValue() {
    return !!this.env.model.getters.getEvaluatedCell(this.props.cellPosition).value;
  }

  get isDisabled() {
    const cell = this.env.model.getters.getCell(this.props.cellPosition);
    return !!cell?.isFormula;
  }
}

DataValidationCheckbox.props = {
  cellPosition: Object,
};
