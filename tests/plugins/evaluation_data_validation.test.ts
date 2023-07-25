import { Model } from "../../src";
import { jsDateToRoundNumber } from "../../src/helpers";
import { CellPosition, UID } from "../../src/types";
import { addDataValidation, setCellContent } from "../test_helpers/commands_helpers";
import {
  DataValidationCriterion,
  DataValidationCriterionType,
} from "./../../src/types/data_validation";

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

  test("Text contains", () => {
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

  test("Is between", () => {
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "10"] });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual([
      "The value must be a number between 5 and 10",
    ]);

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

  test("Date is", () => {
    addDataValidation(model, "A1", "id", { type: "dateIs", values: ["1/1/2020"] });

    // Empty cell
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
    expect(getValidationErrorMessages(model, A1)).toEqual([
      "The value must be a date equal to 1/1/2020",
    ]);

    // Non-date value
    setCellContent(model, "A1", "test");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Matching date value
    setCellContent(model, "A1", "1/1/2020 12:00:00");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

    // Non-matching date value
    setCellContent(model, "A1", "1/2/2020");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

    // Date number in data validation rule
    const numberDate = jsDateToRoundNumber(new Date("1/1/2020"));
    addDataValidation(model, "A2", "id", { type: "dateIs", values: [numberDate.toString()] });
    setCellContent(model, "A1", "1/1/2020 12:00:00");
    expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);
    expect(getValidationErrorMessages(model, A1)).toEqual([
      "The value must be a date equal to 1/1/2020",
    ]);
  });

  test.each([{ type: "dateIs", values: ["1/1/2020"] }])(
    "Date validation rule accept both string date and number dates %s",
    ({ type, values }) => {
      // String date
      addDataValidation(model, "A1", "id", { type, values } as DataValidationCriterion);
      setCellContent(model, "A1", "1/1/2020 12:00:00");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

      setCellContent(model, "A1", "9/9/2009");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);

      // Number date
      const numberValues = values.map((val) => jsDateToRoundNumber(new Date(val)).toString());
      addDataValidation(model, "A1", "id", {
        type: type as DataValidationCriterionType,
        values: numberValues,
      });
      setCellContent(model, "A1", "1/1/2020 12:00:00");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(false);

      setCellContent(model, "A1", "9/9/2009");
      expect(model.getters.isDataValidationInvalid(A1)).toEqual(true);
      for (const value of values) {
        expect(getValidationErrorMessages(model, A1)[0]).toContain(value);
      }
    }
  );
});
