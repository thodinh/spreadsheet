import { ClipboardCellsState } from "../../helpers/clipboard/clipboard_cells_state";
import { ClipboardFigureState } from "../../helpers/clipboard/clipboard_figure_state";
import { ClipboardOsState } from "../../helpers/clipboard/clipboard_os_state";
import { isZoneValid, positions } from "../../helpers/index";
import { clipboardHandlersRegistries } from "../../registries/clipboard_handlers";
import {
  ClipboardContent,
  ClipboardData,
  ClipboardHandlersImplementation,
  ClipboardMIMEType,
  ClipboardOperation,
  ClipboardOptions,
  ClipboardState,
} from "../../types/clipboard";
import {
  Command,
  CommandResult,
  Dimension,
  GridRenderingContext,
  LAYERS,
  LocalCommand,
  UID,
  Zone,
  isCoreCommand,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface InsertDeleteCellsTargets {
  cut: Zone[];
  paste: Zone[];
}

/**
 * Clipboard Plugin
 *
 * This clipboard manages all cut/copy/paste interactions internal to the
 * application, and with the OS clipboard as well.
 */
export class ClipboardPlugin extends UIPlugin {
  static layers = [LAYERS.Clipboard];
  static getters = [
    "getClipboardContent",
    "getClipboardTextContent",
    "isCutOperation",
    "isPaintingFormat",
  ] as const;

  private status: "visible" | "invisible" = "invisible";
  private state?: ClipboardState;
  private paintFormatStatus: "inactive" | "oneOff" | "persistent" = "inactive";
  private originSheetId?: UID;
  private copiedData?: any;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "CUT":
        const zones = cmd.cutTarget || this.getters.getSelectedZones();
        return this.isCutAllowedOnAnyPlugin(zones);
      case "PASTE":
        if (!this.state) {
          return CommandResult.EmptyClipboard;
        }
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        return this.isPasteAllowedOnAnyPlugin(cmd.target, this.copiedData, { pasteOption });
      case "PASTE_FROM_OS_CLIPBOARD": {
        const state = new ClipboardOsState(cmd.text, this.getters, this.dispatch, this.selection);
        return state.isPasteAllowed(cmd.target, { pasteOption: cmd.pasteOption });
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.callCopyOnAllPlugins("CUT", cut);
        return this.isPasteAllowedOnAnyPlugin(paste, copiedData, {});
      }
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        const copiedData = this.callCopyOnAllPlugins("CUT", cut);
        return this.isPasteAllowedOnAnyPlugin(paste, copiedData, {});
      }
      case "ACTIVATE_PAINT_FORMAT": {
        if (this.paintFormatStatus !== "inactive") {
          return CommandResult.AlreadyInPaintingFormatMode;
        }
      }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "COPY":
      case "CUT":
        const zones = ("cutTarget" in cmd && cmd.cutTarget) || this.getters.getSelectedZones();
        this.state = this.getClipboardState(zones, cmd.type);
        this.status = "visible";
        this.originSheetId = this.getters.getActiveSheetId();
        this.copiedData = this.callCopyOnAllPlugins(cmd.type, zones);
        break;
      case "PASTE":
        if (!this.state) {
          break;
        }
        const pasteOption =
          cmd.pasteOption || (this.paintFormatStatus !== "inactive" ? "onlyFormat" : undefined);
        this.callPasteOnAllPlugins(cmd.target, {
          pasteOption,
          shouldPasteCF: true,
          selectTarget: true,
        });
        if (this.paintFormatStatus === "oneOff") {
          this.paintFormatStatus = "inactive";
          this.status = "invisible";
        }
        break;
      case "CLEAN_CLIPBOARD_HIGHLIGHT":
        this.status = "invisible";
        break;
      case "DELETE_CELL": {
        const { cut, paste } = this.getDeleteCellsTargets(cmd.zone, cmd.shiftDimension);
        if (!isZoneValid(cut[0])) {
          for (const { col, row } of positions(cmd.zone)) {
            this.dispatch("CLEAR_CELL", { col, row, sheetId: this.getters.getActiveSheetId() });
          }
          break;
        }
        this.copiedData = this.callCopyOnAllPlugins("CUT", cut);
        this.callPasteOnAllPlugins(paste, { shouldPasteCF: false });
        break;
      }
      case "INSERT_CELL": {
        const { cut, paste } = this.getInsertCellsTargets(cmd.zone, cmd.shiftDimension);
        this.copiedData = this.callCopyOnAllPlugins("CUT", cut);
        this.callPasteOnAllPlugins(paste, { shouldPasteCF: false });
        break;
      }
      case "ADD_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we add a col/row inside or before the cut area, we invalidate the clipboard
        if (this.state?.operation !== "CUT") {
          return;
        }
        const isClipboardDirty = this.state.isColRowDirtyingClipboard(
          cmd.position === "before" ? cmd.base : cmd.base + 1,
          cmd.dimension
        );
        if (isClipboardDirty) {
          this.state = undefined;
        }
        break;
      }
      case "REMOVE_COLUMNS_ROWS": {
        this.status = "invisible";

        // If we remove a col/row inside or before the cut area, we invalidate the clipboard
        if (this.state?.operation !== "CUT") {
          return;
        }
        for (let el of cmd.elements) {
          const isClipboardDirty = this.state.isColRowDirtyingClipboard(el, cmd.dimension);
          if (isClipboardDirty) {
            this.state = undefined;
            break;
          }
        }
        this.status = "invisible";
        break;
      }
      case "PASTE_FROM_OS_CLIPBOARD":
        const state = new ClipboardOsState(cmd.text, this.getters, this.dispatch, this.selection);
        state.paste(cmd.target, { pasteOption: cmd.pasteOption });
        this.state = state;
        this.status = "invisible";
        break;
      case "REPEAT_PASTE": {
        this.callPasteOnAllPlugins(cmd.target, {
          pasteOption: cmd.pasteOption,
          shouldPasteCF: true,
          selectTarget: true,
        });
        break;
      }
      case "ACTIVATE_PAINT_FORMAT": {
        const zones = this.getters.getSelectedZones();
        this.copiedData = this.callCopyOnAllPlugins("COPY", zones);
        this.state = this.getClipboardStateForCopyCells(zones, "COPY");
        this.status = "visible";
        if (cmd.persistent) {
          this.paintFormatStatus = "persistent";
        } else {
          this.paintFormatStatus = "oneOff";
        }
        break;
      }
      case "DELETE_SHEET":
        if (this.state?.operation !== "CUT") {
          return;
        }
        if (this.originSheetId === cmd.sheetId) {
          this.state = undefined;
          this.status = "invisible";
        }
        break;
      case "CANCEL_PAINT_FORMAT": {
        this.paintFormatStatus = "inactive";
        this.status = "invisible";
        break;
      }
      default:
        if (isCoreCommand(cmd)) {
          this.status = "invisible";
        }
    }
  }

  private selectClipboardHandlers(data: {}): ClipboardHandlersImplementation[] {
    if ("figureId" in data) {
      return clipboardHandlersRegistries.figureHandlers.getAll();
    }
    return clipboardHandlersRegistries.cellHandlers.getAll();
  }

  private isCutAllowedOnAnyPlugin(zones: Zone[]) {
    const clipboardData = this.getClipboardData(zones);
    for (const clipboardHandlers of this.selectClipboardHandlers(clipboardData)) {
      const result = clipboardHandlers.isCutAllowed(clipboardData);
      if (result !== CommandResult.Success) {
        return result;
      }
    }
    return CommandResult.Success;
  }

  private isPasteAllowedOnAnyPlugin(
    target: Zone[],
    copiedData: {},
    options: ClipboardOptions | undefined
  ) {
    for (const clipboardHandlers of this.selectClipboardHandlers(copiedData)) {
      const result = clipboardHandlers.isPasteAllowed(target, copiedData, options);
      if (result !== CommandResult.Success) {
        return result;
      }
    }
    return CommandResult.Success;
  }

  private callCopyOnAllPlugins(operation: "COPY" | "CUT", zones: Zone[]): {} {
    let copiedData = {};
    const clipboardData = this.getClipboardData(zones);
    for (const clipboardHandlers of this.selectClipboardHandlers(clipboardData)) {
      if (!clipboardHandlers.shouldBeUsed(clipboardData)) {
        continue;
      }
      const data = clipboardHandlers.copy(
        this.getters,
        this.dispatch,
        operation === "CUT",
        clipboardData
      );
      copiedData = { ...copiedData, ...data };
    }
    return copiedData;
  }

  private callPasteOnAllPlugins(target: Zone[], options: ClipboardOptions | undefined) {
    for (const clipboardHandlers of this.selectClipboardHandlers(this.copiedData)) {
      clipboardHandlers.paste(target, this.copiedData, this.getters, this.dispatch, options);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Format the current clipboard to a string suitable for being pasted in other
   * programs.
   *
   * - add a tab character between each consecutive cells
   * - add a newline character between each line
   *
   * Note that it returns \t if the clipboard is empty. This is necessary for the
   * clipboard copy event to add it as data, otherwise an empty string is not
   * considered as a copy content.
   */
  getClipboardContent(): ClipboardContent {
    return this.state?.getClipboardContent() || { [ClipboardMIMEType.PlainText]: "\t" };
  }

  getClipboardTextContent(): string {
    return this.state?.getClipboardContent()[ClipboardMIMEType.PlainText] || "\t";
  }

  isCutOperation(): boolean {
    return this?.copiedData?.isCutOperation;
  }

  isPaintingFormat(): boolean {
    return this.paintFormatStatus !== "inactive";
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private getDeleteCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheetId = this.getters.getActiveSheetId();
    let cut: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        left: zone.right + 1,
        right: this.getters.getNumberCols(sheetId) - 1,
      };
    } else {
      cut = {
        ...zone,
        top: zone.bottom + 1,
        bottom: this.getters.getNumberRows(sheetId) - 1,
      };
    }
    return { cut: [cut], paste: [zone] };
  }

  private getInsertCellsTargets(zone: Zone, dimension: Dimension): InsertDeleteCellsTargets {
    const sheetId = this.getters.getActiveSheetId();
    let cut: Zone;
    let paste: Zone;
    if (dimension === "COL") {
      cut = {
        ...zone,
        right: this.getters.getNumberCols(sheetId) - 1,
      };
      paste = {
        ...zone,
        left: zone.right + 1,
        right: zone.right + 1,
      };
    } else {
      cut = {
        ...zone,
        bottom: this.getters.getNumberRows(sheetId) - 1,
      };
      paste = { ...zone, top: zone.bottom + 1, bottom: this.getters.getNumberRows(sheetId) - 1 };
    }
    return { cut: [cut], paste: [paste] };
  }

  private getClipboardStateForCopyCells(zones: Zone[], operation: ClipboardOperation) {
    return new ClipboardCellsState(zones, operation, this.getters);
  }

  /**
   * Get the clipboard state from the given zones.
   */
  private getClipboardState(zones: Zone[], operation: ClipboardOperation): ClipboardState {
    const selectedFigureId = this.getters.getSelectedFigureId();
    if (selectedFigureId) {
      return new ClipboardFigureState();
    }
    return new ClipboardCellsState(zones, operation, this.getters);
  }

  private getClipboardData(zones: Zone[]): ClipboardData {
    const selectedFigureId = this.getters.getSelectedFigureId();
    if (selectedFigureId) {
      return { figureId: selectedFigureId };
    }
    return { zones, selection: this.selection };
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    if (this.status !== "visible" || !this.state) {
      return;
    }
    this.state.drawClipboard(renderingContext);
  }
}
