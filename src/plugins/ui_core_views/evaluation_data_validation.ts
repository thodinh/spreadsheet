import { compile } from "../../formulas";
import { deepEquals, isInside, lazy } from "../../helpers";
import { getPositionsInRanges } from "../../helpers/dv_helpers";
import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import {
  CellPosition,
  CellValue,
  DataValidationCriterion,
  DataValidationCriterionType,
  DataValidationRule,
  DEFAULT_LOCALE,
  HeaderIndex,
  Lazy,
  Offset,
  UID,
} from "../../types";
import { CoreViewCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";
import { _t } from "./../../translation";

interface ValidationResult {
  rules: DataValidationRule[];
  errors: string[];
}
type SheetValidationResult = { [col: HeaderIndex]: Array<Lazy<ValidationResult>> };

export class EvaluationDataValidationPlugin extends UIPlugin {
  static getters = [
    "getInvalidDataValidationMessages",
    "getDataValidationInvalidCriterionValueMessage",
    "isDataValidationInvalid",
    "isCellValidCheckbox",
  ] as const;

  readonly validationResults: Record<UID, Lazy<SheetValidationResult>> = {};

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
    const errors = this.getValidationResultsForCell(cellPosition)?.errors;
    return errors !== undefined && errors.length > 0;
  }

  getInvalidDataValidationMessages(cellPosition: CellPosition): string[] {
    return this.getValidationResultsForCell(cellPosition)?.errors || [];
  }

  getDataValidationInvalidCriterionValueMessage(
    criterionType: DataValidationCriterionType,
    value: string
  ): string | undefined {
    const evaluator = dataValidationEvaluatorRegistry.get(criterionType);
    if (!evaluator) {
      throw new Error(_t("Unknown criterion type: %s", criterionType));
    }
    return value.startsWith("=") || evaluator.isCriterionValueValid(value, DEFAULT_LOCALE)
      ? undefined
      : evaluator.getCriterionValueErrorString(value);
  }

  isCellValidCheckbox(cellPosition: CellPosition): boolean {
    const mainCellPosition = this.getters.getMainCellPosition(cellPosition);
    if (!deepEquals(mainCellPosition, cellPosition)) {
      return false;
    }

    const validationResult = this.getValidationResultsForCell(cellPosition);
    if (!validationResult || validationResult.errors.length > 0) {
      return false;
    }

    return validationResult.rules.some((rule) => rule.criterion.type === "isCheckbox");
  }

  private getValidationResultsForCell({
    sheetId,
    col,
    row,
  }: CellPosition): ValidationResult | undefined {
    if (!this.validationResults[sheetId]) {
      this.validationResults[sheetId] = this.computeSheetValidationResultsForSheet(sheetId);
    }
    return this.validationResults[sheetId]()[col]?.[row]?.();
  }

  private computeSheetValidationResultsForSheet(sheetId: UID): Lazy<SheetValidationResult> {
    return lazy(() => {
      const validationResults: SheetValidationResult = {};
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

  private computeSheetValidationResultsForCell(cellPosition: CellPosition): Lazy<ValidationResult> {
    return lazy(() => {
      const rules = this.getters.getValidationRulesForCell(cellPosition);
      const errors: string[] = [];
      for (const rule of rules) {
        const error = this.getRuleErrorStringForCell(cellPosition, rule);
        if (error) {
          errors.push(error);
        }
      }

      return { errors, rules };
    });
  }

  private getRuleErrorStringForCell(
    cellPosition: CellPosition,
    rule: DataValidationRule
  ): string | undefined {
    const cellValue = this.getters.getEvaluatedCell(cellPosition).value;
    return this.getRuleErrorForCellValue(cellValue, cellPosition, rule);
  }

  private getRuleErrorForCellValue(
    cellValue: CellValue,
    cellPosition: CellPosition,
    rule: DataValidationRule
  ): string | undefined {
    const { sheetId } = cellPosition;
    const criterion = rule.criterion;
    const evaluator = dataValidationEvaluatorRegistry.get(criterion.type);
    if (!evaluator) {
      throw new Error(_t("Unknown criterion type: %s", criterion.type));
    }

    const offset = this.getCellOffsetInRule(cellPosition, rule);
    const args = { getters: this.getters };

    const evaluatedCriterionValues = this.getEvaluatedCriterionValues(sheetId, offset, criterion);
    const evaluatedCriterion = { ...criterion, values: evaluatedCriterionValues };
    if (evaluator.isValueValid(cellValue, evaluatedCriterion, args)) {
      return undefined;
    }
    return evaluator.getErrorString(evaluatedCriterion, args);
  }
  private getCellOffsetInRule(cellPosition: CellPosition, rule: DataValidationRule): Offset {
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

  private getEvaluatedCriterionValues(
    sheetId: UID,
    offset: Offset,
    criterion: DataValidationCriterion
  ): string[] {
    return criterion.values.map((value) => {
      if (!value.startsWith("=")) {
        return value;
      }

      const formula = compile(value);
      const translatedFormula = this.getters.getTranslatedCellFormula(
        sheetId,
        offset.col,
        offset.row,
        formula,
        formula.dependencies.map((d) => this.getters.getRangeFromSheetXC(sheetId, d))
      );

      const evaluated = this.getters.evaluateFormula(sheetId, translatedFormula);
      return evaluated ? evaluated.toString() : "";
    });
  }
}
