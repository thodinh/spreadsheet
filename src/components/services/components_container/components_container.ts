import { Component } from "@odoo/owl";
import { componentRegistry } from "../../../registries/component_registry";
import { SpreadsheetEnv } from "../../../types";
import { css } from "../../helpers";

interface Props {}

css/* scss */ `
  .o-component-container {
    z-index: 100;
  }
`;

export class ComponentContainer extends Component<Props, SpreadsheetEnv> {
  static template = "o-spreadsheet-ComponentContainer";

  get components() {
    return componentRegistry.getKeys().map((key) => {
      const { Component, props } = componentRegistry.get(key);
      return { key, Component, props };
    });
  }
}

ComponentContainer.props = {};
