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

//ADRM TODO : useful ?
export type DataValidationError = string;

export type DataValidationCriterion = TextContainsCriterion | NumberBetweenCriterion;
export type DataValidationCriterionType = DataValidationCriterion["type"];

type TextContainsCriterion = {
  type: "textContains";
  values: string[];
};

type NumberBetweenCriterion = {
  type: "isBetween";
  values: string[];
};
