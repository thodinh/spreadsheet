import { _lt } from "../translation";
import {
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  HeaderIndex,
  Locale,
  Position,
  Range,
} from "../types";
import { parseLiteral } from "./cells";
import { jsDateToRoundNumber } from "./dates";
import { positions } from "./zones";

export const DATES_VALUES: Record<DateCriterionValue, string> = {
  today: _lt("today"),
  yesterday: _lt("yesterday"),
  tomorrow: _lt("tomorrow"),
  lastWeek: _lt("in the past week"),
  lastMonth: _lt("in the past month"),
  lastYear: _lt("in the past year"),
  exactDate: _lt("exact date"),
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
      return jsDateToRoundNumber(today);
    case "yesterday":
      return jsDateToRoundNumber(new Date(today.setDate(today.getDate() - 1)));
    case "tomorrow":
      return jsDateToRoundNumber(new Date(today.setDate(today.getDate() + 1)));
    case "lastWeek":
      return jsDateToRoundNumber(new Date(today.setDate(today.getDate() - 7)));
    case "lastMonth":
      return jsDateToRoundNumber(new Date(today.setMonth(today.getMonth() - 1)));
    case "lastYear":
      return jsDateToRoundNumber(new Date(today.setFullYear(today.getFullYear() - 1)));
  }
}

export function dateCellValueToNumber(value: number | string, locale: Locale): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  const dateValue = parseLiteral(value, locale);
  if (typeof dateValue !== "number") {
    return undefined;
  }
  return dateValue;
}
