import { Model } from "../../src";
import { dataValidationEvaluatorRegistry } from "../../src/registries/data_validation_registry";
import { DataValidationDateCriterion, DateCriterionValue, DEFAULT_LOCALE } from "../../src/types";
import { FR_LOCALE } from "../test_helpers/constants";

describe("Data validation registry", () => {
  const model = new Model();
  const evaluatorArgs = {
    cellValue: "test",
    offset: { col: 0, row: 0 },
    sheetId: model.getters.getActiveSheetId(),
    getters: model.getters,
  };
  // const locale = model.getters.getLocale();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("01/01/2021 12:00:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("Date criteria", () => {
    test.each([
      // DATE IS
      ["dateIs", "exactDate", ["01/01/2021"], "01/01/2021", true],
      ["dateIs", "exactDate", ["01/01/2021"], "01/01/2021 18:00:00", true],
      ["dateIs", "exactDate", ["01/01/2021"], "01/01/2022", false],
      ["dateIs", "exactDate", ["01/01/2021"], "01/02/2021", false],
      ["dateIs", "exactDate", ["01/01/2021"], "02/01/2021", false],
      ["dateIs", "today", [], "01/01/2021", true],
      ["dateIs", "today", [], "01/01/2021 18:00:00", true],
      ["dateIs", "today", [], "01/02/2021", false],
      ["dateIs", "tomorrow", [], "01/01/2022", false],
      ["dateIs", "tomorrow", [], "01/02/2021", true],
      ["dateIs", "yesterday", [], "12/31/2020", true],
      ["dateIs", "yesterday", [], "01/01/2021", false],
      ["dateIs", "lastWeek", [], "12/25/2020", true],
      ["dateIs", "lastWeek", [], "12/26/2020", true],
      ["dateIs", "lastWeek", [], "12/20/2020", false],
      ["dateIs", "lastMonth", [], "12/01/2020", true],
      ["dateIs", "lastMonth", [], "12/31/2020", true],
      ["dateIs", "lastMonth", [], "11/30/2020", false],
      ["dateIs", "lastYear", [], "01/01/2020", true],
      ["dateIs", "lastYear", [], "12/31/2020", true],
      ["dateIs", "lastYear", [], "12/31/2019", false],

      // DATE IS BEFORE
      ["dateIsBefore", "exactDate", ["01/01/2021"], "01/01/2021", false],
      ["dateIsBefore", "exactDate", ["01/01/2021"], "12/31/2020", true],
      ["dateIsBefore", "exactDate", ["01/01/2021"], "12/31/2020 18:00:00", true],
      ["dateIsBefore", "exactDate", ["01/01/2021"], "01/01/2022", false],
      ["dateIsBefore", "today", [], "01/01/2021", false],
      ["dateIsBefore", "today", [], "12/31/2020", true],
      ["dateIsBefore", "tomorrow", [], "01/01/2021", true],
      ["dateIsBefore", "tomorrow", [], "01/02/2021", false],
      ["dateIsBefore", "yesterday", [], "12/30/2020", true],
      ["dateIsBefore", "yesterday", [], "12/31/2020", false],
      ["dateIsBefore", "lastWeek", [], "12/25/2020", false],
      ["dateIsBefore", "lastWeek", [], "12/26/2020", false],
      ["dateIsBefore", "lastWeek", [], "12/20/2020", true],
      ["dateIsBefore", "lastMonth", [], "12/01/2020", false],
      ["dateIsBefore", "lastMonth", [], "12/31/2020", false],
      ["dateIsBefore", "lastMonth", [], "11/30/2020", true],
      ["dateIsBefore", "lastYear", [], "01/01/2020", false],
      ["dateIsBefore", "lastYear", [], "12/31/2020", false],

      // DATE IS ON OR BEFORE
      ["dateIsOnOrBefore", "exactDate", ["01/01/2021"], "01/01/2021", true],
      ["dateIsOnOrBefore", "exactDate", ["01/01/2021"], "12/31/2020", true],
      ["dateIsOnOrBefore", "exactDate", ["01/01/2021"], "01/02/2021", false],
      ["dateIsOnOrBefore", "today", [], "01/01/2021", true],
      ["dateIsOnOrBefore", "today", [], "12/31/2020", true],
      ["dateIsOnOrBefore", "today", [], "01/02/2021", false],
      ["dateIsOnOrBefore", "tomorrow", [], "01/01/2021", true],
      ["dateIsOnOrBefore", "tomorrow", [], "01/02/2021", true],
      ["dateIsOnOrBefore", "tomorrow", [], "01/03/2021", false],
      ["dateIsOnOrBefore", "yesterday", [], "12/30/2020", true],
      ["dateIsOnOrBefore", "yesterday", [], "12/31/2020", true],
      ["dateIsOnOrBefore", "yesterday", [], "01/01/2021", false],
      ["dateIsOnOrBefore", "lastWeek", [], "12/25/2020", true],
      ["dateIsOnOrBefore", "lastWeek", [], "12/26/2020", false],
      ["dateIsOnOrBefore", "lastMonth", [], "12/01/2020", true],
      ["dateIsOnOrBefore", "lastMonth", [], "12/31/2020", false],
      ["dateIsOnOrBefore", "lastYear", [], "01/01/2020", true],
      ["dateIsOnOrBefore", "lastYear", [], "12/31/2020", false],

      // DATE IS AFTER
      ["dateIsAfter", "exactDate", ["01/01/2021"], "01/01/2021", false],
      ["dateIsAfter", "exactDate", ["01/01/2021"], "01/02/2021", true],
      ["dateIsAfter", "exactDate", ["01/01/2021"], "01/02/2021 18:00:00", true],
      ["dateIsAfter", "today", [], "01/01/2021", false],
      ["dateIsAfter", "today", [], "01/02/2021", true],
      ["dateIsAfter", "tomorrow", [], "01/02/2021", false],
      ["dateIsAfter", "tomorrow", [], "01/03/2021", true],
      ["dateIsAfter", "yesterday", [], "12/31/2020", false],
      ["dateIsAfter", "yesterday", [], "01/01/2021", true],
      ["dateIsAfter", "lastWeek", [], "12/25/2020", false],
      ["dateIsAfter", "lastWeek", [], "12/26/2020", true],
      ["dateIsAfter", "lastMonth", [], "12/01/2020", false],
      ["dateIsAfter", "lastMonth", [], "12/02/2020", true],
      ["dateIsAfter", "lastYear", [], "01/01/2020", false],
      ["dateIsAfter", "lastYear", [], "01/02/2020", true],

      // DATE IS ON OR AFTER
      ["dateIsOnOrAfter", "exactDate", ["01/01/2021"], "12/31/2020", false],
      ["dateIsOnOrAfter", "exactDate", ["01/01/2021"], "01/01/2021", true],
      ["dateIsOnOrAfter", "exactDate", ["01/01/2021"], "01/02/2021", true],
      ["dateIsOnOrAfter", "exactDate", ["01/01/2021"], "01/02/2021 18:00:00", true],
      ["dateIsOnOrAfter", "today", [], "12/31/2020", false],
      ["dateIsOnOrAfter", "today", [], "01/01/2021", true],
      ["dateIsOnOrAfter", "today", [], "01/02/2021", true],
      ["dateIsOnOrAfter", "tomorrow", [], "01/01/2021", false],
      ["dateIsOnOrAfter", "tomorrow", [], "01/02/2021", true],
      ["dateIsOnOrAfter", "tomorrow", [], "01/03/2021", true],
      ["dateIsOnOrAfter", "yesterday", [], "12/30/2020", false],
      ["dateIsOnOrAfter", "yesterday", [], "12/31/2020", true],
      ["dateIsOnOrAfter", "yesterday", [], "01/01/2021", true],
      ["dateIsOnOrAfter", "lastWeek", [], "12/24/2020", false],
      ["dateIsOnOrAfter", "lastWeek", [], "12/25/2020", true],
      ["dateIsOnOrAfter", "lastWeek", [], "12/26/2020", true],
      ["dateIsOnOrAfter", "lastMonth", [], "11/30/2020", false],
      ["dateIsOnOrAfter", "lastMonth", [], "12/01/2020", true],
      ["dateIsOnOrAfter", "lastMonth", [], "12/02/2020", true],
      ["dateIsOnOrAfter", "lastYear", [], "12/31/2019", false],
      ["dateIsOnOrAfter", "lastYear", [], "01/01/2020", true],
      ["dateIsOnOrAfter", "lastYear", [], "01/02/2020", true],
    ])(
      "Valid values %s %s %s %s",
      (criterionType, dateValue, values, testValue, expectedResult) => {
        const dateCriterion: DataValidationDateCriterion = {
          type: criterionType as DataValidationDateCriterion["type"],
          values,
          dateValue: dateValue as DateCriterionValue,
        };
        const evaluator = dataValidationEvaluatorRegistry.get(criterionType);
        expect(evaluator.isValueValid(testValue, dateCriterion, evaluatorArgs)).toEqual(
          expectedResult
        );
      }
    );

    test.each([
      // DATE IS
      ["dateIs", "exactDate", ["01/01/2021"], "The value must be the date 1/1/2021"],
      ["dateIs", "exactDate", ["2"], "The value must be the date 1/1/1900"],
      ["dateIs", "today", ["01/01/2021"], "The value must be today"],
      ["dateIs", "lastWeek", [], "The value must be in the past week"],

      // DATE IS BEFORE
      ["dateIsBefore", "exactDate", ["01/01/2021"], "The value must be a date before 1/1/2021"],
      ["dateIsBefore", "exactDate", ["2"], "The value must be a date before 1/1/1900"],
      ["dateIsBefore", "today", ["01/01/2021"], "The value must be a date before today"],
      ["dateIsBefore", "lastWeek", [], "The value must be a date before one week ago"],

      // DATE IS ON OR BEFORE
      ["dateIsOnOrBefore", "exactDate", ["2"], "The value must be a date on or before 1/1/1900"],
      ["dateIsOnOrBefore", "today", ["01/01/2021"], "The value must be a date on or before today"],
      ["dateIsOnOrBefore", "lastWeek", [], "The value must be a date on or before one week ago"],

      // DATE IS AFTER
      ["dateIsAfter", "exactDate", ["2"], "The value must be a date after 1/1/1900"],
      ["dateIsAfter", "today", ["01/01/2021"], "The value must be a date after today"],
      ["dateIsAfter", "lastWeek", [], "The value must be a date after one week from now"],

      // DATE IS ON OR AFTER
      ["dateIsOnOrAfter", "exactDate", ["2"], "The value must be a date on or after 1/1/1900"],
      ["dateIsOnOrAfter", "today", ["01/01/2021"], "The value must be a date on or after today"],
      ["dateIsOnOrAfter", "lastYear", [], "The value must be a date on or after one year from now"],
    ])("Error string %s % %s", (criterionType, dateValue, values, errorStr) => {
      const dateCriterion: DataValidationDateCriterion = {
        type: criterionType as DataValidationDateCriterion["type"],
        values,
        dateValue: dateValue as DateCriterionValue,
      };
      const evaluator = dataValidationEvaluatorRegistry.get(criterionType);
      expect(evaluator.getErrorString(dateCriterion, evaluatorArgs).toString()).toEqual(errorStr);
    });
  });

  test("Valid criterion values", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIs");
    const locale = DEFAULT_LOCALE;
    expect(evaluator.isCriterionValueValid("01/01/2021", locale)).toEqual(true);
    expect(evaluator.isCriterionValueValid("5", locale)).toEqual(true);

    expect(evaluator.isCriterionValueValid("", locale)).toEqual(false);
    expect(evaluator.isCriterionValueValid("hello", locale)).toEqual(false);

    expect(evaluator.getCriterionValueErrorString("01/01/2021").toString()).toEqual(
      "The value must be a date"
    );
  });

  test("Localized date value", () => {
    const evaluator = dataValidationEvaluatorRegistry.get("dateIs");
    const locale = DEFAULT_LOCALE;
    expect(evaluator.isCriterionValueValid("12/01/2021", locale)).toEqual(true);
    expect(evaluator.isCriterionValueValid("13/01/2021", locale)).toEqual(false);

    expect(evaluator.isCriterionValueValid("13/01/2021", FR_LOCALE)).toEqual(true);
  });
});
