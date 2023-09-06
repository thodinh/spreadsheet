import { SelectionStreamProcessor } from "../selection_stream/selection_stream_processor";
import { CommandDispatcher, CommandResult } from "./commands";
import { Getters } from "./getters";
import { Dimension, HeaderIndex, UID, Zone } from "./misc";
import { GridRenderingContext } from "./rendering";

export enum ClipboardMIMEType {
  PlainText = "text/plain",
  Html = "text/html",
}

export type ClipboardContent = { [type in ClipboardMIMEType]?: string };

export interface ClipboardOptions {
  pasteOption?: ClipboardPasteOptions;
  shouldPasteCF?: boolean;
  selectTarget?: boolean;
}
export type ClipboardPasteOptions = "onlyFormat" | "onlyValue";
export type ClipboardOperation = "CUT" | "COPY";

export interface ClipboardState {
  operation?: ClipboardOperation;
  sheetId?: UID;

  getClipboardContent(): ClipboardContent;
  drawClipboard(renderingContext: GridRenderingContext): void;

  /**
   * Check if a col/row added/removed at the given position is dirtying the clipboard
   */
  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean;
}

export type ClipboardData =
  | {
      zones: Zone[];
      selection: SelectionStreamProcessor;
    }
  | {
      figureId: UID;
    };

export interface ClipboardHandlersImplementation {
  copy: (
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"],
    isCutOperation: boolean,
    data: ClipboardData
  ) => any;
  paste: (
    target: Zone[],
    clippedContent: any,
    getters: Getters,
    dispatch: CommandDispatcher["dispatch"],
    options?: ClipboardOptions | undefined
  ) => void;
  isPasteAllowed: (target: Zone[], content: any, option?: ClipboardOptions) => CommandResult;
  isCutAllowed: (data: ClipboardData) => CommandResult;
  shouldBeUsed: (data: ClipboardData) => boolean;
}
