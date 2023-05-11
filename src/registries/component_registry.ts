import { ComponentConstructor } from "@odoo/owl";
import { Registry } from "./registry";

interface ComponentRegistryArg {
  Component: ComponentConstructor;
  props: any;
}

export const componentRegistry = new Registry<ComponentRegistryArg>();
