import { toNumber } from "../functions/helpers";
import { areDatesSameDay, formatValue, isDateBetween, jsDateToRoundNumber } from "../helpers";
import { dateCellValueToNumber, DATES_VALUES, getCriterionDateValue } from "../helpers/dv_helpers";
import { _lt } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationCriterionType,
  DateIsCriterion,
  Getters,
  NumberBetweenCriterion,
  TextContainsCriterion,
  TextNotContainsCriterion,
} from "../types";
import { CellErrorType } from "../types/errors";
import { Registry } from "./registry";

type DataValidationCriterionEvaluator = {
  type: DataValidationCriterionType;
  isValueValid: (value: CellValue, criterion: DataValidationCriterion, getters: Getters) => boolean;
  getErrorString: (
    value: CellValue,
    criterion: DataValidationCriterion,
    getters: Getters
  ) => string;
};

function getCriterionEvaluator(
  criterion: DataValidationCriterion
): DataValidationCriterionEvaluator {
  const evaluator = dataValidationCriterionMatcher.get(criterion.type);
  if (!evaluator) {
    throw new Error(_lt("Unknown criterion type: %s", criterion.type));
  }
  return evaluator;
}

export function evaluateCriterion(
  value: CellValue,
  criterion: DataValidationCriterion,
  getters: Getters
) {
  const evaluator = getCriterionEvaluator(criterion);
  return evaluator.isValueValid(value, criterion, getters);
}

export function getCriterionErrorString(
  value: CellValue,
  criterion: DataValidationCriterion,
  getters: Getters
) {
  const evaluator = getCriterionEvaluator(criterion);
  if (evaluator.isValueValid(value, criterion, getters)) {
    return undefined;
  }
  return evaluator.getErrorString(value, criterion, getters);
}

export const dataValidationCriterionMatcher = new Registry<DataValidationCriterionEvaluator>();
dataValidationCriterionMatcher.add("textContains", {
  type: "textContains",
  isValueValid: (value: CellValue, criterion: TextContainsCriterion) => {
    return (
      typeof value === "string" && value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (value: CellValue, criterion: TextContainsCriterion) => {
    return _lt('The value must be a text that contains: "%s"', criterion.values[0]);
  },
});

dataValidationCriterionMatcher.add("textNotContains", {
  type: "textNotContains",
  isValueValid: (value: CellValue, criterion: TextNotContainsCriterion) => {
    return (
      typeof value === "string" && !value.toLowerCase().includes(criterion.values[0].toLowerCase())
    );
  },
  getErrorString: (value: CellValue, criterion: TextNotContainsCriterion) => {
    return _lt('The value must be a text that does not contain: "%s"', criterion.values[0]);
  },
});

dataValidationCriterionMatcher.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterion: NumberBetweenCriterion, getters: Getters) => {
    const [min, max] = criterion.values;
    if (typeof value !== "number") {
      return false;
    }
    const locale = getters.getLocale();
    return toNumber(min, locale) <= value && value <= toNumber(max, locale);
  },
  getErrorString: (value: CellValue, criterion: NumberBetweenCriterion) => {
    return _lt("The value must be between %s and %s", criterion.values[0], criterion.values[1]);
  },
});

dataValidationCriterionMatcher.add("dateIs", {
  type: "dateIs",
  isValueValid: (cellValue: CellValue, criterion: DateIsCriterion, getters: Getters) => {
    if (typeof cellValue !== "number") {
      return false;
    }

    let dateValue = getCriterionDateValue(criterion);
    if (typeof dateValue === "string") {
      const numberDate = dateCellValueToNumber(dateValue, getters.getLocale());
      if (!numberDate) {
        return true;
      }
      dateValue = numberDate;
    }

    if (["lastWeek", "lastMonth", "lastYear"].includes(criterion.dateValue)) {
      const today = jsDateToRoundNumber(new Date());
      return isDateBetween(cellValue, today, dateValue);
    }

    return areDatesSameDay(cellValue, dateValue);
  },
  getErrorString: (value: CellValue, criterion: DateIsCriterion, getters: Getters) => {
    if (criterion.dateValue === "exactDate") {
      const locale = getters.getLocale();
      const dateValue = dateCellValueToNumber(criterion.values[0], locale);
      return _lt(
        "The value must be a date equal to %s",
        dateValue
          ? formatValue(dateValue, { locale, format: locale.dateFormat })
          : CellErrorType.InvalidReference
      );
    }
    return _lt(
      "The value must be a date and must be %s",
      DATES_VALUES[criterion.dateValue].toString()
    );
  },
});
