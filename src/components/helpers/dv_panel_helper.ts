import { ComponentConstructor } from "@odoo/owl";
import { getFormattedDate } from "../../helpers";
import { DATES_VALUES } from "../../helpers/dv_helpers";
import { Registry } from "../../registries/registry";
import { _lt } from "../../translation";
import {
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsCriterion,
  SpreadsheetChildEnv,
  TextContainsCriterion,
  TextNotContainsCriterion,
} from "../../types";
import { DataValidationDateCriterionForm } from "../side_panel/data_validation/dv_criterion/dv_date";
import { DataValidationDoubleInputCriterionForm } from "../side_panel/data_validation/dv_criterion/dv_double_input";
import { DataValidationSingleInputCriterionForm } from "../side_panel/data_validation/dv_criterion/dv_single_input";

export type DataValidationCriterionItem = {
  type: DataValidationCriterionType;
  component: ComponentConstructor;
  name: string;
  getDescription: (criterion: DataValidationCriterion, env: SpreadsheetChildEnv) => string;
};

// ADRM DISCUSS: here (array) vs dataValidationCriterionMatcher (Registry), which do we want ?
export const dataValidationPanelCriteriaRegistry: Registry<DataValidationCriterionItem> =
  new Registry();

dataValidationPanelCriteriaRegistry.add("textContains", {
  type: "textContains",
  component: DataValidationSingleInputCriterionForm,
  name: _lt("Text contains"),
  getDescription: (criterion: TextContainsCriterion) =>
    _lt('Text contains "%s"', criterion.values[0]),
});

dataValidationPanelCriteriaRegistry.add("textNotContains", {
  type: "textNotContains",
  component: DataValidationSingleInputCriterionForm,
  name: _lt("Text does not contains"),
  getDescription: (criterion: TextNotContainsCriterion) =>
    _lt('Text does not contain "%s"', criterion.values[0]),
});

dataValidationPanelCriteriaRegistry.add("isBetween", {
  type: "isBetween",
  component: DataValidationDoubleInputCriterionForm,
  name: _lt("Is between"),
  getDescription: (criterion: DataValidationCriterion) =>
    _lt("Value is between %s and %s", criterion.values[0], criterion.values[1]),
});

dataValidationPanelCriteriaRegistry.add("dateIs", {
  type: "dateIs",
  component: DataValidationDateCriterionForm,
  name: _lt("Date is"),
  getDescription: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    if (criterion.dateValue === "exactDate") {
      if (criterion.values[0].startsWith("=")) {
        return _lt("Date is %s", criterion.values[0]);
      }

      return _lt(
        "Date is %s",
        getFormattedDate(criterion.values[0], env.model.getters.getLocale())
      );
    }
    return _lt("Date is %s", DATES_VALUES[criterion.dateValue].toString());
  },
});
