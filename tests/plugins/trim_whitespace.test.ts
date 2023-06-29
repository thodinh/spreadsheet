import { Model } from "../../src";
import { getCellContent } from "../test_helpers";
import { selectCell, setCellContent, setSelection } from "../test_helpers/commands_helpers";
import { createModelFromGrid, getRangeValuesAsMatrix } from "../test_helpers/helpers";

describe("trim whitespace", () => {
  test("trim cell content", () => {
    const model = new Model();
    setCellContent(model, "A2", "   Alo         ");
    selectCell(model, "A2");
    model.dispatch("TRIM_WHITESPACE");
    expect(getCellContent(model, "A2")).toBe("Alo");
  });

  test("remove duplicate spaces", () => {
    const model = new Model();
    setCellContent(model, "A2", "  Alo        salut     sunt  eu    un haiduc  ");
    selectCell(model, "A2");
    model.dispatch("TRIM_WHITESPACE");
    expect(getCellContent(model, "A2")).toBe("Alo salut sunt eu un haiduc");
  });

  test("keep lines break", () => {
    const model = new Model();
    setCellContent(model, "A2", "  Alo        salut   \n   sunt  eu  \n  un haiduc  ");
    selectCell(model, "A2");
    model.dispatch("TRIM_WHITESPACE");
    expect(getCellContent(model, "A2")).toBe("Alo salut\nsunt eu\nun haiduc");
  });

  test("apply it on all selected cells", () => {
    const model = createModelFromGrid({ A2: " a ", A3: " b ", A4: " c " });
    setSelection(model, ["A2:A3", "A3:A4"]);
    model.dispatch("TRIM_WHITESPACE");
    expect(getRangeValuesAsMatrix(model, "A2:A4")).toEqual([["a"], ["b"], ["c"]]);
  });
});

describe("notify user", () => {
  test("notify when cells are trimmed", async () => {
    const model = createModelFromGrid({
      A1: " A B     B    A  ",
      A2: "  SPACES   INVADERS   !  ",
      A3: "NO SPACES INVADERS",
    });
    let notifyUserTextSpy = jest.fn();
    jest.spyOn(model.config, "notifyUI").mockImplementation(notifyUserTextSpy);
    setSelection(model, ["A1:A2", "A2:A3"]);
    model.dispatch("TRIM_WHITESPACE");
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "Trimmed whitespace from 2 cells.",
      type: "info",
      sticky: false,
    });
  });

  test("notify when no cells trimmed", async () => {
    const model = createModelFromGrid({
      A1: "Space Jam",
      A2: "Space invaders",
      A3: "Space mountain",
    });
    let notifyUserTextSpy = jest.fn();
    jest.spyOn(model.config, "notifyUI").mockImplementation(notifyUserTextSpy);
    setSelection(model, ["A1:A2", "A2:A3"]);
    model.dispatch("TRIM_WHITESPACE");
    expect(notifyUserTextSpy).toHaveBeenCalledWith({
      text: "No selected cells had whitespace trimmed.",
      type: "info",
      sticky: false,
    });
  });
});
