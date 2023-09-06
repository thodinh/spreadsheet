import {
  ClipboardFigureChart,
  ClipboardFigureImage,
} from "../../helpers/clipboard/clipboard_figure_state";
import { UuidGenerator, isDefined } from "../../helpers/index";
import { clipboardHandlersRegistries } from "../../registries/clipboard_handlers";
import {
  ClipboardData,
  ClipboardOptions,
  CommandDispatcher,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  Figure,
  Getters,
  UID,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";
import { DEFAULT_CELL_HEIGHT } from "./../../constants";

interface FigureState {
  readonly figures: { [sheet: string]: Record<UID, Figure | undefined> | undefined };
}

export class FigurePlugin extends CorePlugin<FigureState> implements FigureState {
  static getters = ["getFigures", "getFigure", "getFigureSheetId"] as const;
  readonly figures: {
    [sheet: string]: Record<UID, Figure | undefined> | undefined;
  } = {};
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_FIGURE":
        return this.checkFigureDuplicate(cmd.figure.id);
      case "UPDATE_FIGURE":
      case "DELETE_FIGURE":
        return this.checkFigureExists(cmd.sheetId, cmd.id);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_SHEET":
        this.figures[cmd.sheetId] = {};
        break;
      case "DELETE_SHEET":
        this.deleteSheet(cmd.sheetId);
        break;
      case "CREATE_FIGURE":
        this.addFigure(cmd.figure, cmd.sheetId);
        break;
      case "UPDATE_FIGURE":
        const { type, sheetId, ...update } = cmd;
        const figure: Partial<Figure> = update;
        this.updateFigure(sheetId, figure);
        break;
      case "DELETE_FIGURE":
        this.removeFigure(cmd.id, cmd.sheetId);
        break;
      case "REMOVE_COLUMNS_ROWS":
        this.onRowColDelete(cmd.sheetId, cmd.dimension);
    }
  }

  private onRowColDelete(sheetId: string, dimension: string) {
    dimension === "ROW" ? this.onRowDeletion(sheetId) : this.onColDeletion(sheetId);
  }

  private onRowDeletion(sheetId: string) {
    const numHeader = this.getters.getNumberRows(sheetId);
    let gridHeight = 0;
    for (let i = 0; i < numHeader; i++) {
      // TODO : since the row size is an UI value now, this doesn't work anymore. Using the default cell height is
      // a temporary solution at best, but is broken.
      gridHeight += this.getters.getUserRowSize(sheetId, i) || DEFAULT_CELL_HEIGHT;
    }
    const figures = this.getters.getFigures(sheetId);
    for (const figure of figures) {
      const newY = Math.min(figure.y, gridHeight - figure.height);
      if (newY !== figure.y) {
        this.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, y: newY });
      }
    }
  }

  private onColDeletion(sheetId: string) {
    const numHeader = this.getters.getNumberCols(sheetId);
    let gridWidth = 0;
    for (let i = 0; i < numHeader; i++) {
      gridWidth += this.getters.getColSize(sheetId, i);
    }
    const figures = this.getters.getFigures(sheetId);
    for (const figure of figures) {
      const newX = Math.min(figure.x, gridWidth - figure.width);
      if (newX !== figure.x) {
        this.dispatch("UPDATE_FIGURE", { sheetId, id: figure.id, x: newX });
      }
    }
  }

  private updateFigure(sheetId: string, figure: Partial<Figure>) {
    if (!("id" in figure)) {
      return;
    }
    for (const [key, value] of Object.entries(figure)) {
      switch (key) {
        case "x":
        case "y":
          if (value !== undefined) {
            this.history.update("figures", sheetId, figure.id!, key, Math.max(value as number, 0));
          }
          break;
        case "width":
        case "height":
          if (value !== undefined) {
            this.history.update("figures", sheetId, figure.id!, key, value as number);
          }
          break;
      }
    }
  }

  private addFigure(figure: Figure, sheetId: UID) {
    this.history.update("figures", sheetId, figure.id, figure);
  }

  private deleteSheet(sheetId: UID) {
    this.history.update("figures", sheetId, undefined);
  }

  private removeFigure(id: string, sheetId: UID) {
    this.history.update("figures", sheetId, id, undefined);
  }

  private checkFigureExists(sheetId: UID, figureId: UID): CommandResult {
    if (this.figures[sheetId]?.[figureId] === undefined) {
      return CommandResult.FigureDoesNotExist;
    }
    return CommandResult.Success;
  }

  private checkFigureDuplicate(figureId: UID): CommandResult {
    if (Object.values(this.figures).find((sheet) => sheet?.[figureId])) {
      return CommandResult.DuplicatedFigureId;
    }
    return CommandResult.Success;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getFigures(sheetId: UID): Figure[] {
    return Object.values(this.figures[sheetId] || {}).filter(isDefined);
  }

  getFigure(sheetId: string, figureId: string): Figure | undefined {
    return this.figures[sheetId]?.[figureId];
  }

  getFigureSheetId(figureId: string): UID | undefined {
    return Object.keys(this.figures).find(
      (sheetId) => this.figures[sheetId]?.[figureId] !== undefined
    );
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      const figures = {};
      sheet.figures.forEach((figure) => {
        figures[figure.id] = figure;
      });
      this.figures[sheet.id] = figures;
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      for (const figure of this.getFigures(sheet.id)) {
        const data = undefined;
        sheet.figures.push({ ...figure, data });
      }
    }
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}

clipboardHandlersRegistries.figureHandlers.add("FIGURE", {
  copy: (
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"],
    isCutOperation: boolean,
    data: ClipboardData
  ) => {
    const sheetId = getters.getActiveSheetId();
    if (!("figureId" in data)) {
      return;
    }
    const figure = getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    const copiedFigure = { ...figure };
    let copiedFigureContent: ClipboardFigureChart | ClipboardFigureImage | undefined = undefined;
    switch (figure.tag) {
      case "chart":
        copiedFigureContent = new ClipboardFigureChart(dispatch, getters, sheetId, data.figureId);
        break;
      case "image":
        copiedFigureContent = new ClipboardFigureImage(dispatch, getters, sheetId, data.figureId);
        break;
      default:
        throw new Error(`Unknow tag '${figure.tag}' for the given figure id: ${data.figureId}`);
    }
    return {
      figureId: data.figureId,
      copiedFigure,
      copiedFigureContent,
      isCutOperation,
    };
  },
  paste: (
    target: Zone[],
    clippedContent: any,
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"]
  ) => {
    if (!clippedContent?.copiedFigure || !clippedContent?.copiedFigureContent) {
      return;
    }
    const sheetId = getters.getActiveSheetId();
    const numCols = getters.getNumberCols(sheetId);
    const numRows = getters.getNumberRows(sheetId);
    const targetX = getters.getColDimensions(sheetId, target[0].left).start;
    const targetY = getters.getRowDimensions(sheetId, target[0].top).start;
    const maxX = getters.getColDimensions(sheetId, numCols - 1).end;
    const maxY = getters.getRowDimensions(sheetId, numRows - 1).end;
    const { width, height } = clippedContent.copiedFigure;
    const position = {
      x: maxX < width ? 0 : Math.min(targetX, maxX - width),
      y: maxY < height ? 0 : Math.min(targetY, maxY - height),
    };
    const newId = new UuidGenerator().uuidv4();
    clippedContent.copiedFigureContent.paste(sheetId, newId, position, { height, width });

    if (clippedContent.isCutOperation) {
      dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.copiedFigureContent.sheetId,
        id: clippedContent.copiedFigure.id,
      });
    }
    dispatch("SELECT_FIGURE", { id: newId });
  },
  isPasteAllowed: (target: Zone[], content: any, option?: ClipboardOptions) => {
    if (target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    if (option?.pasteOption !== undefined) {
      return CommandResult.WrongFigurePasteOption;
    }
    return CommandResult.Success;
  },
  shouldBeUsed: (data: ClipboardData) => {
    return "figureId" in data;
  },
  isCutAllowed: (data: ClipboardData) => {
    return CommandResult.Success;
  },
});
