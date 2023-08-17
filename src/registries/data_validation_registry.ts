import { DVDateTerms } from "../components/translations_terms";
import {
  areDatesSameDay,
  formatValue,
  isDateAfterDay,
  isDateBeforeDay,
  isDateBetween,
  isDateStrictlyAfterDay,
  isDateStrictlyBeforeDay,
  isNumberBetween,
  jsDateToRoundNumber,
} from "../helpers";
import {
  cellValueToNumber,
  getCriterionValuesAsNumber,
  getDateCriterionValues,
} from "../helpers/dv_helpers";
import { _t } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsCriterion,
  DEFAULT_LOCALE,
  Getters,
  Locale,
  NumberBetweenCriterion,
  TextContainsCriterion,
  TextNotContainsCriterion,
} from "../types";
import { CellErrorType } from "../types/errors";
import { Registry } from "./registry";

interface DataValidationEvaluatorArgs {
  // TODO: replace getters by locale ?
  getters: Getters;
}

const criterionErrorStrings = {
  notEmptyValue: _t("The value must not be empty"),
  numberValue: _t("The value must be a number"),
  dateValue: _t("The value must be a date"),
};

type DataValidationCriterionEvaluator = {
  type: DataValidationCriterionType;
  isValueValid: (
    value: CellValue,
    criterion: DataValidationCriterion,
    args: DataValidationEvaluatorArgs
  ) => boolean;
  getErrorString: (criterion: DataValidationCriterion, args: DataValidationEvaluatorArgs) => string;
  isCriterionValueValid: (value: string, locale: Locale) => boolean;
  getCriterionValueErrorString: (value: string) => string;
  numberOfValues: (criterion: DataValidationCriterion) => number;
};

export const dataValidationEvaluatorRegistry = new Registry<DataValidationCriterionEvaluator>();
dataValidationEvaluatorRegistry.add("textContains", {
  type: "textContains",
  isValueValid: (value: CellValue, criterion: TextContainsCriterion) => {
    return (
      typeof value === "string" && value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextContainsCriterion) => {
    return _t('The value must be a text that contains: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: () => criterionErrorStrings.notEmptyValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (value: CellValue, criterion: TextNotContainsCriterion) => {
    return (
      typeof value === "string" && !value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextNotContainsCriterion) => {
    return _t('The value must be a text that does not contain: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: (value: string) => criterionErrorStrings.notEmptyValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterion: NumberBetweenCriterion) => {
    // TODO : locale
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValues = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE);

    if (
      numberValue === undefined ||
      criterionValues[0] === undefined ||
      criterionValues[1] === undefined
    ) {
      return false;
    }
    return isNumberBetween(numberValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: NumberBetweenCriterion, args: DataValidationEvaluatorArgs) => {
    return _t("The value must be between %s and %s", criterion.values[0], criterion.values[1]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("dateIs", {
  type: "dateIs",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const locale = DEFAULT_LOCALE;
    const criterionValue = getDateCriterionValues(criterion, locale)[0];
    if (typeof value !== "number" || !criterionValue) {
      return false;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(new Date());
      return isDateBetween(value, today, criterionValue);
    }

    return areDatesSameDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t("The value must be the date %s", getDateCriterionFormattedValue(criterion, locale))
      : _t("The value must be %s", DVDateTerms.DateIs[criterion.dateValue]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsBefore", {
  type: "dateIsBefore",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    return typeof value !== "number" || !criterionValue
      ? false
      : isDateStrictlyBeforeDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t("The value must be a date before %s", getDateCriterionFormattedValue(criterion, locale))
      : _t("The value must be a date before %s", DVDateTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsOnOrBefore", {
  type: "dateIsOnOrBefore",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    return typeof value !== "number" || !criterionValue
      ? false
      : isDateBeforeDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or before %s",
          getDateCriterionFormattedValue(criterion, locale)
        )
      : _t(
          "The value must be a date on or before %s",
          DVDateTerms.DateIsBefore[criterion.dateValue]
        );
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsAfter", {
  type: "dateIsAfter",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    return typeof value !== "number" || !criterionValue
      ? false
      : isDateStrictlyAfterDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t("The value must be a date after %s", getDateCriterionFormattedValue(criterion, locale))
      : _t("The value must be a date after %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    return typeof value !== "number" || !criterionValue
      ? false
      : isDateAfterDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or after %s",
          getDateCriterionFormattedValue(criterion, locale)
        )
      : _t("The value must be a date on or after %s", DVDateTerms.DateIsAfter[criterion.dateValue]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

function getDateCriterionFormattedValue(criterion: DateIsCriterion, locale: Locale) {
  const value = getDateCriterionValues(criterion, locale)[0];
  return value !== undefined
    ? formatValue(value, { locale, format: locale.dateFormat })
    : CellErrorType.InvalidReference;
}

function checkValueIsDate(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}

function checkValueIsNumber(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}
