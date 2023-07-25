import { isDefined, lazy } from "../../helpers";
import {
  getCriterionDateValue,
  getPositionsInRanges,
  isDateCriterion,
} from "../../helpers/dv_helpers";
import { getCriterionErrorString } from "../../registries/data_validation_registry";
import {
  CellPosition,
  CellValue,
  DataValidationCriterion,
  DataValidationError,
  HeaderIndex,
  Lazy,
  UID,
} from "../../types";
import { CoreViewCommand } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

type ValidationResult = { [col: HeaderIndex]: Array<Lazy<DataValidationError[]>> };

export class EvaluationDataValidationPlugin extends UIPlugin {
  static getters = ["isDataValidationInvalid", "getInvalidDataValidationMessages"] as const;

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

  isDataValidationInvalid({ sheetId, col, row }: CellPosition): boolean {
    if (!this.validationResults[sheetId]) {
      this.validationResults[sheetId] = this.computeSheetValidationResultsForSheet(sheetId);
    }
    return this.validationResults[sheetId]()[col]?.[row]?.().length > 0;
  }

  getInvalidDataValidationMessages({ sheetId, col, row }: CellPosition): DataValidationError[] {
    if (!this.validationResults[sheetId]) {
      this.validationResults[sheetId] = this.computeSheetValidationResultsForSheet(sheetId);
    }
    return this.validationResults[sheetId]()[col]?.[row]?.();
  }

  getResolvedCriterionValues(
    sheetId: UID,
    criterion: DataValidationCriterion
  ): (CellValue | undefined)[] {
    if (isDateCriterion(criterion) && criterion.dateValue !== "exactDate") {
      return [getCriterionDateValue(criterion.dateValue)];
    }

    return criterion.values.map((value) => {
      return value.startsWith("=") ? this.getters.evaluateFormula(sheetId, value) : value;
    });
  }

  private computeSheetValidationResultsForSheet(sheetId: UID): Lazy<ValidationResult> {
    return lazy(() => {
      const validationResults: ValidationResult = {};
      const ranges = this.getters.getDataValidationRanges(sheetId);
      for (const { col, row } of getPositionsInRanges(ranges)) {
        if (!validationResults[col]) {
          validationResults[col] = [];
        }
        validationResults[col][row] = this.computeSheetValidationResultsForCell(sheetId, col, row);
      }
      return validationResults;
    });
  }

  private computeSheetValidationResultsForCell(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): Lazy<DataValidationError[]> {
    return lazy(() => {
      const criteria = this.getters.getValidationCriteriaForCell({ sheetId, col, row });
      const evaluatedCell = this.getters.getEvaluatedCell({ sheetId, col, row });
      return criteria
        .map((criterion) => getCriterionErrorString(evaluatedCell.value, criterion, this.getters))
        .filter(isDefined);
    });
  }
}
