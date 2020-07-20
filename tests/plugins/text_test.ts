import "../canvas.mock";
//import { getCell } from "../helpers";
import { uuidv4 } from "../../src/helpers";
import { Zone } from "../../src/types";
import { Model } from "../../src";

let model: Model;

describe("Text figure plugin", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("can create a text figure", () => {
    model.dispatch("INSERT_TEXT", {
      id: uuidv4(),
      text: "test",
      position: {
        top: 1,
        left: 1,
        right: 2,
        bottom: 2,
      },
    });

    const visibleZone: Zone = {
      top: 1,
      left: 1,
      bottom: 10,
      right: 10,
    };
    const visibleFigures = model.getters.getFiguresInside(
      model["workbook"].activeSheet.id,
      visibleZone
    );
    expect(visibleFigures).toHaveLength(1);
    expect(visibleFigures[0].id).toBeDefined();
    expect(visibleFigures[0]).toMatchObject({
      text: "test",
      position: { top: 1, left: 1, right: 2, bottom: 2 },
    });
  });
});
