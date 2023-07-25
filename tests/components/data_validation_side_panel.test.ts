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
    { type: "textContains", values: ["str"], preview: 'Text contains "str"' },
    { type: "textNotContains", values: ["str"], preview: 'Text does not contain "str"' },
    { type: "isBetween", values: ["5", "6"], preview: "Value is between 5 and 6" },
    { type: "dateIs", values: ["1/1/2020"], preview: "Date is 1/1/2020" },
  ])("Add a data validation rule %s", async ({ type, values, preview }) => {
    await simulateClick(".btn.btn-link");
    await nextTick();
    setInputValueAndTrigger(".o-dv-type", type, "change");
    await nextTick();

    setInputValueAndTrigger(".o-selection-input input", "A1:A5", "input");

    const valuesInputs = document.querySelectorAll(".o-dv-settings input");
    setInputValueAndTrigger(valuesInputs[0], values[0], "input");
    if (values.length > 1) {
      setInputValueAndTrigger(valuesInputs[1], values[1], "input");
    }

    await simulateClick(".o-dv-save");

    expect(model.getters.getDataValidationRules(sheetId)).toEqual([
      {
        id: expect.any(String),
        criterion: { type, values },
        ranges: ["A1:A5"],
      },
    ]);

    expect(document.querySelector(".o-dv-preview-description")?.textContent).toEqual(preview);
    expect(document.querySelector(".o-dv-preview-ranges")?.textContent).toEqual("A1:A5");
  });
});
