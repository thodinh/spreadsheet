import { ComponentConstructor } from "@odoo/owl";
import { _lt } from "../../translation";
import { DataValidationCriterionType } from "../../types";
import { DataValidationDoubleInput } from "../side_panel/data_validation/dv_criterion_values/dv_double_input";
import { DataValidationSingleInput } from "../side_panel/data_validation/dv_criterion_values/dv_single_input";

export type DataValidationCriterionItem = {
  type: DataValidationCriterionType;
  component: ComponentConstructor;
  name: string;
  getDescription: (values: string[]) => string;
};

// ADRM DISCUSS: here (array) vs dataValidationCriterionMatcher (Registry), which do we want ?
export const dataValidationPanelCriteria: Array<DataValidationCriterionItem> = [
  {
    type: "textContains",
    component: DataValidationSingleInput,
    name: _lt("Text contains"),
    getDescription: (values: string[]) => _lt('Text contains "%s"', values[0]),
  },
  {
    type: "isBetween",
    component: DataValidationDoubleInput,
    name: _lt("Is between"),
    getDescription: (values: string[]) => _lt("Is between %s and %s", values[0], values[1]),
  },
];
