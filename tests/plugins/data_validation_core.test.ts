import { CommandResult, Model } from "../../src";
import { UID } from "../../src/types";
import {
  addDataValidation,
  redo,
  removeDataValidation,
  undo,
} from "../test_helpers/commands_helpers";

describe("Data validation", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  describe("allowDispatch results", () => {
    test("Cannot add unknown criterion type", () => {
      const result = addDataValidation(model, "A1", "id", { type: "random" as any, values: ["1"] });
      expect(result).toBeCancelledBecause(CommandResult.UnknownDataValidationCriterionType);
    });

    test("Cannot add invalid criterion values", () => {
      const result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["abc", "oi"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidDataValidationCriterionValue);
    });

    test("Cannot have too few or too many criterion values", () => {
      let result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["5"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidNumberOfCriterionValues);

      result = addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["5", "8", "78"],
      });
      expect(result).toBeCancelledBecause(CommandResult.InvalidNumberOfCriterionValues);
    });

    test("Cannot remove invalid data validation", () => {
      const result = removeDataValidation(model, "notAnExistingId");
      expect(result).toBeCancelledBecause(CommandResult.UnknownDataValidationRule);
    });
  });

  test("Can add a data validation rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
  });

  test("Adding a rule with an existing id will replace the old one", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    addDataValidation(model, "A1:C2", "id", { type: "isBetween", values: ["1", "5"] });

    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "isBetween", values: ["1", "5"] },
        ranges: ["A1:C2"],
      },
    ]);
  });

  test("Can remove a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    expect(model.getters.getDataValidationRules(sheetId)).not.toEqual([]);

    removeDataValidation(model, "id");
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([]);
  });

  test("Can undo/redo adding a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    addDataValidation(model, "A1:C2", "id", { type: "isBetween", values: ["1", "5"] });

    undo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
    undo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([]);

    redo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
    redo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "isBetween", values: ["1", "5"] },
        ranges: ["A1:C2"],
      },
    ]);
  });

  test("Can undo/redo removing a rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    removeDataValidation(model, "id");

    undo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);

    redo(model);
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([]);
  });

  test("Can import/export data validation rules", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    const exported = model.exportData();

    expect(exported.sheets[0].dataValidation).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);

    const newModel = new Model(exported);
    expect(newModel.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: "id",
        criterion: { type: "textContains", values: ["1"] },
        ranges: ["A1"],
      },
    ]);
  });
});
