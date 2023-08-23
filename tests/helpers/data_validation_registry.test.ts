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

    test.each([
      ["abc", false],
      ["abc test", true],
      ["TEST", true],
      ["test1", true],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        'The value must be a text that contains "test"'
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

    test.each([
      ["abc", true],
      ["abc test", false],
      ["TEST", false],
      ["test1", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        'The value must be a text that does not contain "test"'
      );
    });
  });

  describe("Text is", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIs");
    const criterion: DataValidationCriterion = { type: "textIs", values: ["hello"] };

    test.each([
      ["hello there", false],
      ["hell", false],
      ["hello", true],
      ["HELLO", true],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        'The value must be exactly "hello"'
      );
    });
  });

  describe("Text is email", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIsEmail");
    const criterion: DataValidationCriterion = { type: "textIsEmail", values: [] };

    test.each([
      ["hello", false],
      ["hello@gmail", false],
      ["hello@gmail.com", true],
      ["hello.there@gmail.com", true],
      ["hello there@gmail.com", false],
      ["hello@there@gmail.com", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a valid email address"
      );
    });
  });

  describe("Text is link", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("textIsLink");
    const criterion: DataValidationCriterion = { type: "textIsLink", values: [] };

    test.each([
      ["hello", false],
      ["hello.com", false],
      ["http://hello.com", true],
      ["http://www.hello.com", true],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a valid link"
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

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be the date 1/1/2012"],
      ["exactDate", ["2"], "The value must be the date 1/1/1900"],
      ["today", [], "The value must be today"],
      ["lastYear", [], "The value must be in the past year"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
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

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date before 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date before 1/1/1900"],
      ["today", [], "The value must be a date before today"],
      ["lastYear", [], "The value must be a date before one year ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
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

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date on or before 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date on or before 1/1/1900"],
      ["today", [], "The value must be a date on or before today"],
      ["lastMonth", [], "The value must be a date on or before one month ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
    });
  });

  describe("Date is after", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsAfter");
    const criterion: DataValidationCriterion = {
      type: "dateIsAfter",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "01/01/2021", false],
      ["exactDate", "01/02/2021", true],
      ["exactDate", "01/02/2021 18:00:00", true],
      ["today", "01/01/2021", false],
      ["today", "01/02/2021", true],
      ["tomorrow", "01/02/2021", false],
      ["tomorrow", "01/03/2021", true],
      ["yesterday", "12/31/2020", false],
      ["yesterday", "01/01/2021", true],
      ["lastWeek", "12/25/2020", false],
      ["lastWeek", "12/26/2020", true],
      ["lastMonth", "12/01/2020", false],
      ["lastMonth", "12/02/2020", true],
      ["lastYear", "01/01/2020", false],
      ["lastYear", "01/02/2020", true],
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

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date after 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date after 1/1/1900"],
      ["today", [], "The value must be a date after today"],
      ["lastWeek", [], "The value must be a date after one week ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
    });
  });

  describe("Date is on or after", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsOnOrAfter");
    const criterion: DataValidationCriterion = {
      type: "dateIsOnOrAfter",
      values: ["01/01/2021"],
      dateValue: "exactDate",
    };

    test.each([
      ["exactDate", "12/31/2020", false],
      ["exactDate", "01/01/2021", true],
      ["exactDate", "01/02/2021", true],
      ["exactDate", "01/02/2021 18:00:00", true],
      ["today", "12/31/2020", false],
      ["today", "01/01/2021", true],
      ["today", "01/02/2021", true],
      ["tomorrow", "01/01/2021", false],
      ["tomorrow", "01/02/2021", true],
      ["tomorrow", "01/03/2021", true],
      ["yesterday", "12/30/2020", false],
      ["yesterday", "12/31/2020", true],
      ["yesterday", "01/01/2021", true],
      ["lastWeek", "12/24/2020", false],
      ["lastWeek", "12/25/2020", true],
      ["lastWeek", "12/26/2020", true],
      ["lastMonth", "11/30/2020", false],
      ["lastMonth", "12/01/2020", true],
      ["lastMonth", "12/02/2020", true],
      ["lastYear", "12/31/2019", false],
      ["lastYear", "01/01/2020", true],
      ["lastYear", "01/02/2020", true],
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

    test.each([
      ["exactDate", ["1/1/2012"], "The value must be a date on or after 1/1/2012"],
      ["exactDate", ["2"], "The value must be a date on or after 1/1/1900"],
      ["today", [], "The value must be a date on or after today"],
      ["lastWeek", [], "The value must be a date on or after one week ago"],
    ])("Error string %s % %s", (dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        ...criterion,
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
    });
  });

  describe("Date is between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsBetween");
    const criterion: DataValidationCriterion = {
      type: "dateIsBetween",
      values: ["01/01/2021", "01/10/2021"],
    };

    test.each([
      ["12/31/2020", false],
      ["01/01/2021", true],
      ["01/10/2021", true],
      ["01/11/2021", false],
    ])("Valid values %s", (dateValue, expectedResult) => {
      const dateNumber = parseLiteral(dateValue, DEFAULT_LOCALE);
      expect(evaluator.isValueValid(dateNumber, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a date between 1/1/2021 and 1/10/2021"
      );
    });
  });

  describe("Date is valid", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIsValid");
    const criterion: DataValidationCriterion = {
      type: "dateIsValid",
      values: [],
    };

    test.each([
      ["12/31/2020", true],
      ["31/31/01/2021", false],
      [15, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be a valid date"
      );
    });
  });

  describe("Value is equal", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isEqual");
    const criterion: DataValidationCriterion = {
      type: "isEqual",
      values: ["5"],
    };

    test.each([
      [5, true],
      ["5", true],
      [12, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be equal to 5"
      );
    });
  });

  describe("Value is not equal", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isNotEqual");
    const criterion: DataValidationCriterion = {
      type: "isNotEqual",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["5", false],
      [12, true],
      ["12", true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must not be equal to 5"
      );
    });
  });

  describe("Value is greater than", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isGreaterThan");
    const criterion: DataValidationCriterion = {
      type: "isGreaterThan",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["6", true],
      [6, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be greater than 5"
      );
    });
  });

  describe("Value is greater or equal to", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isGreaterOrEqualTo");
    const criterion: DataValidationCriterion = {
      type: "isGreaterOrEqualTo",
      values: ["5"],
    };

    test.each([
      [5, true],
      ["6", true],
      [4, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be greater or equal to 5"
      );
    });
  });

  describe("Value is less than", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isLessThan");
    const criterion: DataValidationCriterion = {
      type: "isLessThan",
      values: ["5"],
    };

    test.each([
      [5, false],
      ["6", false],
      [4, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be less than 5"
      );
    });
  });

  describe("Value is between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isBetween");
    const criterion: DataValidationCriterion = {
      type: "isBetween",
      values: ["5", "8"],
    };

    test.each([
      [4, false],
      [5, true],
      ["6", true],
      ["8", true],
      [9, false],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must be between 5 and 8"
      );
    });
  });

  describe("Value is not between", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("isNotBetween");
    const criterion: DataValidationCriterion = {
      type: "isNotBetween",
      values: ["5", "8"],
    };

    test.each([
      [4, true],
      [5, false],
      ["6", false],
      ["8", false],
      [9, true],
      ["hello", false],
    ])("Valid values %s", (testValue, expectedResult) => {
      expect(evaluator.isValueValid(testValue, criterion, evaluatorArgs)).toEqual(expectedResult);
    });

    test("Error string", () => {
      expect(evaluator.getErrorString(criterion, evaluatorArgs).toString()).toEqual(
        "The value must not be between 5 and 8"
      );
    });
  });
});
