import {
  areDatesSameDay,
  formatValue,
  isDateBetween,
  isNumberBetween,
  jsDateToRoundNumber,
} from "../helpers";
import {
  cellValueToNumber,
  DATES_VALUES,
  getEvaluatedDateCriterionValues,
  getEvaluatedNumberCriterionValues,
  getEvaluatedStringCriterionValues,
} from "../helpers/dv_helpers";
import { _lt } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsCriterion,
  DEFAULT_LOCALE,
  Getters,
  Locale,
  NumberBetweenCriterion,
  Offset,
  TextContainsCriterion,
  TextNotContainsCriterion,
  UID,
} from "../types";
import { CellErrorType } from "../types/errors";
import { Registry } from "./registry";

interface DataValidationEvaluatorArgs {
  offset: Offset;
  sheetId: UID;
  getters: Getters;
}

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
  isValueValid: (
    value: CellValue,
    criterion: TextContainsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const { sheetId, offset, getters } = args;
    const criterionValues = getEvaluatedStringCriterionValues(sheetId, offset, criterion, getters);

    return (
      typeof value === "string" && value.toLowerCase().includes(criterionValues[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextContainsCriterion) => {
    return _lt('The value must be a text that contains: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: (value: string) => _lt("The value must not be empty"),
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (
    value: CellValue,
    criterion: TextNotContainsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const { sheetId, offset, getters } = args;
    const criterionValues = getEvaluatedStringCriterionValues(sheetId, offset, criterion, getters);

    return (
      typeof value === "string" && !value.toLowerCase().includes(criterionValues[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextNotContainsCriterion) => {
    return _lt('The value must be a text that does not contain: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => !!value,
  getCriterionValueErrorString: (value: string) => _lt("The value must not be empty"),
  numberOfValues: () => 1,
});

dataValidationEvaluatorRegistry.add("isBetween", {
  type: "isBetween",
  isValueValid: (
    value: CellValue,
    criterion: NumberBetweenCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const { sheetId, offset, getters } = args;
    const numberValue = cellValueToNumber(value, DEFAULT_LOCALE);
    const criterionValues = getEvaluatedNumberCriterionValues(sheetId, offset, criterion, getters);

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
    const { sheetId, offset, getters } = args;
    const criterionValues = getEvaluatedNumberCriterionValues(
      sheetId,
      offset,
      criterion,
      getters
    ).map((value) => (value !== undefined ? value.toString() : CellErrorType.InvalidReference));
    return _lt("The value must be between %s and %s", criterionValues[0], criterionValues[1]);
  },
  isCriterionValueValid: (value, locale) => checkValueIsNumber(value, locale),
  getCriterionValueErrorString: () => _lt("The value must be a number"),
  numberOfValues: () => 2,
});

dataValidationEvaluatorRegistry.add("dateIs", {
  type: "dateIs",
  isValueValid: (
    value: CellValue,
    criterion: DateIsCriterion,
    args: DataValidationEvaluatorArgs
  ) => {
    const { sheetId, offset, getters } = args;

    if (typeof value !== "number") {
      return false;
    }
    const criterionValue = getEvaluatedDateCriterionValues(sheetId, offset, criterion, getters)[0];
    if (!criterionValue) {
      return false;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(new Date());
      return isDateBetween(value, today, criterionValue);
    }

    return areDatesSameDay(value, criterionValue);
  },
  getErrorString: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    if (criterion.dateValue === "exactDate") {
      const { sheetId, offset, getters } = args;
      const locale = DEFAULT_LOCALE;
      const value = getEvaluatedDateCriterionValues(sheetId, offset, criterion, getters)[0];
      return _lt(
        "The value must be a date equal to %s",
        value !== undefined
          ? formatValue(value, { locale, format: locale.dateFormat })
          : CellErrorType.InvalidReference
      );
    }

    return _lt(
      "The value must be a date equal to %s",
      DATES_VALUES[criterion.dateValue].toString()
    );
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => _lt("The value must be a date"),
  numberOfValues: (criterion: DateIsCriterion) => (criterion.dateValue === "exactDate" ? 1 : 0),
});

function checkValueIsDate(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}

function checkValueIsNumber(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}
