import { _t } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  HeaderIndex,
  Locale,
  Position,
  Range,
} from "../types";
import { parseLiteral } from "./cells";
import { jsDateToNumber } from "./dates";
import { positions } from "./zones";

export const DATES_VALUES: Record<DateCriterionValue, string> = {
  today: _t("today"),
  yesterday: _t("yesterday"),
  tomorrow: _t("tomorrow"),
  lastWeek: _t("in the past week"),
  lastMonth: _t("in the past month"),
  lastYear: _t("in the past year"),
  exactDate: _t("exact date"),
};

export function getPositionsInRanges(ranges: Range[]): Position[] {
  const positionMap = new Map<HeaderIndex, Set<HeaderIndex>>();
  for (const range of ranges) {
    for (const position of positions(range.zone)) {
      if (!positionMap.has(position.col)) {
        positionMap.set(position.col, new Set());
      }
      positionMap.get(position.col)!.add(position.row);
    }
  }

  return [...positionMap.entries()]
    .map(([col, rows]) => [...rows.values()].map((row) => ({ col, row })))
    .flat();
}

export function isDateCriterion(
  criterion: DataValidationCriterion
): criterion is DataValidationDateCriterion {
  return "dateValue" in criterion;
}

export function getCriterionDateValue(dateValue: Exclude<DateCriterionValue, "exactDate">): number {
  const today = new Date();
  switch (dateValue) {
    case "today":
      return jsDateToNumber(today);
    case "yesterday":
      return jsDateToNumber(new Date(today.setDate(today.getDate() - 1)));
    case "tomorrow":
      return jsDateToNumber(new Date(today.setDate(today.getDate() + 1)));
    case "lastWeek":
      return jsDateToNumber(new Date(today.setDate(today.getDate() - 7)));
    case "lastMonth":
      return jsDateToNumber(new Date(today.setMonth(today.getMonth() - 1)));
    case "lastYear":
      return jsDateToNumber(new Date(today.setFullYear(today.getFullYear() - 1)));
  }
}

/** Convert a cell value to a number. Return undefined if it cannot be converted to a number. */
export function cellValueToNumber(
  value: CellValue | undefined,
  locale: Locale
): number | undefined {
  if (typeof value === "number") {
    return value;
  } else if (typeof value === "string") {
    const parsed = parseLiteral(value, locale);
    return typeof parsed === "number" ? parsed : undefined;
  }
  return undefined;
}

/** Get all the dates values of a criterion converted to numbers, converting date values such as "today" to actual dates  */
export function getDateCriterionValues(
  criterion: DataValidationCriterion,
  locale: Locale
): (number | undefined)[] {
  if (isDateCriterion(criterion) && criterion.dateValue !== "exactDate") {
    return [getCriterionDateValue(criterion.dateValue)];
  }

  return criterion.values.map((value) => cellValueToNumber(value, locale));
}

/** Convert the criterion values to numbers. Return undefined values if they cannot be converted to numbers. */
export function getCriterionValuesAsNumber(criterion: DataValidationCriterion, locale: Locale) {
  return criterion.values.map((value) => cellValueToNumber(value, locale));
}
