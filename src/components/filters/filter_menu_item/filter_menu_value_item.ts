import { Component, onWillPatch, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../types";

interface Props {
  value: string;
  isChecked: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseMove: () => void;
  scrolledTo: "top" | "bottom" | undefined;
}

export class FilterMenuValueItem extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueItem";

  private itemRef = useRef("menuValueItem");

  setup() {
    onWillPatch(() => {
      if (this.props.scrolledTo) {
        this.scrollListToSelectedValue();
      }
    });
  }

  private scrollListToSelectedValue() {
    if (!this.itemRef.el) {
      return;
    }
    this.itemRef.el.scrollIntoView?.({
      block: this.props.scrolledTo === "bottom" ? "end" : "start",
    });
  }
}

FilterMenuValueItem.props = {
  value: String,
  isChecked: Boolean,
  isSelected: Boolean,
  onMouseMove: Function,
  onClick: Function,
  scrolledTo: { type: String, optional: true },
};