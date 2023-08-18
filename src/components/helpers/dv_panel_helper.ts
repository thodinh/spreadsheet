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
import { DataValidationNoInput } from "../side_panel/data_validation/dv_criterion/dv_no_input";
import { DataValidationSingleInputCriterionForm } from "../side_panel/data_validation/dv_criterion/dv_single_input";
import { DVDateTerms } from "../translations_terms";

export type DataValidationCriterionItem = {
  type: DataValidationCriterionType;
  component: ComponentConstructor;
  name: string;
  getPreview: (criterion: DataValidationCriterion, env: SpreadsheetChildEnv) => string;
};

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
    return criterion.dateValue === "exactDate"
      ? _t("Date is %s", getDateCriterionFormattedExactValue(criterion, env)[0])
      : _t("Date is %s", DVDateTerms.DateIs[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  component: DataValidationDateCriterionForm,
  name: _t("Date is before"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is before %s", getDateCriterionFormattedExactValue(criterion, env)[0])
      : _t("Date is before %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  component: DataValidationDateCriterionForm,
  name: _t("Date is on or before"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is on or before %s", getDateCriterionFormattedExactValue(criterion, env)[0])
      : _t("Date is on or before %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  component: DataValidationDateCriterionForm,
  name: _t("Date is after"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is after %s", getDateCriterionFormattedExactValue(criterion, env)[0])
      : _t("Date is after %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  component: DataValidationDateCriterionForm,
  name: _t("Date is on or after"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    return criterion.dateValue === "exactDate"
      ? _t("Date is on or after %s", getDateCriterionFormattedExactValue(criterion, env)[0])
      : _t("Date is on or after %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  component: DataValidationDoubleInputCriterionForm,
  name: _t("Date is between"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    const values = getDateCriterionFormattedExactValue(criterion, env);
    return _t("Date is between %s and %s", values[0], values[1]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  component: DataValidationDoubleInputCriterionForm,
  name: _t("Date is not between"),
  getPreview: (criterion: DateIsCriterion, env: SpreadsheetChildEnv) => {
    const values = getDateCriterionFormattedExactValue(criterion, env);
    return _t("Date is not between %s and %s", values[0], values[1]);
  },
});

dataValidationPanelCriteriaRegistry.add("dateIsValid", {
  type: "dateIsValid",
  component: DataValidationNoInput,
  name: _t("Is valid date"),
  getPreview: () => _t("Date is valid"),
});

dataValidationPanelCriteriaRegistry.add("isEqual", {
  type: "isEqual",
  component: DataValidationSingleInputCriterionForm,
  name: _t("Is equal to"),
  getPreview: (criterion: TextContainsCriterion) => _t("Value is equal to %s", criterion.values[0]),
});

dataValidationPanelCriteriaRegistry.add("isNotEqual", {
  type: "isNotEqual",
  component: DataValidationSingleInputCriterionForm,
  name: _t("Is not equal to"),
  getPreview: (criterion: TextContainsCriterion) =>
    _t("Value is not equal to %s", criterion.values[0]),
});

function getDateCriterionFormattedExactValue(criterion: DateIsCriterion, env: SpreadsheetChildEnv) {
  return criterion.values.map((value) =>
    value.startsWith("=") ? value : getFormattedDate(value, env.model.getters.getLocale())
  );
}