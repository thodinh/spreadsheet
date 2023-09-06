import { Dimension, Getters, GridRenderingContext, HeaderIndex, UID } from "../../types";
import { ClipboardMIMEType, ClipboardOperation, ClipboardState } from "./../../types/clipboard";

/** Abstract state of the clipboard when copying/cutting content that is pasted in cells of the sheet */
export abstract class ClipboardCellsAbstractState implements ClipboardState {
  readonly sheetId: UID;

  constructor(readonly operation: ClipboardOperation, protected getters: Getters) {
    this.sheetId = getters.getActiveSheetId();
  }

  abstract getClipboardContent(): Record<ClipboardMIMEType, string>;

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension) {
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext) {}
}
