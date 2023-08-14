import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { zoneToXc } from "../../../../helpers";
import { dataValidationCriterionMatcher } from "../../../../registries/data_validation_registry";
import {
  DataValidationCriterion,
  DataValidationRule,
  SpreadsheetChildEnv,
} from "../../../../types";
import { css } from "../../../helpers";
import {
  DataValidationCriterionItem,
  dataValidationPanelCriteriaRegistry,
} from "../../../helpers/dv_panel_helper";
import { SelectionInput } from "../../../selection_input/selection_input";

css/* scss */ `
  .o-sidepanel {
  }
`;
interface Props {
  dvRule: DataValidationRule | undefined;
  onExit: () => void;
}

interface State {
  dvRule: DataValidationRule;
}

export class DataValidationEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DataValidationEditor";
  static components = { SelectionInput };

  state = useState<State>({ dvRule: this.defaultDataValidationRule });

  setup() {
    if (this.props.dvRule) {
      this.state.dvRule = this.props.dvRule;
      this.state.dvRule.criterion.type = this.props.dvRule.criterion.type;
    }
  }

  onCriterionTypeChanged(ev: Event) {
    const type = (ev.target as HTMLInputElement).value as DataValidationCriterionItem["type"];
    this.state.dvRule.criterion.type = type;
  }

  onRangesChanged(ranges: string[]) {
    this.state.dvRule.ranges = ranges;
  }

  onCriterionChanged(criterion: DataValidationCriterion) {
    console.log("criterion", criterion);
    this.state.dvRule.criterion = criterion;
  }

  onSave() {
    if (!this.canSave) {
      return;
    }
    this.env.model.dispatch("ADD_DATA_VALIDATION_RULE", this.currentDvRule);

    this.props.onExit();
  }

  get canSave(): boolean {
    return this.env.model.canDispatch("ADD_DATA_VALIDATION_RULE", this.currentDvRule).isSuccessful;
  }

  get currentDvRule() {
    const dvRule = this.state.dvRule;
    const criterion = this.state.dvRule.criterion;

    const criterionMatcher = dataValidationCriterionMatcher.get(criterion.type);

    const sheetId = this.env.model.getters.getActiveSheetId();
    return {
      sheetId,
      ranges: dvRule.ranges.map((xc) => this.env.model.getters.getRangeDataFromXc(sheetId, xc)),
      dv: {
        id: this.state.dvRule.id,
        criterion: {
          ...criterion,
          values: criterion.values.slice(0, criterionMatcher.numberOfValues),
        },
      },
    };
  }

  get dvCriterionItems(): DataValidationCriterionItem[] {
    return dataValidationPanelCriteriaRegistry.getAll();
  }

  get defaultDataValidationRule(): DataValidationRule {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const ranges = this.env.model.getters
      .getSelectedZones()
      .map((zone) => zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone)));
    return {
      id: this.env.model.uuidGenerator.uuidv4(),
      criterion: { type: "textContains", values: [""] },
      ranges,
    };
  }

  get criterionComponent(): ComponentConstructor {
    const item = dataValidationPanelCriteriaRegistry.get(this.state.dvRule.criterion.type);
    if (!item) {
      throw new Error(`No component found for criterion type ${this.state.dvRule.criterion.type}`);
    }
    return item.component;
  }
}

DataValidationEditor.props = {
  dvRule: { type: Object, optional: true },
  onExit: Function,
};
