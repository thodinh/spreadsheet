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
import { Command, CommandResult, CoreViewCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";
import { _t } from "./../../translation";

interface ValidationResult {
  rules: DataValidationRule[];
  errors: string[];
  isBlocking: boolean;
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

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        const cellPosition = { sheetId: cmd.sheetId, col: cmd.col, row: cmd.row };
        let cellValue =
          "content" in cmd ? cmd.content : this.getters.getEvaluatedCell(cellPosition).value;
        if (typeof cellValue === "string" && cellValue.startsWith("=")) {
          cellValue = this.getters.evaluateFormula(cmd.sheetId, cellValue);
        }
        const validationResult = this.getValidationResultForCellValue(
          cellValue ?? "",
          cellPosition
        );
        if (validationResult.errors.length > 0 && validationResult.isBlocking) {
          console.log("Blocking validation rule");
          return CommandResult.BlockingValidationRule;
        }
    }
    return CommandResult.Success;
  }

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
      const cellValue = this.getters.getEvaluatedCell(cellPosition).value;
      return this.getValidationResultForCellValue(cellValue, cellPosition);
    });
  }

  private getValidationResultForCellValue(
    cellValue: CellValue,
    cellPosition: CellPosition
  ): ValidationResult {
    const rules = this.getters.getValidationRulesForCell(cellPosition);
    const errors: string[] = [];
    for (const rule of rules) {
      const error = this.getRuleErrorForCellValue(cellValue, cellPosition, rule);
      if (error) {
        errors.push(error);
      }
    }

    const isBlocking = rules.some((rule) => rule.isBlocking);
    return { errors, rules, isBlocking };
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
