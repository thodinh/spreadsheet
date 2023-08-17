import { UID } from "./misc";
import { Range } from "./range";

export interface DataValidationInternal {
  id: UID;
  criterion: DataValidationCriterion;
  ranges: Range[];
}

export interface DataValidationRule extends Omit<DataValidationInternal, "ranges"> {
  ranges: string[];
}

export type TextContainsCriterion = {
  type: "textContains";
  values: string[];
};

export type TextNotContainsCriterion = {
  type: "textNotContains";
  values: string[];
};

export type NumberBetweenCriterion = {
  type: "isBetween";
  values: string[];
};

export type DateIsCriterion = {
  type: "dateIs";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsBeforeCriterion = {
  type: "dateIsBefore";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsOnOrBefore = {
  type: "dateIsOnOrBefore";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsAfter = {
  type: "dateIsAfter";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsOnOrAfter = {
  type: "dateIsOnOrAfter";
  dateValue: DateCriterionValue;
  values: string[];
};

export type DateIsBetween = {
  type: "dateIsBetween";
  values: string[];
};

export type DataValidationCriterion =
  | TextContainsCriterion
  | TextNotContainsCriterion
  | NumberBetweenCriterion
  | DateIsCriterion
  | DateIsBeforeCriterion
  | DateIsOnOrBefore
  | DateIsAfter
  | DateIsOnOrAfter
  | DateIsBetween;

export type DateCriterionValue =
  | "today"
  | "tomorrow"
  | "yesterday"
  | "lastWeek"
  | "lastMonth"
  | "lastYear"
  | "exactDate";

export type DataValidationCriterionType = DataValidationCriterion["type"];

export type DataValidationDateCriterion = Extract<
  DataValidationCriterion,
  { dateValue: DateCriterionValue }
>;
