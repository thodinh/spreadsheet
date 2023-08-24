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
  valueToDateNumber,
} from "../helpers";
import {
  cellValueToNumber,
  getCriterionValuesAsNumber,
  getDateCriterionValues,
} from "../helpers/dv_helpers";
import { detectLink } from "../helpers/links";
import { _t } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsAfter,
  DateIsBeforeCriterion,
  DateIsBetween,
  DateIsCriterion,
  DateIsNotBetween,
  DateIsOnOrAfter,
  DateIsValid,
  DEFAULT_LOCALE,
  Getters,
  isBetween,
  IsEqual,
  IsGreaterOrEqualTo,
  IsGreaterThan,
  IsLessOrEqualTo,
  IsLessThan,
  isNotBetween,
  IsNotEqual,
  Locale,
  TextContains,
  TextNotContains,
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
  isValueValid: (value: CellValue, criterion: TextContains) => {
    return (
      typeof value === "string" && value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextContains) => {
    return _t('The value must be a text that contains "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: () => criterionErrorStrings.notEmptyValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (value: CellValue, criterion: TextNotContains) => {
    return (
      typeof value === "string" && !value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextNotContains) => {
    return _t('The value must be a text that does not contain "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: (value: string) => criterionErrorStrings.notEmptyValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("textIs", {
  type: "textIs",
  isValueValid: (value: CellValue, criterion: TextContains) => {
    return typeof value === "string" && value.toLowerCase() === criterion.values[0].toLowerCase();
  },
  getErrorString: (criterion: TextContains) => {
    return _t('The value must be exactly "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: () => criterionErrorStrings.notEmptyValue,
  numberOfValues: () => 1,
});

/** Note: this regex doesn't allow for all the RFC-compliant mail addresses (mails can have an IP instead of a
 * domain name for example), but should be enough for our purpose. */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
dataValidationEvaluatorRegistry.add("textIsEmail", {
  type: "textIsEmail",
  isValueValid: (value: CellValue) => typeof value === "string" && emailRegex.test(value),
  getErrorString: () => _t("The value must be a valid email address"),
  isCriterionValueValid: () => true,
  getCriterionValueErrorString: () => "",
  numberOfValues: () => 0,
});

dataValidationEvaluatorRegistry.add("textIsLink", {
  type: "textIsLink",
  isValueValid: (value: CellValue) => detectLink(value) !== undefined,
  getErrorString: () => _t("The value must be a valid link"),
  isCriterionValueValid: () => true,
  getCriterionValueErrorString: () => "",
  numberOfValues: () => 0,
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
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);

    if (dateValue === undefined || !criterionValue) {
      return false;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(new Date());
      return isDateBetween(dateValue, today, criterionValue);
    }

    return areDatesSameDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t("The value must be the date %s", getDateCriterionFormattedValues(criterion, locale)[0])
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
    criterion: DateIsBeforeCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValue
      ? false
      : isDateStrictlyBeforeDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsBeforeCriterion, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date before %s",
          getDateCriterionFormattedValues(criterion, locale)[0]
        )
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
    criterion: DateIsOnOrAfter,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValue
      ? false
      : isDateBeforeDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsOnOrAfter, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or before %s",
          getDateCriterionFormattedValues(criterion, locale)[0]
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
  isValueValid: (value: CellValue, criterion: DateIsAfter, args: DataValidationEvaluatorArgs) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValue
      ? false
      : isDateStrictlyAfterDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsAfter, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date after %s",
          getDateCriterionFormattedValues(criterion, locale)[0]
        )
      : _t("The value must be a date after %s", DVDateTerms.DateIsBefore[criterion.dateValue]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsOnOrAfter", {
  type: "dateIsOnOrAfter",
  isValueValid: (
    value: CellValue,
    criterion: DateIsOnOrAfter,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValue = getDateCriterionValues(criterion, DEFAULT_LOCALE)[0];
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValue
      ? false
      : isDateAfterDay(dateValue, criterionValue);
  },
  getErrorString: (criterion: DateIsOnOrAfter, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    return criterion.dateValue === "exactDate"
      ? _t(
          "The value must be a date on or after %s",
          getDateCriterionFormattedValues(criterion, locale)[0]
        )
      : _t(
          "The value must be a date on or after %s",
          DVDateTerms.DateIsBefore[criterion.dateValue]
        );
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

dataValidationEvaluatorRegistry.add("dateIsBetween", {
  type: "dateIsBetween",
  isValueValid: (value: CellValue, criterion: DateIsBetween, args: DataValidationEvaluatorArgs) => {
    const criterionValues = getDateCriterionValues(criterion, DEFAULT_LOCALE);
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValues[0] || !criterionValues[1]
      ? false
      : isDateBetween(dateValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: DateIsBetween, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    const criterionValues = getDateCriterionFormattedValues(criterion, locale);
    return _t("The value must be a date between %s and %s", criterionValues[0], criterionValues[1]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("dateIsNotBetween", {
  type: "dateIsNotBetween",
  isValueValid: (
    value: CellValue,
    criterion: DateIsNotBetween,
    args: DataValidationEvaluatorArgs
  ) => {
    const criterionValues = getDateCriterionValues(criterion, DEFAULT_LOCALE);
    const dateValue = valueToDateNumber(value, DEFAULT_LOCALE);
    return dateValue === undefined || !criterionValues[0] || !criterionValues[1]
      ? false
      : !isDateBetween(dateValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: DateIsNotBetween, args: DataValidationEvaluatorArgs) => {
    const locale = DEFAULT_LOCALE;
    const criterionValues = getDateCriterionFormattedValues(criterion, locale);
    return _t(
      "The value must be a date not between %s and %s",
      criterionValues[0],
      criterionValues[1]
    );
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.dateValue,
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("dateIsValid", {
  type: "dateIsValid",
  isValueValid: (value: CellValue, criterion: DateIsValid, args: DataValidationEvaluatorArgs) => {
    return valueToDateNumber(value, DEFAULT_LOCALE) !== undefined;
  },
  getErrorString: () => _t("The value must be a valid date"),
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => "",
  numberOfValues: () => 0,
});

dataValidationEvaluatorRegistry.add("isEqual", {
  type: "isEqual",
  isValueValid: (value: CellValue, criterion: IsEqual) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue === criterionValue;
  },
  getErrorString: (criterion: IsEqual) => {
    return _t("The value must be equal to %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isNotEqual", {
  type: "isNotEqual",
  isValueValid: (value: CellValue, criterion: IsNotEqual) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue !== criterionValue;
  },
  getErrorString: (criterion: IsNotEqual) => {
    return _t("The value must not be equal to %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isGreaterThan", {
  type: "isGreaterThan",
  isValueValid: (value: CellValue, criterion: IsGreaterThan) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue > criterionValue;
  },
  getErrorString: (criterion: IsGreaterThan) => {
    return _t("The value must be greater than %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isGreaterOrEqualTo", {
  type: "isGreaterOrEqualTo",
  isValueValid: (value: CellValue, criterion: IsGreaterOrEqualTo) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue >= criterionValue;
  },
  getErrorString: (criterion: IsGreaterOrEqualTo) => {
    return _t("The value must be greater or equal to %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isLessThan", {
  type: "isLessThan",
  isValueValid: (value: CellValue, criterion: IsLessThan) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue < criterionValue;
  },
  getErrorString: (criterion: IsLessThan) => {
    return _t("The value must be less than %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isLessOrEqualTo", {
  type: "isLessOrEqualTo",
  isValueValid: (value: CellValue, criterion: IsLessOrEqualTo) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValue = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE)[0];

    if (numberValue === undefined || criterionValue === undefined) {
      return false;
    }
    return numberValue <= criterionValue;
  },
  getErrorString: (criterion: IsLessOrEqualTo) => {
    return _t("The value must be less or equal to %s", criterion.values[0]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterion: isBetween) => {
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
  getErrorString: (criterion: isBetween, args: DataValidationEvaluatorArgs) => {
    return _t("The value must be between %s and %s", criterion.values[0], criterion.values[1]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("isNotBetween", {
  type: "isNotBetween",
  isValueValid: (value: CellValue, criterion: isNotBetween) => {
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValues = getCriterionValuesAsNumber(criterion, DEFAULT_LOCALE);

    if (
      numberValue === undefined ||
      criterionValues[0] === undefined ||
      criterionValues[1] === undefined
    ) {
      return false;
    }
    return !isNumberBetween(numberValue, criterionValues[0], criterionValues[1]);
  },
  getErrorString: (criterion: isNotBetween, args: DataValidationEvaluatorArgs) => {
    return _t("The value must not be between %s and %s", criterion.values[0], criterion.values[1]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => criterionErrorStrings.numberValue,
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("isCheckbox", {
  type: "isCheckbox",
  isValueValid: (value: CellValue) => value == "" || typeof value === "boolean",
  getErrorString: () => "The value must be a boolean",
  isCriterionValueValid: () => true,
  getCriterionValueErrorString: () => "",
  numberOfValues: () => 0,
});

function getDateCriterionFormattedValues(criterion: DataValidationCriterion, locale: Locale) {
  const values = getDateCriterionValues(criterion, locale);
  return values.map((value) =>
    value !== undefined
      ? formatValue(value, { locale, format: locale.dateFormat })
      : CellErrorType.InvalidReference
  );
}

function checkValueIsDate(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}

function checkValueIsNumber(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}
