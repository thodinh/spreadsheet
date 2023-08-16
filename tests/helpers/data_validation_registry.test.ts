import { Model } from "../../src";
import { jsDateToRoundNumber } from "../../src/helpers";
import { dataValidationEvaluatorRegistry } from "../../src/registries/data_validation_registry";
import { DataValidationCriterion } from "../../src/types";
import { FR_LOCALE } from "./../test_helpers/constants";

describe("Data validation registry", () => {
  const model = new Model();
  const evaluatorArgs = {
    cellValue: "test",
    offset: { col: 0, row: 0 },
    sheetId: model.getters.getActiveSheetId(),
    getters: model.getters,
  };
  const locale = model.getters.getLocale();

  describe("Text contains", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textContains");
    const criterion: DataValidationCriterion = { type: "textContains", values: ["test"] };

    test("Valid values", () => {
      expect(evaluator.isValueValid("test", criterion, evaluatorArgs)).toEqual(true);
      expect(evaluator.isValueValid("abc test", criterion, evaluatorArgs)).toEqual(true);
      expect(evaluator.isValueValid("TEST", criterion, evaluatorArgs)).toEqual(true);
      expect(evaluator.isValueValid("test1", criterion, evaluatorArgs)).toEqual(true);

      expect(evaluator.isValueValid("abc", criterion, evaluatorArgs)).toEqual(false);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        'The value must be a text that contains: "test"'
      );
    });

    test("Valid criterion values", () => {
      expect(evaluator.isCriterionValueValid("test", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("", locale)).toEqual(false);

      expect(evaluator.getCriterionValueErrorString("test").toString()).toEqual(
        "The value must not be empty"
      );
    });
  });

  describe("Text not contains", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textNotContains");
    const criterion: DataValidationCriterion = { type: "textNotContains", values: ["test"] };

    test("Valid values", () => {
      expect(evaluator.isValueValid("abc", criterion, evaluatorArgs)).toEqual(true);

      expect(evaluator.isValueValid("abc test", criterion, evaluatorArgs)).toEqual(false);
      expect(evaluator.isValueValid("TEST", criterion, evaluatorArgs)).toEqual(false);
      expect(evaluator.isValueValid("test1", criterion, evaluatorArgs)).toEqual(false);
      expect(evaluator.isValueValid("test", criterion, evaluatorArgs)).toEqual(false);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        'The value must be a text that does not contain: "test"'
      );
    });

    test("Valid criterion values", () => {
      expect(evaluator.isCriterionValueValid("test", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("", locale)).toEqual(false);

      expect(evaluator.getCriterionValueErrorString("test").toString()).toEqual(
        "The value must not be empty"
      );
    });
  });

  describe("Number between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isBetween");
    const criterion: DataValidationCriterion = { type: "isBetween", values: ["5", "10"] };

    test("Valid values", () => {
      expect(evaluator.isValueValid(5, criterion, evaluatorArgs)).toEqual(true);
      expect(evaluator.isValueValid(7, criterion, evaluatorArgs)).toEqual(true);
      expect(evaluator.isValueValid(10, criterion, evaluatorArgs)).toEqual(true);

      expect(evaluator.isValueValid(4, criterion, evaluatorArgs)).toEqual(false);
      expect(evaluator.isValueValid(11, criterion, evaluatorArgs)).toEqual(false);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be between 5 and 10"
      );
    });

    test("Valid criterion values", () => {
      expect(evaluator.isCriterionValueValid("5", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("", locale)).toEqual(false);
      expect(evaluator.isCriterionValueValid("hello", locale)).toEqual(false);

      expect(evaluator.getCriterionValueErrorString("5").toString()).toEqual(
        "The value must be a number"
      );
    });
  });

  describe("Date is", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIs");
    const criterion: DataValidationCriterion = {
      type: "dateIs",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test("Valid values", () => {
      let dateNumber = jsDateToRoundNumber(new Date("01/01/2021"));
      expect(evaluator.isValueValid(dateNumber, criterion, evaluatorArgs)).toEqual(true);

      dateNumber = jsDateToRoundNumber(new Date("01/01/2022"));
      expect(evaluator.isValueValid(dateNumber, criterion, evaluatorArgs)).toEqual(false);

      dateNumber = jsDateToRoundNumber(new Date("01/02/2021"));
      expect(evaluator.isValueValid(dateNumber, criterion, evaluatorArgs)).toEqual(false);

      dateNumber = jsDateToRoundNumber(new Date("02/01/2021"));
      expect(evaluator.isValueValid(dateNumber, criterion, evaluatorArgs)).toEqual(false);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date equal to 1/1/2021"
      );
    });

    describe("Different date values", () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("01/01/2021"));

      test("date is today", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "today" };
        let dateNumber = jsDateToRoundNumber(new Date("01/01/2021"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);
        dateNumber = jsDateToRoundNumber(new Date("01/02/2021"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });

      test("date is tomorrow", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "tomorrow" };
        let dateNumber = jsDateToRoundNumber(new Date("01/02/2021"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);
        dateNumber = jsDateToRoundNumber(new Date("01/01/2021"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });

      test("date is yesterday", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "yesterday" };
        let dateNumber = jsDateToRoundNumber(new Date("12/31/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);
        dateNumber = jsDateToRoundNumber(new Date("01/01/2021"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });

      test("In the past week", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "lastWeek" };
        let dateNumber = jsDateToRoundNumber(new Date("12/25/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("12/26/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("12/20/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });

      test("In the past month", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "lastMonth" };
        let dateNumber = jsDateToRoundNumber(new Date("12/01/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("12/31/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("11/30/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });

      test("In the past year", () => {
        const dateCriterion: DataValidationCriterion = { ...criterion, dateValue: "lastYear" };
        let dateNumber = jsDateToRoundNumber(new Date("01/01/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("12/31/2020"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(true);

        dateNumber = jsDateToRoundNumber(new Date("12/31/2019"));
        expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(false);
      });
    });

    test("Valid criterion values", () => {
      expect(evaluator.isCriterionValueValid("01/01/2021", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("5", locale)).toEqual(true);

      expect(evaluator.isCriterionValueValid("", locale)).toEqual(false);
      expect(evaluator.isCriterionValueValid("hello", locale)).toEqual(false);

      expect(evaluator.getCriterionValueErrorString("01/01/2021").toString()).toEqual(
        "The value must be a date"
      );
    });

    test("Localized date value", () => {
      expect(evaluator.isCriterionValueValid("12/01/2021", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("13/01/2021", locale)).toEqual(false);

      expect(evaluator.isCriterionValueValid("13/01/2021", FR_LOCALE)).toEqual(true);
    });
  });
});
