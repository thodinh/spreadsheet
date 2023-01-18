import { Component, useState } from "@odoo/owl";
import { HeaderIndex, SpreadsheetChildEnv } from "../../types";
import { css, cssPropertiesToCss } from "../helpers/css";

// -----------------------------------------------------------------------------
// Autofill
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-selection-anchor {
    border: 1px solid black;
    box-sizing: border-box !important;
  }
`;

interface Props {
  position: Position;
}

interface Position {
  top: HeaderIndex;
  left: HeaderIndex;
}

interface State {}

export class GridSelection extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Selection";
  state: State = useState({});

  get selectionAnchorStyle(): string {
    const selection = this.env.model.getters.getSelection().zones[0];
    if (!selection) return "";
    const rect = this.env.model.getters.getVisibleRect(selection);
    console.log(rect);
    return cssPropertiesToCss({
      top: `${rect.y}px`,
      left: `${rect.x}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
}

GridSelection.props = {};
