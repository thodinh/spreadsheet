import { Component, useState } from "@odoo/owl";
import { SpreadsheetEnv } from "../../../types";
import { css } from "../../helpers";

export interface NotificationItem {
  message: string;
  type: "warning" | "error";
}

export interface NotificationContainerProps {
  notifications: Record<string, NotificationItem>;
}

css/* scss */ `
  .o-notification-container {
    top: 10px;
    left: calc(100vw - 320px);
  }

  .o-notification {
    width: 300px;
    background: white;
    border: 1px solid;
    border-left: 6px solid;

    &.o-notification-error {
      border-color: red;
    }

    &.o-notification-warning {
      border-color: orange;
    }
  }
`;

export class NotificationContainer extends Component<NotificationContainerProps, SpreadsheetEnv> {
  static template = "o-spreadsheet-NotificationContainer";

  notifications: Record<string, NotificationItem> = {};

  setup() {
    this.notifications = useState(this.props.notifications);
  }

  onNotificationClick(id: string) {
    this.env.spreadsheetServices.notification.close(id);
  }
}

NotificationContainer.props = {
  notifications: Object,
};
