import { Model } from "../../src";
import { parseLiteral } from "../../src/helpers/cells";
import { dataValidationEvaluatorRegistry } from "../../src/registries/data_validation_registry";
import {
  DataValidationCriterion,
  DataValidationDateCriterion,
  DateCriterionValue,
  DEFAULT_LOCALE,
} from "../../src/types";
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

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("01/01/2021 12:00:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

    test.each([
      ["exactDate", "01/01/2021", true],
      ["exactDate", "01/01/2021 18:00:00", true],
      ["exactDate", "01/01/2022", false],
      ["exactDate", "01/02/2021", false],
      ["exactDate", "02/01/2021", false],
      ["today", "01/01/2021", true],
      ["today", "01/01/2021 18:00:00", true],
      ["today", "01/02/2021", false],
      ["tomorrow", "01/01/2022", false],
      ["tomorrow", "01/02/2021", true],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", true],
      ["lastWeek", "12/20/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/31/2020", true],
      ["lastMonth", "11/30/2020", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "12/31/2020", true],
      ["lastYear", "12/31/2019", false],
    ])("Valid values %s %", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be the date 1/1/2021"
      );

      let dateCriterion: DataValidationCriterion = { ...criterion, values: ["2"] };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be the date 1/1/1900"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "today" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be today"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "lastWeek" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be in the past week"
      );
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

  describe("Date is before", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsBefore");
    const criterion: DataValidationCriterion = {
      type: "dateIsBefore",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", false],
      ["exactDate", "12/31/2020", true],
      ["exactDate", "12/31/2020 18:00:00", true],
      ["exactDate", "01/01/2022", false],
      ["today", "01/01/2021", false],
      ["today", "12/31/2020", true],
      ["tomorrow", "01/01/2021", true],
      ["tomorrow", "01/02/2021", false],
      ["yesterday", "12/30/2020", true],
      ["yesterday", "12/31/2020", false],
      ["lastWeek", "12/25/2020", false],
      ["lastWeek", "12/26/2020", false],
      ["lastWeek", "12/20/2020", true],
      ["lastMonth", "12/01/2020", false],
      ["lastMonth", "12/31/2020", false],
      ["lastMonth", "11/30/2020", true],
      ["lastYear", "01/01/2020", false],
      ["lastYear", "12/31/2020", false],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date before 1/1/2021"
      );

      let dateCriterion: DataValidationCriterion = { ...criterion, values: ["2"] };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date before 1/1/1900"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "today" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date before today"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "lastWeek" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date before one week ago"
      );
    });

    test("Localized date value", () => {
      expect(evaluator.isCriterionValueValid("12/01/2021", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("13/01/2021", locale)).toEqual(false);

      expect(evaluator.isCriterionValueValid("13/01/2021", FR_LOCALE)).toEqual(true);
    });
  });

  describe("Date is on or before", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsOnOrBefore");
    const criterion: DataValidationCriterion = {
      type: "dateIsOnOrBefore",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", true],
      ["exactDate", "12/31/2020", true],
      ["exactDate", "01/02/2021", false],
      ["today", "01/01/2021", true],
      ["today", "12/31/2020", true],
      ["today", "01/02/2021", false],
      ["tomorrow", "01/01/2021", true],
      ["tomorrow", "01/02/2021", true],
      ["tomorrow", "01/03/2021", false],
      ["yesterday", "12/30/2020", true],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/31/2020", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "12/31/2020", false],
    ])("Valid values %s %s", (dateValue: any, testValue, expectedResult) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        dateValue: dateValue as DateCriterionValue,
      };
      const dateNumber = parseLiteral(testValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, dateCriterion, evaluatorArgs)).toEqual(
        expectedResult
      );
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date on or before 1/1/2021"
      );

      let dateCriterion: DataValidationCriterion = { ...criterion, values: ["2"] };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date on or before 1/1/1900"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "today" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date on or before today"
      );

      dateCriterion = { ...criterion, values: [], dateValue: "lastWeek" };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date on or before one week ago"
      );
    });

    test("Localized date value", () => {
      expect(evaluator.isCriterionValueValid("12/01/2021", locale)).toEqual(true);
      expect(evaluator.isCriterionValueValid("13/01/2021", locale)).toEqual(false);

      expect(evaluator.isCriterionValueValid("13/01/2021", FR_LOCALE)).toEqual(true);
    });
  });
});
