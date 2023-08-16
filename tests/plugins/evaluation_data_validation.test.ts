import { Model } from "../../src";
import { jsDateToRoundNumber } from "../../src/helpers";
import { CellPosition, UID } from "../../src/types";
import { addDataValidation, setCellContent } from "../test_helpers/commands_helpers";
import { DataValidationCriterion } from "./../../src/types/data_validation";

function getValidationErrorMessages(model: Model, position: CellPosition) {
  return model.getters.getInvalidDataValidationMessages(position).map((val) => val.toString());
}

describe("Data validation evaluation", () => {
  let model: Model;
  let sheetId: UID;
  let A1: CellPosition;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    A1 = { sheetId, col: 0, row: 0 };
  });

  test("Text data validation rule", () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["test"] });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual([
      'The value must be a text that contains: "test"',
    ]);

    // Arbitrary text
    setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Matching text
    setCellContent(model, "A1", "random text test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("Text does not contain", () => {
    addDataValidation(model, "A1", "id", { type: "textNotContains", values: ["test"] });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    // Matching text
    setCellContent(model, "A1", "random text test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual([
      'The value must be a text that does not contain: "test"',
    ]);

    // Arbitrary text
    setCellContent(model, "A1", "random text");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
  });

  test("Number data validation rule", () => {
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "10"] });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual(["The value must be between 5 and 10"]);

    // Non-number value
    setCellContent(model, "A1", "test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Value too small
    setCellContent(model, "A1", "4");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Matching number value
    setCellContent(model, "A1", "5");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    // Value too big
    setCellContent(model, "A1", "11");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
  });

  test("Date data validation rule", () => {
    addDataValidation(model, "A1", "id", {
      type: "dateIs",
      values: ["1/1/2020"],
      dateValue: "exactDate",
    });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual(["The value must be the date 1/1/2020"]);

    // Non-date value
    setCellContent(model, "A1", "test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Matching date value
    setCellContent(model, "A1", "1/1/2020 12:00:00");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    // Non-matching date value
    setCellContent(model, "A1", "1/2/2020");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
  });

  test("Date validation rule accept both string date and number dates %s", () => {
    // String date
    addDataValidation(model, "A1", "id", {
      type: "dateIs",
      values: ["1/1/2020"],
      dateValue: "exactDate",
    } as DataValidationCriterion);
    setCellContent(model, "A1", "1/1/2020 12:00:00");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    setCellContent(model, "A1", "9/9/2009");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Number date
    const numberValue = jsDateToRoundNumber(new Date("1/1/2020")).toString();
    addDataValidation(model, "A1", "id", {
      type: "dateIs",
      values: [numberValue],
      dateValue: "exactDate",
    });
    setCellContent(model, "A1", "1/1/2020 12:00:00");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    setCellContent(model, "A1", "9/9/2009");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
  });

  describe("Formula values", () => {
    test("Can use formula values", () => {
      addDataValidation(model, "A1", "id", {
        type: "textContains",
        values: ['=CONCAT("te", "st")'],
      });

      setCellContent(model, "A1", "random text");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      setCellContent(model, "A1", "random test");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("Can use references in formula values", () => {
      addDataValidation(model, "A1", "id", {
        type: "isBetween",
        values: ["=B1", "=B2"],
      });
      setCellContent(model, "B1", "5");
      setCellContent(model, "B2", "10");

      setCellContent(model, "A1", "4");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      setCellContent(model, "A1", "5");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    });

    test("References in formula are translated based on the cell offset in the validation rule", () => {
      addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=C1"],
        dateValue: "exactDate",
      });
      setCellContent(model, "C1", "1/1/2020");
      setCellContent(model, "D2", "1/2/2020");

      setCellContent(model, "A1", "1/1/2020");
      setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });

    test("References in formula are not shifted with fixed references", () => {
      addDataValidation(model, "A1:B2", "id", {
        type: "dateIs",
        values: ["=$C$1"],
        dateValue: "exactDate",
      });
      setCellContent(model, "C1", "1/1/2020");
      setCellContent(model, "D2", "1/2/2020");

      setCellContent(model, "A1", "1/1/2020");
      setCellContent(model, "B2", "1/2/2020");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(true);

      setCellContent(model, "B2", "1/1/2020");
      expect(model.getters.isDataValidationInvalid({ sheetId, col: 1, row: 1 })).toEqual(false);
    });
  });
});
