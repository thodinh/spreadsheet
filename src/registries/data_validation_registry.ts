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
  cellValue: CellValue;
  offset: Offset;
  sheetId: UID;
  getters: Getters;
}

type DataValidationCriterionEvaluator = {
  type: DataValidationCriterionType;
  isValueValid: (criterion: DataValidationCriterion, args: DataValidationEvaluatorArgs) => boolean;
  getErrorString: (criterion: DataValidationCriterion, args: DataValidationEvaluatorArgs) => string;
  isCriterionValueValid: (value: string, locale: Locale) => boolean;
  getCriterionValueErrorString: (value: string) => string;
  numberOfValues: number;
};

export const dataValidationCriterionMatcher = new Registry<DataValidationCriterionEvaluator>();
dataValidationCriterionMatcher.add("textContains", {
  type: "textContains",
  isValueValid: (criterion: TextContainsCriterion, args: DataValidationEvaluatorArgs) => {
    const { sheetId, offset, getters } = args;
    const value = args.cellValue;
    const criterionValues = getEvaluatedStringCriterionValues(sheetId, offset, criterion, getters);

    return (
      typeof value === "string" && value.toLowerCase().includes(criterionValues[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextContainsCriterion) => {
    return _lt('The value must be a text that contains: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => true,
  getCriterionValueErrorString: (value: string) => "",
  numberOfValues: 1,
});

dataValidationCriterionMatcher.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (criterion: TextNotContainsCriterion, args: DataValidationEvaluatorArgs) => {
    const { sheetId, offset, getters } = args;
    const value = args.cellValue;
    const criterionValues = getEvaluatedStringCriterionValues(sheetId, offset, criterion, getters);

    return (
      typeof value === "string" && !value.toLowerCase().includes(criterionValues[0].toLowerCase())
    );
  },
  getErrorString: (criterion: TextNotContainsCriterion) => {
    return _lt('The value must be a text that does not contain: "%s"', criterion.values[0]);
  },
  isCriterionValueValid: (value: string) => true,
  getCriterionValueErrorString: (value: string) => "",
  numberOfValues: 1,
});

dataValidationCriterionMatcher.add("isBetween", {
  type: "isBetween",
  isValueValid: (criterion: NumberBetweenCriterion, args: DataValidationEvaluatorArgs) => {
    const { sheetId, offset, getters, cellValue } = args;
    const value = cellValueToNumber(cellValue, DEFAULT_LOCALE);
    const criterionValues = getEvaluatedNumberCriterionValues(sheetId, offset, criterion, getters);

    if (
      value === undefined ||
      criterionValues[0] === undefined ||
      criterionValues[1] === undefined
    ) {
      return false;
    }
    return isNumberBetween(value, criterionValues[0], criterionValues[1]);
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
  numberOfValues: 2,
});

dataValidationCriterionMatcher.add("dateIs", {
  type: "dateIs",
  isValueValid: (criterion: DateIsCriterion, args: DataValidationEvaluatorArgs) => {
    const { sheetId, offset, getters, cellValue } = args;

    if (typeof cellValue !== "number") {
      return false;
    }
    const criterionValue = getEvaluatedDateCriterionValues(sheetId, offset, criterion, getters)[0];
    if (!criterionValue) {
      return false;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(new Date());
      return isDateBetween(cellValue, today, criterionValue);
    }

    return areDatesSameDay(cellValue, criterionValue);
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
      "The value must be a date and must be %s",
      DATES_VALUES[criterion.dateValue].toString()
    );
  },
  isCriterionValueValid: (value, locale) => checkValueIsDate(value, locale),
  getCriterionValueErrorString: () => _lt("The value must be a date"),
  numberOfValues: 1,
});

function checkValueIsDate(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}

function checkValueIsNumber(value: string, locale: Locale): boolean {
  const valueAsNumber = cellValueToNumber(value, locale);
  return valueAsNumber !== undefined;
}
