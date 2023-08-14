import { isDefined, isInside, lazy } from "../../helpers";
import { getPositionsInRanges } from "../../helpers/dv_helpers";
import { dataValidationCriterionMatcher } from "../../registries/data_validation_registry";
import {
  CellPosition,
  DataValidationCriterionType,
  DataValidationInternal,
  DEFAULT_LOCALE,
  HeaderIndex,
  Lazy,
  Offset,
  UID,
} from "../../types";
import { CoreViewCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";
import { _lt } from "./../../translation";

type ValidationResult = { [col: HeaderIndex]: Array<Lazy<string[]>> };

export class EvaluationDataValidationPlugin extends UIPlugin {
  static getters = [
    "isDataValidationInvalid",
    "getInvalidDataValidationMessages",
    "getDataValidationInvalidCriterionValueMessage",
  ] as const;

  readonly validationResults: Record<UID, Lazy<ValidationResult>> = {};

  handle(cmd: CoreViewCommand) {
    switch (cmd.type) {
      case "DELETE_SHEET":
      case "UPDATE_CELL":
      case "ADD_DATA_VALIDATION_RULE":
      case "REMOVE_DATA_VALIDATION_RULE":
        delete this.validationResults[cmd.sheetId];
        break;
    }
  }

  isDataValidationInvalid(cellPosition: CellPosition): boolean {
    return this.getValidationResultsForCell(cellPosition)?.length > 0;
  }

  getInvalidDataValidationMessages(cellPosition: CellPosition): string[] {
    return this.getValidationResultsForCell(cellPosition);
  }

  getDataValidationInvalidCriterionValueMessage(
    criterionType: DataValidationCriterionType,
    value: string
  ): string | undefined {
    const evaluator = dataValidationCriterionMatcher.get(criterionType);
    if (!evaluator) {
      throw new Error(_lt("Unknown criterion type: %s", criterionType));
    }
    return value.startsWith("=") || evaluator.isCriterionValueValid(value, DEFAULT_LOCALE)
      ? undefined
      : evaluator.getCriterionValueErrorString(value);
  }

  private getValidationResultsForCell({ sheetId, col, row }: CellPosition): string[] {
    if (!this.validationResults[sheetId]) {
      this.validationResults[sheetId] = this.computeSheetValidationResultsForSheet(sheetId);
    }
    return this.validationResults[sheetId]()[col]?.[row]?.();
  }

  private computeSheetValidationResultsForSheet(sheetId: UID): Lazy<ValidationResult> {
    return lazy(() => {
      const validationResults: ValidationResult = {};
      const ranges = this.getters.getDataValidationRanges(sheetId);
      for (const { col, row } of getPositionsInRanges(ranges)) {
        if (!validationResults[col]) {
          validationResults[col] = [];
        }
        validationResults[col][row] = this.computeSheetValidationResultsForCell({
          sheetId,
          col,
          row,
        });
      }
      return validationResults;
    });
  }

  private computeSheetValidationResultsForCell(cellPosition: CellPosition): Lazy<string[]> {
    return lazy(() => {
      const rules = this.getters.getValidationRulesForCell(cellPosition);
      return rules
        .map((rule) => this.getRuleErrorStringForCell(cellPosition, rule))
        .filter(isDefined);
    });
  }

  private getRuleErrorStringForCell(
    cellPosition: CellPosition,
    rule: DataValidationInternal
  ): string | undefined {
    const criterion = rule.criterion;
    const evaluator = dataValidationCriterionMatcher.get(criterion.type);
    if (!evaluator) {
      throw new Error(_lt("Unknown criterion type: %s", criterion.type));
    }

    const offset = this.getCellOffsetInRule(cellPosition, rule);
    const cellValue = this.getters.getEvaluatedCell(cellPosition).value;
    const args = { cellValue, offset, sheetId: cellPosition.sheetId, getters: this.getters };

    if (evaluator.isValueValid(criterion, args)) {
      return undefined;
    }
    return evaluator.getErrorString(criterion, args);
  }

  private getCellOffsetInRule(cellPosition: CellPosition, rule: DataValidationInternal): Offset {
    const range = rule.ranges.find((range) =>
      isInside(cellPosition.col, cellPosition.row, range.zone)
    );
    if (!range) {
      throw new Error("The cell is not in any range of the rule");
    }
    return {
      col: cellPosition.col - range.zone.left,
      row: cellPosition.row - range.zone.top,
    };
  }
}
