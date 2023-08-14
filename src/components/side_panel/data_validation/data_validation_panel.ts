import { Component, useState } from "@odoo/owl";
import { DataValidationRule, SpreadsheetChildEnv, UID } from "../../../types";
import { css } from "../../helpers/css";
import { DataValidationEditor } from "./dv_editor/dv_editor";
import { DataValidationPreview } from "./dv_preview/dv_preview";

css/* scss */ ``;
interface Props {
  onCloseSidePanel: () => void;
}

interface State {
  mode: "list" | "edit";
  activeRule: DataValidationRule | undefined;
}

export class DataValidationPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationPanel";
  static components = { DataValidationPreview, DataValidationEditor };

  state = useState<State>({ mode: "list", activeRule: undefined });

  setup() {
    //ADRM TODO : delete dis
    // onWillStart(() => {
    //   this.onPreviewClick("1");
    // });
  }

  onPreviewClick(id: UID) {
    console.log("onPreviewClick", id);
    const sheetId = this.env.model.getters.getActiveSheetId();
    const dvRule = this.env.model.getters.getDataValidationRule(sheetId, id);
    if (dvRule) {
      this.state.mode = "edit";
      this.state.activeRule = dvRule;
    }
  }

  addDataValidationRule() {
    this.state.mode = "edit";
    this.state.activeRule = undefined;
  }

  onExitForm() {
    this.state.mode = "list";
    this.state.activeRule = undefined;
  }

  get validationRules() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getDataValidationRules(sheetId);
  }
}

DataValidationPanel.props = {
  onCloseSidePanel: Function,
};
