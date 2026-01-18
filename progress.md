# Progress Log

## 2026-01-18

### Phase 1: Backend Changes - Task 2: Add `convertCustomToNormal` mutation

**Status**: ✅ Completed

**What was done**:
- Discovered that Task 1 (`createCustomMenuEntry` duplicate prevention) was already implemented in `backend/src/trpc/router/menu.ts:239-272`
- Added new `convertCustomToNormal` mutation to `backend/src/trpc/router/menu.ts:324-355`
  - Takes an `entryId` (UUID) as input
  - Finds the menu entry and returns error if not found
  - If already a normal entry, returns it unchanged
  - Otherwise, updates `isCustom` to `false` and returns the updated entry
- This mutation allows converting custom menu entries to normal entries when they are added to the Menu Editor

**Files modified**:
- `backend/src/trpc/router/menu.ts` - Added `convertCustomToNormal` mutation

**Next task**: Phase 1, Task 3 - Fix `updateManualOrder` to preserve items and validate due dates
