import { UID } from "./misc";
import { Range } from "./range";

export interface DataValidationRule {
  id: UID;
  criterion: DataValidationCriterion;
  ranges: Range[];
}

export type TextContains = {
  type: "textContains";
  values: string[];
};

export type TextNotContains = {
  type: "textNotContains";
  values: string[];
};

export type TextIs = {
  type: "textIs";
  values: string[];
};

export type TextIsEmail = {
  type: "textIsEmail";
  values: string[];
};

export type TextIsLink = {
  type: "textIsLink";
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

export type DateIsNotBetween = {
  type: "dateIsNotBetween";
  values: string[];
};

export type DateIsValid = {
  type: "dateIsValid";
  values: string[];
};

export type IsEqual = {
  type: "isEqual";
  values: string[];
};

export type IsNotEqual = {
  type: "isNotEqual";
  values: string[];
};

export type IsGreaterThan = {
  type: "isGreaterThan";
  values: string[];
};

export type IsGreaterOrEqualTo = {
  type: "isGreaterOrEqualTo";
  values: string[];
};

export type IsLessThan = {
  type: "isLessThan";
  values: string[];
};

export type IsLessOrEqualTo = {
  type: "isLessOrEqualTo";
  values: string[];
};

export type isBetween = {
  type: "isBetween";
  values: string[];
};

export type isNotBetween = {
  type: "isNotBetween";
  values: string[];
};

export type IsCheckbox = {
  type: "isCheckbox";
  values: string[];
};

export type DataValidationCriterion =
  | TextContains
  | TextNotContains
  | TextIs
  | TextIsEmail
  | TextIsLink
  | isBetween
  | DateIsCriterion
  | DateIsBeforeCriterion
  | DateIsOnOrBefore
  | DateIsAfter
  | DateIsOnOrAfter
  | DateIsBetween
  | DateIsNotBetween
  | DateIsValid
  | IsEqual
  | IsNotEqual
  | IsGreaterThan
  | IsGreaterOrEqualTo
  | IsLessThan
  | IsLessOrEqualTo
  | isNotBetween
  | IsCheckbox;

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
