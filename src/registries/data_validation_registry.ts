import { toNumber } from "../functions/helpers";
import { _lt } from "../translation";
import { CellValue, DataValidationCriterion, DataValidationCriterionType, Getters } from "../types";
import { Registry } from "./registry";

type DataValidationCriterionEvaluator = {
  type: DataValidationCriterionType;
  isValueValid: (value: CellValue, criterionValues: string[], getters: Getters) => boolean;
  getErrorString: (value: CellValue, criterionValues: string[], getters: Getters) => string;
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
  return evaluator.isValueValid(value, criterion.values, getters);
}

export function getCriterionErrorString(
  value: CellValue,
  criterion: DataValidationCriterion,
  getters: Getters
) {
  const evaluator = getCriterionEvaluator(criterion);
  if (evaluator.isValueValid(value, criterion.values, getters)) {
    return undefined;
  }
  return evaluator.getErrorString(value, criterion.values, getters);
}

export const dataValidationCriterionMatcher = new Registry<DataValidationCriterionEvaluator>();
dataValidationCriterionMatcher.add("textContains", {
  type: "textContains",
  isValueValid: (value: CellValue, criterionValues: string[]) => {
    return (
      typeof value === "string" && value.toLowerCase().includes(criterionValues[0].toLowerCase())
    );
  },
  getErrorString: (value: CellValue, criterionValues: string[]) => {
    return _lt('The value must be a text that contains: "%s"', criterionValues[0]);
  },
});

dataValidationCriterionMatcher.add("isBetween", {
  type: "isBetween",
  isValueValid: (value: CellValue, criterionValues: string[], getters: Getters) => {
    const [min, max] = criterionValues;
    if (typeof value !== "number") {
      return false;
    }
    const locale = getters.getLocale();
    return toNumber(min, locale) <= value && value <= toNumber(max, locale);
  },
  getErrorString: (value: CellValue, criterionValues: string[]) => {
    return _lt("The value must be between %s and %s", criterionValues[0], criterionValues[1]);
  },
});
