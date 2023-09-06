import {
  CommandDispatcher,
  //CommandResult,
  Dimension,
  FigureSize,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  UID,
} from "../../types";
import { Image } from "../../types/image";
import { AbstractChart } from "../figures/charts";
import { deepCopy } from "../misc";
import { ClipboardContent, ClipboardMIMEType, ClipboardState } from "./../../types/clipboard";

/** State of the clipboard when copying/cutting figures */
export class ClipboardFigureState implements ClipboardState {
  constructor() {}

  getClipboardContent(): ClipboardContent {
    return { [ClipboardMIMEType.PlainText]: "\t" };
  }

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean {
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext): void {}
}

export class ClipboardFigureChart {
  private readonly copiedChart: AbstractChart;

  constructor(
    private dispatch: CommandDispatcher["dispatch"],
    getters: Getters,
    readonly sheetId: UID,
    copiedFigureId: string
  ) {
    const chart = getters.getChart(copiedFigureId);
    if (!chart) {
      throw new Error(`No chart for the given id: ${copiedFigureId}`);
    }
    this.copiedChart = chart.copyInSheetId(sheetId);
  }

  paste(sheetId: UID, figureId: UID, position: { x: number; y: number }, size: FigureSize) {
    const copy = this.copiedChart.copyInSheetId(sheetId);
    this.dispatch("CREATE_CHART", {
      id: figureId,
      sheetId,
      position,
      size,
      definition: copy.getDefinition(),
    });
  }
}

export class ClipboardFigureImage {
  private readonly copiedImage: Image;

  constructor(
    private dispatch: CommandDispatcher["dispatch"],
    getters: Getters,
    readonly sheetId: UID,
    copiedFigureId: string
  ) {
    const image = getters.getImage(copiedFigureId);
    this.copiedImage = deepCopy(image);
  }

  paste(sheetId: UID, figureId: UID, position: { x: number; y: number }, size: FigureSize) {
    const copy = deepCopy(this.copiedImage);
    this.dispatch("CREATE_IMAGE", {
      figureId,
      sheetId,
      position,
      size,
      definition: copy,
    });
  }
}
