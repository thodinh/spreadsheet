import { ComponentConstructor, reactive } from "@odoo/owl";
import { Dialog, DialogContainer } from "../components/services/dialog_container/dialog_container";
import { componentRegistry } from "./../registries/component_registry";

export class DialogService {
  nextId = 0;
  dialogs: Record<string, Dialog> = reactive({});

  constructor() {
    console.log("DialogService constructor", this.dialogs);
    componentRegistry.add("DialogContainer", {
      Component: DialogContainer,
      props: { dialogs: this.dialogs },
    });
  }

  add(dialogComponent: ComponentConstructor, props: any, options: any = {}) {
    const dialogId = String(this.nextId);
    this.dialogs[dialogId] = { dialogComponent, dialogProps: props };
    this.nextId++;
  }

  close(id: string) {
    delete this.dialogs[id];
  }
}
