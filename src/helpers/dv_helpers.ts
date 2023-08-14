import { compile } from "../formulas";
import { _lt } from "../translation";
import {
  CellValue,
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  Getters,
  HeaderIndex,
  Locale,
  Offset,
  Position,
  Range,
  UID,
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

export function getEvaluatedCriterionValues(
  sheetId: UID,
  offset: Offset,
  criterion: DataValidationCriterion,
  getters: Getters
): (CellValue | undefined)[] {
  // if (isDateCriterion(criterion) && criterion.dateValue !== "exactDate") {
  //   return [getCriterionDateValue(criterion.dateValue)];
  // }

  return criterion.values.map((value) => {
    if (!value.startsWith("=")) {
      return value;
    }

    const formula = compile(value);
    const translatedFormula = getters.getTranslatedCellFormula(
      sheetId,
      offset.col,
      offset.row,
      formula,
      formula.dependencies.map((d) => getters.getRangeFromSheetXC(sheetId, d))
    );
    return getters.evaluateFormula(sheetId, translatedFormula);
  });
}

/** Get all the dates values of a criterion converted to numbers, possibly evaluating the formulas  */
export function getEvaluatedDateCriterionValues(
  sheetId: UID,
  offset: Offset,
  criterion: DataValidationCriterion,
  getters: Getters
): (number | undefined)[] {
  if (isDateCriterion(criterion) && criterion.dateValue !== "exactDate") {
    return [getCriterionDateValue(criterion.dateValue)];
  }

  const values = getEvaluatedCriterionValues(sheetId, offset, criterion, getters);
  return values.map((value) => cellValueToNumber(value, getters.getLocale()));
}

export function getEvaluatedStringCriterionValues(
  sheetId: UID,
  offset: Offset,
  criterion: DataValidationCriterion,
  getters: Getters
): string[] {
  const values = getEvaluatedCriterionValues(sheetId, offset, criterion, getters);
  return values.map((value) => (value ? value.toString() : ""));
}

export function getEvaluatedNumberCriterionValues(
  sheetId: UID,
  offset: Offset,
  criterion: DataValidationCriterion,
  getters: Getters
): (number | undefined)[] {
  const values = getEvaluatedCriterionValues(sheetId, offset, criterion, getters);
  return values.map((value) => cellValueToNumber(value, getters.getLocale()));
}
