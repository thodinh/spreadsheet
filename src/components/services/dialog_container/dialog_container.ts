import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { SpreadsheetEnv } from "../../../types";
import { css } from "../../helpers";

export interface Dialog {
  dialogComponent: ComponentConstructor;
  dialogProps: any;
}

interface Props {
  dialogs: Record<string, Dialog>;
}

css/* scss */ `
  .o-dialog-container {
    top: 10px;
    left: calc(100vw - 320px);
  }
`;

export class DialogContainer extends Component<Props, SpreadsheetEnv> {
  static template = "o-spreadsheet-DialogContainer";

  dialogs: Record<string, Dialog> = {};

  setup() {
    console.log(this.props);
    this.dialogs = useState(this.props.dialogs);
  }

  onNotificationClick(id: string) {
    this.env.spreadsheetServices.notification.close(id);
  }
}

DialogContainer.props = {
  dialogs: Object,
};
