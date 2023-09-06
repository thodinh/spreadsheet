import { ClipboardHandlersImplementation } from "../types";
import { Registry } from "./registry";

/**
 * An ClipboardHandlersImplementation is used to describe how to handle a
 * Copy/Paste according to the content of the clipboard.
 */

export const clipboardHandlersRegistries = {
  figureHandlers: new Registry<ClipboardHandlersImplementation>(),
  cellHandlers: new Registry<ClipboardHandlersImplementation>(),
};
