import { functionRegistry } from "../../src/functions/index";
import { Model } from "../../src/model";
import { LOADING } from "../../src/plugins/evaluation";
import { getCell, waitForRecompute } from "../helpers";

describe("core", () => {
  describe("aggregate", () => {
    test("properly compute sum of current cells", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A2", text: "3" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "54" });

      expect(model.getters.getAggregate()).toBe(null);

      model.dispatch("SELECT_CELL", { col: 0, row: 0 });

      expect(model.getters.getAggregate()).toBe(null);

      model.dispatch("ALTER_SELECTION", { cell: [0, 2] });
      expect(model.getters.getAggregate()).toBe("57");
    });

    test("ignore cells with an error", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "2" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "=A2" });
      model.dispatch("SET_VALUE", { xc: "A3", text: "3" });

      // select A1
      model.dispatch("SELECT_CELL", { col: 0, row: 0 });
      expect(model.getters.getAggregate()).toBe(null);

      // select A1:A2
      model.dispatch("ALTER_SELECTION", { cell: [0, 1] });
      expect(model.getters.getAggregate()).toBe(null);

      // select A1:A3
      model.dispatch("ALTER_SELECTION", { cell: [0, 2] });
      expect(model.getters.getAggregate()).toBe("5");
    });

    describe("raise error from compilation with specific error message", () => {
      functionRegistry.add("TWOARGSNEEDED", {
        description: "any function",
        compute: () => {
          return true;
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        returns: ["ANY"],
      });

      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "=TWOARGSNEEDED(42)" });
      expect(getCell(model, "A1")!.value).toBe("#BAD_EXPR");
      expect(getCell(model, "A1")!.error).toBe(
        `Invalid number of arguments for the TWOARGSNEEDED function. Expected 2, but got 1 instead.`
      );
    });

    test("ignore async cells while they are not ready", async () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "=Wait(1000)" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "44" });

      // select A1
      model.dispatch("SELECT_CELL", { col: 0, row: 0 });
      expect(model.getters.getAggregate()).toBe(null);

      // select A1:A2
      model.dispatch("ALTER_SELECTION", { cell: [0, 1] });
      expect(model.getters.getAggregate()).toBe(null);

      await waitForRecompute();
      expect(model.getters.getAggregate()).toBe("1044");
    });

    test("format cell that point to an empty cell properly", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "=A2" });
      expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("0");
    });

    test.each([
      [undefined, ""],
      [{ hello: 1 }, "[object Object]"],
      [{ hello: 1, toString: () => "hello" }, "hello"],
      [null, "0"],
    ])("getCellText of cell with %j value", (a, expected) => {
      const model = new Model();
      expect(
        model.getters.getCellText({
          value: a,
          col: 0,
          row: 0,
          type: "text",
          xc: "A1",
        })
      ).toBe(expected);
    });

    test("format cell without content: empty string", () => {
      const model = new Model();
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTING", {
        sheet: model.getters.getActiveSheet(),
        target: model.getters.getSelectedZones(),
        border: "bottom",
      });
      expect(model.getters.getCellText(getCell(model, "B2")!)).toBe("");
    });

    test("format cell with the zero value", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "0" });
      model.dispatch("SELECT_CELL", { col: 0, row: 0 });
      model.dispatch("SET_FORMATTER", {
        sheet: model.getters.getActiveSheet(),
        target: model.getters.getSelectedZones(),
        formatter: "0.00000",
      });
      expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("0.00000");
      model.dispatch("SET_VALUE", { xc: "A2", text: "0" });
      model.dispatch("SELECT_CELL", { col: 0, row: 1 });
      model.dispatch("SET_FORMATTER", {
        sheet: model.getters.getActiveSheet(),
        target: model.getters.getSelectedZones(),
        formatter: "0.00%",
      });
      expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("0.00%");
    });

    test("format a pendingcell: should not apply formatter to Loading...", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "B2", text: "=Wait(1000)" });
      model.dispatch("SELECT_CELL", { col: 1, row: 1 });
      model.dispatch("SET_FORMATTER", {
        sheet: model.getters.getActiveSheet(),
        target: model.getters.getSelectedZones(),
        formatter: "#,##0.00",
      });
      expect(model.getters.getCellText(getCell(model, "B2")!)).toBe(LOADING);
    });

    test("evaluate properly a cell with a style just recently applied", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "=sum(A2) + 1" });
      model.dispatch("SET_FORMATTING", {
        sheet: "Sheet1",
        target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
        style: { bold: true },
      });
      expect(model.getters.getCellText(model.getters.getCell(0, 0)!)).toEqual("1");
    });

    test("format cell to a boolean value", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "=false" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "=true" });

      expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("FALSE");
      expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("TRUE");
    });

    test("detect and format percentage values automatically", () => {
      const model = new Model();
      model.dispatch("SET_VALUE", { xc: "A1", text: "3%" });
      model.dispatch("SET_VALUE", { xc: "A2", text: "3.4%" });

      expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3%");
      expect(getCell(model, "A1")!.format).toBe("0%");
      expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("3.40%");
      expect(getCell(model, "A2")!.format).toBe("0.00%");
    });
  });

  test("does not reevaluate cells if edition does not change content", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=rand()" });

    expect(getCell(model, "A1")!.value).toBeDefined();
    const val = getCell(model, "A1")!.value;

    model.dispatch("START_EDITION");
    model.dispatch("STOP_EDITION");
    expect(getCell(model, "A1")!.value).toBe(val);
  });

  test("getCell getter does not crash if invalid col/row", () => {
    const model = new Model();
    expect(model.getters.getCell(-1, -1)).toBe(null);
  });

  test("single cell XC conversion", () => {
    const model = new Model({});
    expect(model.getters.zoneToXC(/*A1*/ { top: 0, left: 0, right: 0, bottom: 0 })).toBe("A1");
  });

  test("multi cell zone XC conversion", () => {
    const model = new Model({});
    expect(model.getters.zoneToXC(/*A1:B2*/ { top: 0, left: 0, right: 1, bottom: 1 })).toBe(
      "A1:B2"
    );
  });

  test("xc is expanded to overlapping merges", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2"] }],
    });
    expect(model.getters.zoneToXC(/*A2:B3*/ { top: 1, bottom: 2, left: 0, right: 1 })).toBe(
      "A1:B3"
    );
  });

  test("zone is across two merges", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2", "A4:B5"] }],
    });
    expect(model.getters.zoneToXC(/*A2:B4*/ { top: 1, bottom: 3, left: 0, right: 1 })).toBe(
      "A1:B5"
    );
  });

  test("merge is considered as one single cell", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2"] }],
    });
    expect(model.getters.zoneToXC(/*A2:B2*/ { top: 1, bottom: 1, left: 0, right: 1 })).toBe("A1");
  });

  test("can get row/col of inactive sheet", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42" });
    const [, sheet2] = model.getters.getSheets();
    model.dispatch("RESIZE_ROWS", { sheet: sheet2.id, rows: [0], size: 24 });
    model.dispatch("RESIZE_COLUMNS", { sheet: sheet2.id, cols: [0], size: 42 });
    expect(sheet2.id).not.toBe(model.getters.getActiveSheet());
    expect(model.getters.getRow(sheet2.id, 0)).toEqual({
      cells: {},
      end: 24,
      name: "1",
      size: 24,
      start: 0,
    });
    expect(model.getters.getCol(sheet2.id, 0)).toEqual({ end: 42, name: "A", size: 42, start: 0 });
  });

  test("can get row/col number of inactive sheet", () => {
    const model = new Model({
      sheets: [
        { colNumber: 10, rowNumber: 10, id: "1" },
        { colNumber: 19, rowNumber: 29, id: "2" },
      ],
    });
    expect(model.getters.getActiveSheet()).not.toBe("2");
    expect(model.getters.getNumberRows("2")).toEqual(29);
    expect(model.getters.getNumberCols("2")).toEqual(19);
  });

  test("Range with absolute references are correctly updated on rows manipulation", () => {
    const model = new Model();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
      content: "=SUM($C$1:$C$5)",
    });
    model.dispatch("ADD_ROWS", {
      position: "after",
      row: 2,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 0)!.content).toBe("=SUM($C$1:$C$6)");
    model.dispatch("ADD_ROWS", {
      position: "before",
      row: 0,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 1)!.content).toBe("=SUM($C$2:$C$7)");
  });

  test("Absolute references are correctly updated on rows manipulation", () => {
    const model = new Model();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
      content: "=SUM($C$1)",
    });
    model.dispatch("ADD_ROWS", {
      position: "after",
      row: 2,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 0)!.content).toBe("=SUM($C$1)");
    model.dispatch("ADD_ROWS", {
      position: "before",
      row: 0,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 1)!.content).toBe("=SUM($C$2)");
  });

  test("Range with absolute references are correctly updated on columns manipulation", () => {
    const model = new Model();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
      content: "=SUM($A$2:$E$2)",
    });
    model.dispatch("ADD_COLUMNS", {
      position: "after",
      column: 2,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 0)!.content).toBe("=SUM($A$2:$F$2)");
    model.dispatch("ADD_COLUMNS", {
      position: "before",
      column: 0,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(1, 0)!.content).toBe("=SUM($B$2:$G$2)");
  });

  test("Absolute references are correctly updated on columns manipulation", () => {
    const model = new Model();
    model.dispatch("UPDATE_CELL", {
      col: 0,
      row: 0,
      sheet: model.getters.getActiveSheet(),
      content: "=SUM($A$2)",
    });
    model.dispatch("ADD_COLUMNS", {
      position: "after",
      column: 2,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(0, 0)!.content).toBe("=SUM($A$2)");
    model.dispatch("ADD_COLUMNS", {
      position: "before",
      column: 0,
      quantity: 1,
      sheet: model.getters.getActiveSheet(),
    });
    expect(model.getters.getCell(1, 0)!.content).toBe("=SUM($B$2)");
  });
});

describe("history", () => {
  test("can undo and redo a add cell operation", () => {
    const model = new Model();

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(false);

    model.dispatch("START_EDITION", { text: "abc" });
    model.dispatch("STOP_EDITION");

    expect(getCell(model, "A1")!.content).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);

    model.dispatch("UNDO");
    expect(getCell(model, "A1")).toBeNull();
    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    model.dispatch("REDO");
    expect(getCell(model, "A1")!.content).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("can undo and redo a cell update", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: { content: "1" } } }],
    });

    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(false);

    model.dispatch("START_EDITION", { text: "abc" });
    model.dispatch("STOP_EDITION");

    expect(getCell(model, "A1")!.content).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);

    model.dispatch("UNDO");
    expect(getCell(model, "A1")!.content).toBe("1");
    expect(model.getters.canUndo()).toBe(false);
    expect(model.getters.canRedo()).toBe(true);

    model.dispatch("REDO");
    expect(getCell(model, "A1")!.content).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
    expect(model.getters.canRedo()).toBe(false);
  });

  test("can undo and redo a delete cell operation", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A2", text: "3" });

    expect(getCell(model, "A2")!.content).toBe("3");
    model.dispatch("SELECT_CELL", { col: 0, row: 1 });
    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A2")).toBeNull();

    model.dispatch("UNDO");
    expect(getCell(model, "A2")!.content).toBe("3");

    model.dispatch("REDO");
    expect(getCell(model, "A2")).toBeNull();
  });

  test("can delete a cell with a style", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
      style: { bold: true },
    });

    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3");

    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("");
  });

  test("can delete a cell with a border", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SET_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
      border: "bottom",
    });

    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3");

    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("");
  });

  test("can delete a cell with a formatter", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SET_FORMATTER", {
      sheet: model.getters.getActiveSheet(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
      formatter: "#,##0.00",
    });

    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3.00");

    model.dispatch("DELETE_CONTENT", {
      sheet: model.getters.getActiveSheet(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("");
  });

  test("setting a date to a cell will reformat it", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "03/2/2011" });
    model.dispatch("SET_VALUE", { xc: "A2", text: " 03/12/2011" });
    expect(getCell(model, "A1")!.content).toBe("03/02/2011");
    expect(getCell(model, "A2")!.content).toBe("03/12/2011");
  });

  test("get cell formula text", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=SUM(1, 2)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "This is Patrick" });
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("=SUM(1, 2)");
    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("This is Patrick");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    expect(model.getters.getCellText(getCell(model, "A1")!)).toBe("3");
    expect(model.getters.getCellText(getCell(model, "A2")!)).toBe("This is Patrick");
  });

  test("set formula visibility is idempotent", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(model.getters.shouldShowFormulas()).toBe(true);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(model.getters.shouldShowFormulas()).toBe(true);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    expect(model.getters.shouldShowFormulas()).toBe(false);
  });

  describe("getters", () => {
    test("getRangeFormattedValues", () => {
      const sheet1Id = "42";
      const sheet2Id = "43";
      const model = new Model({
        sheets: [
          {
            id: sheet1Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "1000", format: "#,##0" },
              A3: { content: "2000", format: "#,##0" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
          {
            id: sheet2Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "21000", format: "#,##0" },
              A3: { content: "12-31-2020", format: "mm/dd/yyyy" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
        ],
      });
      model.dispatch("ACTIVATE_SHEET", { from: sheet1Id, to: sheet2Id }); // evaluate Sheet2
      expect(model.getters.getRangeFormattedValues("A1:A3", sheet1Id)).toEqual([
        ["1,000", "", "2,000"],
      ]);
      expect(model.getters.getRangeFormattedValues("$A$1:$A$3", sheet1Id)).toEqual([
        ["1,000", "", "2,000"],
      ]);
      expect(model.getters.getRangeFormattedValues("Sheet1!A1:A3", sheet1Id)).toEqual([
        ["1,000", "", "2,000"],
      ]);
      expect(model.getters.getRangeFormattedValues("Sheet2!A1:A3", sheet2Id)).toEqual([
        ["21,000", "", "12/31/2020"],
      ]);
      expect(model.getters.getRangeFormattedValues("Sheet2!A1:A3", sheet1Id)).toEqual([
        ["21,000", "", "12/31/2020"],
      ]);
      expect(model.getters.getRangeFormattedValues("B2", sheet1Id)).toEqual([["TRUE"]]);
      expect(model.getters.getRangeFormattedValues("Sheet1!B2", sheet1Id)).toEqual([["TRUE"]]);
      expect(model.getters.getRangeFormattedValues("Sheet2!B2", sheet2Id)).toEqual([["TRUE"]]);
      expect(model.getters.getRangeFormattedValues("Sheet2!B2", sheet1Id)).toEqual([["TRUE"]]);
    });

    test("getRangeValues", () => {
      const sheet1Id = "42";
      const sheet2Id = "43";
      const model = new Model({
        sheets: [
          {
            id: sheet1Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "1000", format: "#,##0" },
              A3: { content: "2000", format: "#,##0" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
          {
            id: sheet2Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "21000", format: "#,##0" },
              A3: { content: "12-31-2020", format: "mm/dd/yyyy" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
        ],
      });
      const date = {
        format: "m-d-yyyy",
        value: 44196,
        jsDate: new Date("12-31-2020"),
      };
      expect(model.getters.getRangeValues("A1:A3", sheet1Id)).toEqual([[1000, undefined, 2000]]);
      expect(model.getters.getRangeValues("$A$1:$A$3", sheet1Id)).toEqual([
        [1000, undefined, 2000],
      ]);
      expect(model.getters.getRangeValues("Sheet1!A1:A3", sheet1Id)).toEqual([
        [1000, undefined, 2000],
      ]);
      expect(model.getters.getRangeValues("Sheet2!A1:A3", sheet2Id)).toEqual([
        [21000, undefined, date],
      ]);
      expect(model.getters.getRangeValues("Sheet2!A1:A3", sheet1Id)).toEqual([
        [21000, undefined, date],
      ]);
      expect(model.getters.getRangeValues("B2", sheet1Id)).toEqual([[true]]);
      expect(model.getters.getRangeValues("Sheet1!B2", sheet1Id)).toEqual([[true]]);
      expect(model.getters.getRangeValues("Sheet2!B2", sheet2Id)).toEqual([[true]]);
      expect(model.getters.getRangeValues("Sheet2!B2", sheet1Id)).toEqual([[true]]);
    });
  });
});