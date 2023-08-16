import { ComponentConstructor } from "@odoo/owl";
import { getFormattedDate } from "../../helpers";
import { Registry } from "../../registries/registry";
import { _t } from "../../translation";
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
import { DVRelativeDateTerms } from "../translations_terms";

export type DataValidationCriterionItem = {
  type: DataValidationCriterionType;
  component: ComponentConstructor;
  name: string;
  getPreview: (criterion: DataValidationCriterion, env: SpreadsheetChildEnv) => string;
};

// ADRM DISCUSS: here (array) vs dataValidationCriterionMatcher (Registry), which do we want ?
export const dataValidationPanelCriteriaRegistry: Registry<DataValidationCriterionItem> =
  new Registry();

dataValidationPanelCriteriaRegistry.add("textContains", {
  type: "textContains",
  component: DataValidationSingleInputCriterionForm,
  name: _t("Text contains"),
  getPreview: (criterion: TextContainsCriterion) => _t('Text contains "%s"', criterion.values[0]),
});

dataValidationPanelCriteriaRegistry.add("textNotContains", {
  type: "textNotContains",
  component: DataValidationSingleInputCriterionForm,
  name: _t("Text does not contains"),
  getPreview: (criterion: TextNotContainsCriterion) =>
    _t('Text does not contain "%s"', criterion.values[0]),
});

dataValidationPanelCriteriaRegistry.add("isBetween", {
  type: "isBetween",
  component: DataValidationDoubleInputCriterionForm,
  name: _t("Is between"),
  getPreview: (criterion: DataValidationCriterion) =>
    _t("Value is between %s and %s", criterion.values[0], criterion.values[1]),
});

dataValidationPanelCriteriaRegistry.add("dateIs", {
  type: "dateIs",
  component: DataValidationDateCriterionForm,
  name: _t("Date is"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    if (criterion.dateValue === "exactDate") {
      const locale = env.model.getters.getLocale();
      const value = criterion.values[0].startsWith("=")
        ? criterion.values[0]
        : getFormattedDate(criterion.values[0], locale);

      return _t("Date is %s", value);
    }
    return _t("Date is %s", DVRelativeDateTerms.DateIs[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  component: DataValidationDateCriterionForm,
  name: _t("Date is before"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    if (criterion.dateValue === "exactDate") {
      const locale = env.model.getters.getLocale();
      const value = criterion.values[0].startsWith("=")
        ? criterion.values[0]
        : getFormattedDate(criterion.values[0], locale);

      return _t("Date is before %s", value);
    }
    return _t("Date is %s", DVRelativeDateTerms.DateIsBefore[criterion.dateValue]);
  },
});
