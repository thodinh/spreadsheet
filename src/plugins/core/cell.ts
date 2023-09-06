import { compile, tokenize } from "../../formulas";
import { parseLiteral } from "../../helpers/cells";
import { CopiedTable } from "../../helpers/clipboard/clipboard_cells_state";
import {
  concat,
  createAdaptedZone,
  detectDateFormat,
  detectNumberFormat,
  formatValue,
  getItemId,
  isInside,
  mergeOverlappingZones,
  positions,
  range,
  replaceSpecialSpaces,
  toCartesian,
  toXC,
  union,
} from "../../helpers/index";
import { clipboardHandlersRegistries } from "../../registries/clipboard_handlers";
import { SelectionStreamProcessor } from "../../selection_stream/selection_stream_processor";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Cell,
  CellData,
  CellPosition,
  ClipboardCell,
  ClipboardData,
  ClipboardOptions,
  CommandDispatcher,
  CommandResult,
  CompiledFormula,
  CoreCommand,
  ExcelWorkbookData,
  Format,
  FormulaCell,
  Getters,
  HeaderIndex,
  LiteralCell,
  Range,
  RangePart,
  Style,
  UID,
  UpdateCellData,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin, CorePluginConfig } from "../core_plugin";

interface CoreState {
  cells: Record<UID, Record<UID, Cell | undefined>>;
  nextId: number;
}

/**
 * Core Plugin
 *
 * This is the most fundamental of all plugins. It defines how to interact with
 * cell and sheet content.
 */
export class CellPlugin extends CorePlugin<CoreState> implements CoreState {
  static getters = [
    "zoneToXC",
    "getCells",
    "getFormulaCellContent",
    "getTranslatedCellFormula",
    "getCellStyle",
    "getCellById",
  ] as const;
  readonly nextId = 1;
  public readonly cells: { [sheetId: string]: { [id: string]: Cell } } = {};
  private clipboardState: _ClipboardCellsState | undefined;

  constructor(config: CorePluginConfig) {
    super(config);
    clipboardHandlersRegistries.cellHandlers.add("CELL", {
      copy: (
        getters: Getters,
        dispatch: CommandDispatcher["dispatch"],
        isCutOperation: boolean,
        data: ClipboardData
      ) => {
        if (!("zones" in data)) {
          this.clipboardState = undefined;
          return;
        }
        this.clipboardState = new _ClipboardCellsState(getters, dispatch, data.selection);
        return {
          ...this.clipboardState.copy(data.zones),
          isCutOperation,
        };
      },
      paste: (
        target: Zone[],
        clippedContent: any,
        getters: Getters,
        dispatch: CommandDispatcher["dispatch"],
        options?: ClipboardOptions | undefined
      ) => {
        if (!this.clipboardState) {
          return;
        }
        this.clipboardState.paste(target, clippedContent, options);
      },
      isPasteAllowed: (target: Zone[], content: any, option?: ClipboardOptions) =>
        this.clipboardState?.isPasteAllowed(target, content, option) || CommandResult.Success,
      shouldBeUsed: (data: ClipboardData) => {
        return "zones" in data && data.zones.length > 0;
      },
      isCutAllowed: (data: ClipboardData) => {
        if ("zones" in data && data.zones.length !== 1) {
          return CommandResult.WrongCutSelection;
        }
        return CommandResult.Success;
      },
    });
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const sheet of Object.keys(this.cells)) {
      for (const cell of Object.values(this.cells[sheet] || {})) {
        if (cell.isFormula) {
          for (const range of cell.dependencies) {
            if (!sheetId || range.sheetId === sheetId) {
              const change = applyChange(range);
              if (change.changeType !== "NONE") {
                this.history.update(
                  "cells",
                  sheet,
                  cell.id,
                  "dependencies" as any,
                  cell.dependencies.indexOf(range),
                  change.range
                );
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand): CommandResult {
    switch (cmd.type) {
      case "UPDATE_CELL":
      case "CLEAR_CELL":
        return this.checkCellOutOfSheet(cmd.sheetId, cmd.col, cmd.row);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_FORMATTING":
        if ("style" in cmd) {
          this.setStyle(cmd.sheetId, cmd.target, cmd.style);
        }
        if ("format" in cmd && cmd.format !== undefined) {
          this.setFormatter(cmd.sheetId, cmd.target, cmd.format);
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearFormatting(cmd.sheetId, cmd.target);
        break;
      case "ADD_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.handleAddColumnsRows(cmd, this.copyColumnStyle.bind(this));
        } else {
          this.handleAddColumnsRows(cmd, this.copyRowStyle.bind(this));
        }
        break;
      case "UPDATE_CELL":
        this.updateCell(cmd.sheetId, cmd.col, cmd.row, cmd);
        break;

      case "CLEAR_CELL":
        this.dispatch("UPDATE_CELL", {
          sheetId: cmd.sheetId,
          col: cmd.col,
          row: cmd.row,
          content: "",
          style: null,
          format: "",
        });
        break;
    }
  }

  /**
   * Set a format to all the cells in a zone
   */
  private setFormatter(sheetId: UID, zones: Zone[], format: Format) {
    for (let zone of zones) {
      for (let row = zone.top; row <= zone.bottom; row++) {
        for (let col = zone.left; col <= zone.right; col++) {
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            format,
          });
        }
      }
    }
  }

  /**
   * Clear the styles and format of zones
   */
  private clearFormatting(sheetId: UID, zones: Zone[]) {
    for (let zone of zones) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          // commandHelpers.updateCell(sheetId, col, row, { style: undefined});
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: null,
            format: "",
          });
        }
      }
    }
  }

  /**
   * Copy the style of the reference column/row to the new columns/rows.
   */
  private handleAddColumnsRows(
    cmd: AddColumnsRowsCommand,
    fn: (sheetId: UID, styleRef: HeaderIndex, elements: HeaderIndex[]) => void
  ) {
    // The new elements have already been inserted in the sheet at this point.
    let insertedElements: HeaderIndex[];
    let styleReference: HeaderIndex;
    if (cmd.position === "before") {
      insertedElements = range(cmd.base, cmd.base + cmd.quantity);
      styleReference = cmd.base + cmd.quantity;
    } else {
      insertedElements = range(cmd.base + 1, cmd.base + cmd.quantity + 1);
      styleReference = cmd.base;
    }
    fn(cmd.sheetId, styleReference, insertedElements);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      // cells
      for (let xc in sheet.cells) {
        const cellData = sheet.cells[xc];
        const { col, row } = toCartesian(xc);
        if (cellData?.content || cellData?.format || cellData?.style) {
          const cell = this.importCell(sheet.id, cellData, data.styles, data.formats);
          this.history.update("cells", sheet.id, cell.id, cell);
          this.dispatch("UPDATE_CELL_POSITION", {
            cellId: cell.id,
            col,
            row,
            sheetId: sheet.id,
          });
        }
      }
    }
  }

  export(data: WorkbookData) {
    const styles: { [styleId: number]: Style } = {};
    const formats: { [formatId: number]: string } = {};

    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      const positions = Object.keys(this.cells[_sheet.id] || {})
        .map((cellId) => this.getters.getCellPosition(cellId))
        .sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
      for (const position of positions) {
        const cell = this.getters.getCell(position)!;
        const xc = toXC(position.col, position.row);

        cells[xc] = {
          style: cell.style ? getItemId<Style>(cell.style, styles) : undefined,
          format: cell.format ? getItemId<Format>(cell.format, formats) : undefined,
          content: cell.content || undefined,
        };
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
    data.formats = formats;
  }

  importCell(
    sheetId: UID,
    cellData: CellData,
    normalizedStyles: { [key: number]: Style },
    normalizedFormats: { [key: number]: Format }
  ): Cell {
    const style = (cellData.style && normalizedStyles[cellData.style]) || undefined;
    const format = (cellData.format && normalizedFormats[cellData.format]) || undefined;
    const cellId = this.getNextUid();
    return this.createCell(cellId, cellData?.content || "", format, style, sheetId);
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------
  getCells(sheetId: UID): Record<UID, Cell> {
    return this.cells[sheetId] || {};
  }

  /**
   * get a cell by ID. Used in evaluation when evaluating an async cell, we need to be able to find it back after
   * starting an async evaluation even if it has been moved or re-allocated
   */
  getCellById(cellId: UID): Cell | undefined {
    // this must be as fast as possible
    for (const sheetId in this.cells) {
      const sheet = this.cells[sheetId];
      const cell = sheet[cellId];
      if (cell) {
        return cell;
      }
    }
    return undefined;
  }

  /*
   * Reconstructs the original formula string based on a normalized form and its dependencies
   */
  getFormulaCellContent(
    sheetId: UID,
    cell: Pick<FormulaCell, "dependencies" | "compiledFormula">,
    dependencies?: Range[]
  ): string {
    const ranges = dependencies || [...cell.dependencies];
    return concat(
      cell.compiledFormula.tokens.map((token) => {
        if (token.type === "REFERENCE") {
          const range = ranges.shift()!;
          return this.getters.getRangeString(range, sheetId);
        }
        return token.value;
      })
    );
  }

  /*
   * Constructs a formula string based on an initial formula and a translation vector
   */
  getTranslatedCellFormula(
    sheetId: UID,
    offsetX: number,
    offsetY: number,
    compiledFormula: CompiledFormula,
    dependencies: Range[]
  ) {
    const adaptedDependencies = this.getters.createAdaptedRanges(
      dependencies,
      offsetX,
      offsetY,
      sheetId
    );
    return this.getFormulaCellContent(sheetId, {
      compiledFormula,
      dependencies: adaptedDependencies,
    });
  }

  getCellStyle(position: CellPosition): Style {
    return this.getters.getCell(position)?.style || {};
  }

  /**
   * Converts a zone to a XC coordinate system
   *
   * The conversion also treats merges as one single cell
   *
   * Examples:
   * {top:0,left:0,right:0,bottom:0} ==> A1
   * {top:0,left:0,right:1,bottom:1} ==> A1:B2
   *
   * if A1:B2 is a merge:
   * {top:0,left:0,right:1,bottom:1} ==> A1
   * {top:1,left:0,right:1,bottom:2} ==> A1:B3
   *
   * if A1:B2 and A4:B5 are merges:
   * {top:1,left:0,right:1,bottom:3} ==> A1:A5
   */
  zoneToXC(
    sheetId: UID,
    zone: Zone,
    fixedParts: RangePart[] = [{ colFixed: false, rowFixed: false }]
  ): string {
    zone = this.getters.expandZone(sheetId, zone);
    const topLeft = toXC(zone.left, zone.top, fixedParts[0]);
    const botRight = toXC(
      zone.right,
      zone.bottom,
      fixedParts.length > 1 ? fixedParts[1] : fixedParts[0]
    );
    const cellTopLeft = this.getters.getMainCellPosition({
      sheetId,
      col: zone.left,
      row: zone.top,
    });
    const cellBotRight = this.getters.getMainCellPosition({
      sheetId,
      col: zone.right,
      row: zone.bottom,
    });
    const sameCell = cellTopLeft.col === cellBotRight.col && cellTopLeft.row === cellBotRight.row;
    if (topLeft != botRight && !sameCell) {
      return topLeft + ":" + botRight;
    }

    return topLeft;
  }

  private setStyle(sheetId: UID, target: Zone[], style: Style | undefined) {
    for (let zone of target) {
      for (let col = zone.left; col <= zone.right; col++) {
        for (let row = zone.top; row <= zone.bottom; row++) {
          const cell = this.getters.getCell({ sheetId, col, row });
          this.dispatch("UPDATE_CELL", {
            sheetId,
            col,
            row,
            style: style ? { ...cell?.style, ...style } : undefined,
          });
        }
      }
    }
  }

  /**
   * Copy the style of one column to other columns.
   */
  private copyColumnStyle(sheetId: UID, refColumn: HeaderIndex, targetCols: HeaderIndex[]) {
    for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
      const format = this.getFormat(sheetId, refColumn, row);
      if (format.style || format.format) {
        for (let col of targetCols) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * Copy the style of one row to other rows.
   */
  private copyRowStyle(sheetId: UID, refRow: HeaderIndex, targetRows: HeaderIndex[]) {
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      const format = this.getFormat(sheetId, col, refRow);
      if (format.style || format.format) {
        for (let row of targetRows) {
          this.dispatch("UPDATE_CELL", { sheetId, col, row, ...format });
        }
      }
    }
  }

  /**
   * gets the currently used style/border of a cell based on it's coordinates
   */
  private getFormat(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex
  ): { style?: Style; format?: Format } {
    const format: { style?: Style; format?: string } = {};
    const position = this.getters.getMainCellPosition({ sheetId, col, row });
    const cell = this.getters.getCell(position);
    if (cell) {
      if (cell.style) {
        format["style"] = cell.style;
      }
      if (cell.format) {
        format["format"] = cell.format;
      }
    }
    return format;
  }

  private getNextUid() {
    const id = this.nextId.toString();
    this.history.update("nextId", this.nextId + 1);
    return id;
  }

  private updateCell(sheetId: UID, col: HeaderIndex, row: HeaderIndex, after: UpdateCellData) {
    const before = this.getters.getCell({ sheetId, col, row });
    const hasContent = "content" in after || "formula" in after;

    // Compute the new cell properties
    const afterContent = hasContent ? replaceSpecialSpaces(after?.content) : before?.content || "";
    let style: Style | undefined;
    if (after.style !== undefined) {
      style = after.style || undefined;
    } else {
      style = before ? before.style : undefined;
    }
    const locale = this.getters.getLocale();
    let format =
      ("format" in after ? after.format : before && before.format) ||
      detectDateFormat(afterContent, locale) ||
      detectNumberFormat(afterContent);

    /* Read the following IF as:
     * we need to remove the cell if it is completely empty, but we can know if it completely empty if:
     * - the command says the new content is empty and has no border/format/style
     * - the command has no content property, in this case
     *     - either there wasn't a cell at this place and the command says border/format/style is empty
     *     - or there was a cell at this place, but it's an empty cell and the command says border/format/style is empty
     *  */
    if (
      ((hasContent && !afterContent && !after.formula) ||
        (!hasContent && (!before || before.content === ""))) &&
      !style &&
      !format
    ) {
      if (before) {
        this.history.update("cells", sheetId, before.id, undefined);
        this.dispatch("UPDATE_CELL_POSITION", {
          cellId: undefined,
          col,
          row,
          sheetId,
        });
      }
      return;
    }

    const cellId = before?.id || this.getNextUid();
    const cell = this.createCell(cellId, afterContent, format, style, sheetId);
    this.history.update("cells", sheetId, cell.id, cell);
    this.dispatch("UPDATE_CELL_POSITION", { cellId: cell.id, col, row, sheetId });
  }

  private createCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): Cell {
    if (!content.startsWith("=")) {
      return this.createLiteralCell(id, content, format, style);
    }
    try {
      return this.createFormulaCell(id, content, format, style, sheetId);
    } catch (error) {
      return this.createErrorFormula(id, content, format, style, error);
    }
  }

  private createLiteralCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined
  ): LiteralCell {
    const locale = this.getters.getLocale();
    content = parseLiteral(content, locale).toString();
    return {
      id,
      content,
      style,
      format,
      isFormula: false,
    };
  }

  private createFormulaCell(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): FormulaCell {
    const compiledFormula = compile(content);
    if (compiledFormula.dependencies.length) {
      return this.createFormulaCellWithDependencies(id, compiledFormula, format, style, sheetId);
    }
    return {
      id,
      content,
      style,
      format,
      isFormula: true,
      compiledFormula,
      dependencies: [],
    };
  }

  /**
   * Create a new formula cell with the content
   * being a computed property to rebuild the dependencies XC.
   */
  private createFormulaCellWithDependencies(
    id: UID,
    compiledFormula: CompiledFormula,
    format: Format | undefined,
    style: Style | undefined,
    sheetId: UID
  ): FormulaCell {
    const dependencies = compiledFormula.dependencies.map((xc) =>
      this.getters.getRangeFromSheetXC(sheetId, xc)
    );
    return new FormulaCellWithDependencies(
      id,
      compiledFormula,
      format,
      style,
      dependencies,
      sheetId,
      this.getFormulaCellContent.bind(this)
    );
  }

  private createErrorFormula(
    id: UID,
    content: string,
    format: Format | undefined,
    style: Style | undefined,
    error: unknown
  ): FormulaCell {
    return {
      id,
      content,
      style,
      format,
      isFormula: true,
      compiledFormula: {
        dependencies: [],
        tokens: tokenize(content),
        execute: function () {
          throw error;
        },
      },
      dependencies: [],
    };
  }

  private checkCellOutOfSheet(sheetId: UID, col: HeaderIndex, row: HeaderIndex): CommandResult {
    const sheet = this.getters.tryGetSheet(sheetId);
    if (!sheet) return CommandResult.InvalidSheetId;
    const sheetZone = this.getters.getSheetZone(sheetId);
    return isInside(col, row, sheetZone) ? CommandResult.Success : CommandResult.TargetOutOfSheet;
  }
}

class FormulaCellWithDependencies {
  readonly isFormula = true;
  constructor(
    readonly id: UID,
    readonly compiledFormula: CompiledFormula,
    readonly format: Format | undefined,
    readonly style: Style | undefined,
    readonly dependencies: Range[],
    private readonly sheetId: UID,
    private readonly getFormulaCellContent: (
      sheetId: UID,
      cell: Pick<FormulaCell, "dependencies" | "compiledFormula">
    ) => string
  ) {}

  get content() {
    return this.getFormulaCellContent(this.sheetId, {
      dependencies: this.dependencies,
      compiledFormula: this.compiledFormula,
    });
  }
}

/** State of the clipboard when copying/cutting cells */
class _ClipboardCellsState {
  constructor(
    private getters: Getters,
    private dispatch: CommandDispatcher["dispatch"],
    private selection: SelectionStreamProcessor
  ) {}

  copy(zones: Zone[]): {} {
    if (!zones.length) {
      return {
        cells: [[]],
        zones: [],
        copiedTables: [],
      };
    }
    const lefts = new Set(zones.map((z) => z.left));
    const rights = new Set(zones.map((z) => z.right));
    const tops = new Set(zones.map((z) => z.top));
    const bottoms = new Set(zones.map((z) => z.bottom));

    const areZonesCompatible =
      (tops.size === 1 && bottoms.size === 1) || (lefts.size === 1 && rights.size === 1);

    // In order to don't paste several times the same cells in intersected zones
    // --> we merge zones that have common cells
    const clippedZones = areZonesCompatible
      ? mergeOverlappingZones(zones)
      : [zones[zones.length - 1]];

    const cellsPosition = clippedZones.map((zone) => positions(zone)).flat();
    const columnsIndex = [...new Set(cellsPosition.map((p) => p.col))].sort((a, b) => a - b);
    const rowsIndex = [...new Set(cellsPosition.map((p) => p.row))].sort((a, b) => a - b);

    const cellsInClipboard: ClipboardCell[][] = [];
    const sheetId = this.getters.getActiveSheetId();

    for (let row of rowsIndex) {
      let cellsInRow: ClipboardCell[] = [];
      for (let col of columnsIndex) {
        const position = { col, row, sheetId };
        cellsInRow.push({
          cell: this.getters.getCell(position),
          style: this.getters.getCellComputedStyle(position),
          evaluatedCell: this.getters.getEvaluatedCell(position),
          position,
        });
      }
      cellsInClipboard.push(cellsInRow);
    }

    const tables: CopiedTable[] = [];
    for (const zone of zones) {
      for (const table of this.getters.getFilterTablesInZone(sheetId, zone)) {
        const values: Array<string[]> = [];
        for (const col of range(table.zone.left, table.zone.right + 1)) {
          values.push(this.getters.getFilterValues({ sheetId, col, row: table.zone.top }));
        }
        tables.push({ filtersValues: values, zone: table.zone });
      }
    }
    return {
      cells: cellsInClipboard,
      zones: clippedZones,
      copiedTables: tables,
      sheetId: this.getters.getActiveSheetId(),
    };
  }

  /**
   * Add columns and/or rows to ensure that col + width and row + height are still
   * in the sheet
   */
  protected addMissingDimensions(width: number, height: number, col: number, row: number) {
    const sheetId = this.getters.getActiveSheetId();
    const missingRows = height + row - this.getters.getNumberRows(sheetId);
    if (missingRows > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: this.getters.getNumberRows(sheetId) - 1,
        sheetId,
        quantity: missingRows,
        position: "after",
      });
    }
    const missingCols = width + col - this.getters.getNumberCols(sheetId);
    if (missingCols > 0) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: this.getters.getNumberCols(sheetId) - 1,
        sheetId,
        quantity: missingCols,
        position: "after",
      });
    }
  }

  isPasteAllowed(target: Zone[], content: any, clipboardOption?: ClipboardOptions): CommandResult {
    const sheetId = this.getters.getActiveSheetId();
    if (content.isCutOperation && clipboardOption?.pasteOption !== undefined) {
      // cannot paste only format or only value if the previous operation is a CUT
      return CommandResult.WrongPasteOption;
    }
    if (target.length > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      if (content.cells.length > 1 || content.cells[0].length > 1) {
        return CommandResult.WrongPasteSelection;
      }
    }

    const clipboardHeight = content.cells.length;
    const clipboardWidth = content.cells[0].length;
    for (let zone of this.getPasteZones(target, content)) {
      if (this.getters.doesIntersectMerge(sheetId, zone)) {
        if (
          target.length > 1 ||
          !this.getters.isSingleCellOrMerge(sheetId, target[0]) ||
          clipboardHeight * clipboardWidth !== 1
        ) {
          return CommandResult.WillRemoveExistingMerge;
        }
      }
    }
    const { xSplit, ySplit } = this.getters.getPaneDivisions(sheetId);
    for (const zone of this.getPasteZones(target, content)) {
      if (
        (zone.left < xSplit && zone.right >= xSplit) ||
        (zone.top < ySplit && zone.bottom >= ySplit)
      ) {
        return CommandResult.FrozenPaneOverlap;
      }
    }
    return CommandResult.Success;
  }

  /**
   * Compute the complete zones where to paste the current clipboard
   */
  protected getPasteZones(target: Zone[], content: any): Zone[] {
    const cells = content.cells;
    if (!cells.length || !cells[0].length) {
      return target;
    }
    const pasteZones: Zone[] = [];
    const height = cells.length;
    const width = cells[0].length;
    const selection = target[target.length - 1];

    const col = selection.left;
    const row = selection.top;
    const repetitionCol = Math.max(1, Math.floor((selection.right + 1 - col) / width));
    const repetitionRow = Math.max(1, Math.floor((selection.bottom + 1 - row) / height));

    for (let x = 1; x <= repetitionCol; x++) {
      for (let y = 1; y <= repetitionRow; y++) {
        pasteZones.push({
          left: col,
          top: row,
          right: col - 1 + x * width,
          bottom: row - 1 + y * height,
        });
      }
    }
    return pasteZones;
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: Zone[], content: any, options?: ClipboardOptions | undefined) {
    if (!content.isCutOperation) {
      this.pasteFromCopy(target, content, options);
    } else {
      this.pasteFromCut(target, content, options);
    }
    const height = content.cells.length;
    const width = content.cells[0].length;
    if (options?.selectTarget) {
      this.selectPastedZone(width, height, content.isCutOperation, target);
    }
  }

  private pasteFromCopy(target: Zone[], content: any, options?: ClipboardOptions) {
    if (target.length === 1) {
      // in this specific case, due to the isPasteAllowed function:
      // state.cells can contains several cells.
      // So if the target zone is larger than the copied zone,
      // we duplicate each cells as many times as possible to fill the zone.
      const height = content.cells.length;
      const width = content.cells[0].length;
      const pasteZones = this.pastedZones(target, width, height);
      for (const zone of pasteZones) {
        this.pasteZone(zone.left, zone.top, content, options);
      }
    } else {
      // in this case, due to the isPasteAllowed function: state.cells contains
      // only one cell
      for (const zone of target) {
        for (let col = zone.left; col <= zone.right; col++) {
          for (let row = zone.top; row <= zone.bottom; row++) {
            this.pasteZone(col, row, content, options);
          }
        }
      }
    }
    if (options?.pasteOption === undefined) {
      this.pasteCopiedTables(target, content);
    }
  }

  private pasteFromCut(target: Zone[], content: any, options?: ClipboardOptions) {
    this.clearClippedZones(content);
    const selection = target[0];
    this.pasteZone(selection.left, selection.top, content, options);
    this.dispatch("MOVE_RANGES", {
      target: content.zones,
      sheetId: content.sheetId,
      targetSheetId: this.getters.getActiveSheetId(),
      col: selection.left,
      row: selection.top,
    });

    for (const filterTable of content.copiedTables) {
      this.dispatch("REMOVE_FILTER_TABLE", {
        sheetId: this.getters.getActiveSheetId(),
        target: [filterTable.zone],
      });
    }
    this.pasteCopiedTables(target, content);
    content.cells.forEach((row) => {
      row.forEach((c) => {
        if (c.cell) {
          c.cell = undefined;
        }
      });
    });
  }

  /**
   * The clipped zone is copied as many times as it fits in the target.
   * This returns the list of zones where the clipped zone is copy-pasted.
   */
  private pastedZones(target: Zone[], originWidth: number, originHeight: number): Zone[] {
    const selection = target[0];
    const repeatHorizontally = Math.max(
      1,
      Math.floor((selection.right + 1 - selection.left) / originWidth)
    );
    const repeatVertically = Math.max(
      1,
      Math.floor((selection.bottom + 1 - selection.top) / originHeight)
    );
    const zones: Zone[] = [];
    for (let x = 0; x < repeatHorizontally; x++) {
      for (let y = 0; y < repeatVertically; y++) {
        const top = selection.top + y * originHeight;
        const left = selection.left + x * originWidth;
        zones.push({
          left,
          top,
          bottom: top + originHeight - 1,
          right: left + originWidth - 1,
        });
      }
    }
    return zones;
  }

  /**
   * Update the selection with the newly pasted zone
   */
  private selectPastedZone(width: number, height: number, isCutOperation: boolean, target: Zone[]) {
    const selection = target[0];
    const col = selection.left;
    const row = selection.top;
    if (height > 1 || width > 1 || isCutOperation) {
      const zones = this.pastedZones(target, width, height);
      const newZone = isCutOperation ? zones[0] : union(...zones);
      this.selection.selectZone({ cell: { col, row }, zone: newZone }, { scrollIntoView: false });
    }
  }

  /**
   * Clear the clipped zones: remove the cells and clear the formatting
   */
  private clearClippedZones(content: any) {
    for (const row of content.cells) {
      for (const cell of row) {
        if (cell.cell) {
          this.dispatch("CLEAR_CELL", cell.position);
        }
      }
    }
    this.dispatch("CLEAR_FORMATTING", {
      sheetId: content.sheetId,
      target: content.zones,
    });
  }

  private pasteZone(
    col: HeaderIndex,
    row: HeaderIndex,
    content: any,
    clipboardOptions?: ClipboardOptions
  ) {
    const height = content.cells.length;
    const width = content.cells[0].length;
    const sheetId = this.getters.getActiveSheetId();
    // first, add missing cols/rows if needed
    this.addMissingDimensions(width, height, col, row);
    // then, perform the actual paste operation
    for (const [r, rowCells] of content.cells.entries()) {
      for (const [c, origin] of rowCells.entries()) {
        const position = { col: col + c, row: row + r, sheetId };
        // TODO: refactor this part. the "Paste merge" action is also executed with
        // MOVE_RANGES in pasteFromCut. Adding a condition on the operation type here
        // is not appropriate
        if (!content.isCutOperation) {
          this.pasteMergeIfExist(origin.position, position);
        }
        this.pasteCell(origin, position, content.isCutOperation, clipboardOptions);
      }
    }
  }

  /**
   * Paste the cell at the given position to the target position
   */
  private pasteCell(
    origin: ClipboardCell,
    target: CellPosition,
    isCutOperation: boolean,
    clipboardOption?: ClipboardOptions
  ) {
    const { sheetId, col, row } = target;
    const targetCell = this.getters.getEvaluatedCell(target);

    if (origin.cell) {
      if (clipboardOption?.pasteOption === "onlyFormat") {
        this.dispatch("UPDATE_CELL", {
          ...target,
          style: origin.cell.style,
          format: origin.evaluatedCell.format,
        });
        return;
      }

      if (clipboardOption?.pasteOption === "onlyValue") {
        const locale = this.getters.getLocale();
        const content = formatValue(origin.evaluatedCell.value, { locale });
        this.dispatch("UPDATE_CELL", { ...target, content });
        return;
      }
      let content = origin.cell.content;

      if (origin.cell.isFormula && !isCutOperation) {
        content = this.getters.getTranslatedCellFormula(
          sheetId,
          col - origin.position.col,
          row - origin.position.row,
          origin.cell.compiledFormula,
          origin.cell.dependencies
        );
      }
      this.dispatch("UPDATE_CELL", {
        ...target,
        content,
        style: origin.cell.style || null,
        format: origin.cell.format,
      });
    } else if (targetCell) {
      if (clipboardOption?.pasteOption === "onlyValue") {
        this.dispatch("UPDATE_CELL", { ...target, content: "" });
      } else if (clipboardOption?.pasteOption === "onlyFormat") {
        this.dispatch("UPDATE_CELL", { ...target, style: null, format: "" });
      } else {
        this.dispatch("CLEAR_CELL", target);
      }
    }
  }

  /**
   * If the origin position given is the top left of a merge, merge the target
   * position.
   */
  private pasteMergeIfExist(origin: CellPosition, target: CellPosition) {
    let { sheetId, col, row } = origin;

    const { col: mainCellColOrigin, row: mainCellRowOrigin } =
      this.getters.getMainCellPosition(origin);
    if (mainCellColOrigin === col && mainCellRowOrigin === row) {
      const merge = this.getters.getMerge(origin);
      if (!merge) {
        return;
      }
      ({ sheetId, col, row } = target);
      this.dispatch("ADD_MERGE", {
        sheetId,
        force: true,
        target: [
          {
            left: col,
            top: row,
            right: col + merge.right - merge.left,
            bottom: row + merge.bottom - merge.top,
          },
        ],
      });
    }
  }

  /** Paste the filter tables that are in the state */
  private pasteCopiedTables(target: Zone[], content) {
    const sheetId = this.getters.getActiveSheetId();
    const selection = target[0];
    const cutZone = content.zones[0];
    const cutOffset: [number, number] = [
      selection.left - cutZone.left,
      selection.top - cutZone.top,
    ];
    for (const table of content.copiedTables) {
      const newTableZone = createAdaptedZone(table.zone, "both", "MOVE", cutOffset);
      this.dispatch("CREATE_FILTER_TABLE", { sheetId, target: [newTableZone] });
      for (const i of range(0, table.filtersValues.length)) {
        this.dispatch("UPDATE_FILTER", {
          sheetId,
          col: newTableZone.left + i,
          row: newTableZone.top,
          hiddenValues: table.filtersValues[i],
        });
      }
    }
  }
}
