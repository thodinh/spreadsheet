import { Component, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { Model } from "../../src";
import { SpreadsheetChildEnv, UID } from "../../src/types";
import { setInputValueAndTrigger, simulateClick } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";
import { DataValidationPanel } from "./../../src/components/side_panel/data_validation/data_validation_panel";

interface ParentProps {
  onCloseSidePanel: () => void;
}
class Parent extends Component<ParentProps, SpreadsheetChildEnv> {
  static components = { DataValidationPanel };
  static template = xml/*xml*/ `
    <DataValidationPanel onCloseSidePanel="props.onCloseSidePanel"/>
  `;
  setup() {
    onMounted(() => this.env.model.on("update", this, () => this.render(true)));
    onWillUnmount(() => this.env.model.off("update", this));
  }
}

describe("data validation sidePanel component", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    ({ model } = await mountComponent(Parent, {
      props: { onCloseSidePanel: () => {} },
    }));
    sheetId = model.getters.getActiveSheetId();
  });

  test.each([
    ["textContains", { values: ["str"] }, 'Text contains "str"'],
    ["textNotContains", { values: ["str"] }, 'Text does not contain "str"'],
    ["isBetween", { values: ["5", "6"] }, "Value is between 5 and 6"],
    ["dateIs", { values: ["1/1/2020"], dateValue: "exactDate" }, "Date is 1/1/2020"],
  ])("Add a data validation rule %s", async (type, criterion, preview) => {
    await simulateClick(".o-dv-add");
    await nextTick();
    setInputValueAndTrigger(".o-dv-type", type, "change");
    await nextTick();

    setInputValueAndTrigger(".o-selection-input input", "A1:A5", "input");

    const valuesInputs = document.querySelectorAll(".o-dv-settings input");
    setInputValueAndTrigger(valuesInputs[0], criterion.values[0], "input");
    if (criterion.values.length > 1) {
      setInputValueAndTrigger(valuesInputs[1], criterion.values[1], "input");
    }

    await simulateClick(".o-dv-save");

    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: expect.any(String),
        criterion: { type, ...criterion },
        ranges: ["A1:A5"],
      },
    ]);

    expect(document.querySelector(".o-dv-preview-description")?.textContent).toEqual(preview);
    expect(document.querySelector(".o-dv-preview-ranges")?.textContent).toEqual("A1:A5");
  });

  test("Date criteria have a dateValue select input", async () => {
    await simulateClick(".o-dv-add");
    await nextTick();
    setInputValueAndTrigger(".o-selection-input input", "A1:A5", "input");
    setInputValueAndTrigger(".o-dv-type", "dateIs", "change");
    await nextTick();

    expect(document.querySelector(".o-dv-date-value")).toBeTruthy();
    setInputValueAndTrigger(".o-dv-date-value", "tomorrow", "change");

    await simulateClick(".o-dv-save");
    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: expect.any(String),
        criterion: { type: "dateIs", dateValue: "tomorrow", values: [""] },
        ranges: ["A1:A5"],
      },
    ]);
  });
});
