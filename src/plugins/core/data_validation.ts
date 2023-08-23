import { copyRangeWithNewSheetId, isInside } from "../../helpers";
import { dataValidationEvaluatorRegistry } from "../../registries/data_validation_registry";
import {
  ApplyRangeChange,
  CellPosition,
  Command,
  CommandResult,
  CoreCommand,
  DataValidationInternal,
  DataValidationRule,
  DEFAULT_LOCALE,
  Range,
  UID,
  WorkbookData,
} from "../../types";
import { CorePlugin } from "../core_plugin";

interface DataValidationState {
  readonly dvRules: { [sheet: string]: DataValidationInternal[] };
}

/**
 *
 * TODO:
 *
 * - props validation
 * - custom formula
 * - checkbox
 * - dropdown
 * - blocking validation
 * - localize inputs before sending them to the plugin
 *
 * To discuss:
 * - input in error at start when empty
 * - locale:
 *   - send raw inputted value to plugin, and let the dv validator handle the locale
 *          - => breaks when the locale is changed
 *   - send the un-localized value to the plugin
 *        - need to implement (un)localization of dates
 */
export class DataValidationPlugin
  extends CorePlugin<DataValidationState>
  implements DataValidationState
{
  static getters = [
    "getDataValidationRanges",
    "getDataValidationRule",
    "getDataValidationRules",
    "getValidationRulesForCell",
  ] as const;

  readonly dvRules: { [sheet: string]: DataValidationInternal[] } = {};

  loopThroughRangesOfSheet(sheetId: UID, applyChange: ApplyRangeChange) {
    for (const rule of this.dvRules[sheetId]) {
      for (const range of rule.ranges) {
        const change = applyChange(range);
        switch (change.changeType) {
          case "REMOVE":
            let copy = rule.ranges.slice();
            copy.splice(rule.ranges.indexOf(range), 1);
            if (copy.length >= 1) {
              this.history.update(
                "dvRules",
                sheetId,
                this.dvRules[sheetId].indexOf(rule),
                "ranges",
                copy
              );
            } else {
              this.removeDataValidationRule(rule.id, sheetId);
            }

            break;
          case "RESIZE":
          case "MOVE":
          case "CHANGE":
            this.history.update(
              "dvRules",
              sheetId,
              this.dvRules[sheetId].indexOf(rule),
              "ranges",
              rule.ranges.indexOf(range),
              change.range
            );
            break;
        }
      }
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    if (sheetId) {
      this.loopThroughRangesOfSheet(sheetId, applyChange);
    } else {
      for (const sheetId of Object.keys(this.dvRules)) {
        this.loopThroughRangesOfSheet(sheetId, applyChange);
      }
    }
  }

  allowDispatch(cmd: Command) {
    switch (cmd.type) {
      case "ADD_DATA_VALIDATION_RULE":
        const criterion = cmd.dv.criterion;
        if (!dataValidationEvaluatorRegistry.contains(criterion.type)) {
          return CommandResult.UnknownDataValidationCriterionType;
        }
        const dvEvaluator = dataValidationEvaluatorRegistry.get(criterion.type);
        if (
          criterion.values.some(
            (value) =>
              !value.startsWith("=") && !dvEvaluator.isCriterionValueValid(value, DEFAULT_LOCALE)
          )
        ) {
          return CommandResult.InvalidDataValidationCriterionValue;
        }
        if (criterion.values.length !== dvEvaluator.numberOfValues(criterion)) {
          return CommandResult.InvalidNumberOfCriterionValues;
        }
        break;
      case "REMOVE_DATA_VALIDATION_RULE":
        if (!this.dvRules[cmd.sheetId].find((dv) => dv.id === cmd.id)) {
          return CommandResult.UnknownDataValidationRule;
        }
        break;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.dvRules[cmd.sheetId] = [];
        break;
      case "DUPLICATE_SHEET":
        const rules = this.dvRules[cmd.sheetId].map((dv) => ({
          ...dv,
          ranges: dv.ranges.map((range) =>
            copyRangeWithNewSheetId(cmd.sheetId, cmd.sheetIdTo, range)
          ),
        }));
        this.history.update("dvRules", cmd.sheetIdTo, rules);
        break;
      case "DELETE_SHEET":
        const dvRules = { ...this.dvRules };
        delete dvRules[cmd.sheetId];
        this.history.update("dvRules", dvRules);
        break;
      case "REMOVE_DATA_VALIDATION_RULE": {
        const rules = this.dvRules[cmd.sheetId].filter((dv) => dv.id !== cmd.id);
        this.history.update("dvRules", cmd.sheetId, rules);
        break;
      }
      case "ADD_DATA_VALIDATION_RULE": {
        const newRule: DataValidationInternal = {
          ...cmd.dv,
          ranges: cmd.ranges.map((range) => this.getters.getRangeFromRangeData(range)),
        };

        if (this.dvRules[cmd.sheetId].find((dv) => dv.id === cmd.dv.id)) {
          const newRules = [...this.dvRules[cmd.sheetId]];
          const index = this.dvRules[cmd.sheetId].findIndex((dv) => dv.id === cmd.dv.id);
          newRules[index] = newRule;
          this.history.update("dvRules", cmd.sheetId, newRules);
          break;
        } else {
          const newRules = [...this.dvRules[cmd.sheetId], newRule];
          this.history.update("dvRules", cmd.sheetId, newRules);
        }
        break;
      }
    }
  }

  private removeDataValidationRule(sheetId: UID, ruleId: UID) {
    const rules = this.dvRules[sheetId];
    const newRules = rules.filter((rule) => rule.id !== ruleId);
    this.history.update("dvRules", sheetId, newRules);
  }

  getDataValidationRules(sheetId: UID): DataValidationRule[] {
    return this.dvRules[sheetId].map((dv) => this.toDataValidationRule(sheetId, dv));
  }

  getDataValidationRule(sheetId: UID, id: UID): DataValidationRule | undefined {
    const dvRule = this.dvRules[sheetId].find((dv) => dv.id === id);
    return dvRule ? this.toDataValidationRule(sheetId, dvRule) : undefined;
  }

  getDataValidationRanges(sheetId: UID): Range[] {
    return this.dvRules[sheetId].map((dv) => dv.ranges).flat();
  }

  getValidationRulesForCell({ sheetId, col, row }: CellPosition): DataValidationInternal[] {
    const rules = this.dvRules[sheetId];
    const result: DataValidationInternal[] = [];
    for (const rule of rules) {
      for (const range of rule.ranges) {
        if (isInside(col, row, range.zone)) {
          result.push(rule);
        }
      }
    }
    return result;
  }

  private toDataValidationRule(sheetId: UID, dv: DataValidationInternal): DataValidationRule {
    return {
      id: dv.id,
      criterion: dv.criterion,
      ranges: dv.ranges.map((range) => this.getters.getRangeString(range, sheetId)),
    };
  }

  private toDataValidationInternal(sheetId: UID, dv: DataValidationRule): DataValidationInternal {
    return {
      id: dv.id,
      criterion: dv.criterion,
      ranges: dv.ranges.map((range) => this.getters.getRangeFromSheetXC(sheetId, range)),
    };
  }

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      this.dvRules[sheet.id] = [];
      if (!sheet.dataValidation) {
        continue;
      }
      for (const dv of sheet.dataValidation) {
        this.dvRules[sheet.id].push(this.toDataValidationInternal(sheet.id, dv));
      }
    }
  }

  export(data: Partial<WorkbookData>) {
    if (!data.sheets) {
      return;
    }
    for (const sheet of data.sheets) {
      sheet.dataValidation = [];
      for (const dv of this.dvRules[sheet.id]) {
        sheet.dataValidation.push(this.toDataValidationRule(sheet.id, dv));
      }
    }
  }
}
