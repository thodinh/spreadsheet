import { reactive } from "@odoo/owl";
import {
  NotificationContainer,
  NotificationItem,
} from "../components/services/notification_container/notification_container";
import { componentRegistry } from "./../registries/component_registry";

interface NotificationOptions {
  sticky?: boolean;
  type?: "warning" | "error";
}

export class NotificationService {
  private nextId = 0;
  notifications: Record<string, NotificationItem> = reactive({});

  constructor() {
    componentRegistry.add("NotificationContainer", {
      Component: NotificationContainer,
      props: { notifications: this.notifications },
    });
  }

  add(message: string, options: NotificationOptions) {
    const notificationId = String(this.nextId);
    this.notifications[notificationId] = { message, type: options.type || "warning" };
    if (!options.sticky) {
      setTimeout(() => {
        this.close(notificationId);
      }, 5000);
    }
    this.nextId++;
  }

  close(id: string) {
    delete this.notifications[id];
  }
}
