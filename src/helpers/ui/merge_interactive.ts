import { _lt } from "../../translation";
import { CommandResult, SpreadsheetChildEnv, UID, Zone } from "../../types";

export const AddMergeInteractiveContent = {
  MergeIsDestructive: _lt(
    "Merging these cells will only preserve the top-leftmost value. Merge anyway?"
  ),
};

export function interactiveAddMerge(env: SpreadsheetChildEnv, sheetId: UID, target: Zone[]) {
  const result = env.model.dispatch("ADD_MERGE", { sheetId, target });
  if (!result.isSuccessful) {
    if (result.isCancelledBecause(CommandResult.MergeIsDestructive)) {
      env.askConfirmation(AddMergeInteractiveContent.MergeIsDestructive, () => {
        env.model.dispatch("ADD_MERGE", { sheetId, target, force: true });
      });
    }
  }
}
