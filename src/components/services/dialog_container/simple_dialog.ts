import { Component } from "@odoo/owl";
import { SpreadsheetEnv } from "../../../types";

interface Props {}

export class SimpleDialog extends Component<Props, SpreadsheetEnv> {
  static template = "o-spreadsheet-SimpleDialog";
}

SimpleDialog.props = {};
