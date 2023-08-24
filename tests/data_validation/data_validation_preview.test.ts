import { Model } from "../../src";
import { dataValidationPanelCriteriaRegistry } from "../../src/components/helpers/dv_panel_helper";
import { DataValidationPreview } from "../../src/components/side_panel/data_validation/dv_preview/dv_preview";
import { DataValidationRuleData, DEFAULT_LOCALE } from "../../src/types";
import { DataValidationCriterion } from "../../src/types/data_validation";
import { click } from "../test_helpers/dom_helper";
import { makeTestEnv, mountComponent, spyModelDispatch } from "../test_helpers/helpers";

const testDataValidationRule: DataValidationRuleData = {
  ranges: ["A1"],
  criterion: { type: "textContains", values: ["foo"] },
};

describe("Data validation preview", () => {
  let fixture: HTMLElement;
  let model: Model;

  async function mountDataValidationPreview(
    dvRuleData: DataValidationRuleData,
    onClick = () => {}
  ) {
    model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    const dvRule = {
      ...dvRuleData,
      id: "1",
      ranges: dvRuleData.ranges.map((range) => model.getters.getRangeFromSheetXC(sheetId, range)),
    };
    ({ fixture, model } = await mountComponent(DataValidationPreview, {
      props: { dvRule, onClick },
    }));
  }

  test("Single range is displayed", async () => {
    const rule = { ...testDataValidationRule, ranges: ["A1"] };
    await mountDataValidationPreview(rule);

    const displayedRange = fixture.querySelector(".o-dv-preview-ranges") as HTMLElement;
    expect(displayedRange.textContent).toBe("A1");
  });

  test("Multiple ranges are displayed", async () => {
    const rule = { ...testDataValidationRule, ranges: ["A1", "A2"] };
    await mountDataValidationPreview(rule);

    const displayedRange = fixture.querySelector(".o-dv-preview-ranges") as HTMLElement;
    expect(displayedRange.textContent).toBe("A1, A2");
  });

  test("onClick callback is triggered", async () => {
    const onClick = jest.fn();
    await mountDataValidationPreview(testDataValidationRule, onClick);
    click(fixture, ".o-dv-preview");
    expect(onClick).toHaveBeenCalled();
  });

  test("Can delete rule from preview", async () => {
    await mountDataValidationPreview(testDataValidationRule);
    const spyDispatch = spyModelDispatch(model);
    const sheetId = model.getters.getActiveSheetId();
    click(fixture, ".o-dv-preview-delete");
    expect(spyDispatch).toHaveBeenCalledWith("REMOVE_DATA_VALIDATION_RULE", {
      id: "1",
      sheetId,
    });
  });

  describe("Rule previews", () => {
    function getCriterionPreview(criterion: DataValidationCriterion, env = makeTestEnv()) {
      return dataValidationPanelCriteriaRegistry
        .get(criterion.type)
        .getPreview(criterion, env)
        .toString();
    }

    test("textContains", () => {
      const description = getCriterionPreview({ type: "textContains", values: ["foo"] });
      expect(description).toBe('Text contains "foo"');
    });

    test("textNotContains", () => {
      const description = getCriterionPreview({ type: "textNotContains", values: ["foo"] });
      expect(description).toBe('Text does not contain "foo"');
    });

    test("isBetween", () => {
      const description = getCriterionPreview({ type: "isBetween", values: ["1", "2"] });
      expect(description).toBe("Value is between 1 and 2");
    });

    test("dateIs with exact date", () => {
      const description = getCriterionPreview({
        type: "dateIs",
        values: ["1/1/2001"],
        dateValue: "exactDate",
      });
      expect(description).toBe("Date is 1/1/2001");
    });

    test("dateIs with relative dates", () => {
      const criterion: DataValidationCriterion = {
        type: "dateIs",
        values: [],
        dateValue: "tomorrow",
      };

      let description = getCriterionPreview({ ...criterion, dateValue: "tomorrow" });
      expect(description).toBe("Date is tomorrow");

      description = getCriterionPreview({ ...criterion, dateValue: "yesterday" });
      expect(description).toBe("Date is yesterday");

      description = getCriterionPreview({ ...criterion, dateValue: "today" });
      expect(description).toBe("Date is today");

      description = getCriterionPreview({ ...criterion, dateValue: "lastWeek" });
      expect(description).toBe("Date is in the past week");

      description = getCriterionPreview({ ...criterion, dateValue: "lastMonth" });
      expect(description).toBe("Date is in the past month");

      description = getCriterionPreview({ ...criterion, dateValue: "lastYear" });
      expect(description).toBe("Date is in the past year");
    });

    describe("Date generic tests", () => {
      test("Exact date string", () => {
        const description = getCriterionPreview({
          type: "dateIs",
          values: ["1/1/2001"],
          dateValue: "exactDate",
        });
        expect(description).toBe("Date is 1/1/2001");
      });

      test("Number in exactDate value is formatted as a date", () => {
        const description = getCriterionPreview({
          type: "dateIs",
          values: ["0"],
          dateValue: "exactDate",
        });
        expect(description).toBe("Date is 12/30/1899");
      });

      test("Date is formatted based on locale", () => {
        const env = makeTestEnv();
        env.model.dispatch("UPDATE_LOCALE", {
          locale: { ...DEFAULT_LOCALE, dateFormat: "yyyy-mm-dd" },
        });

        const description = getCriterionPreview(
          { type: "dateIs", values: ["0"], dateValue: "exactDate" },
          env
        );
        expect(description).toBe("Date is 1899-12-30");
      });
    });
  });
});
