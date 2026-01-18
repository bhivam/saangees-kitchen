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

---

### Phase 1: Backend Changes - Task 3: Fix `updateManualOrder` to preserve items and validate due dates

**Status**: ✅ Completed

**What was done**:

**Backend changes** (`backend/src/trpc/router/order.ts:698-926`):
- Extended input schema to accept `orderItemId?: string` for existing items
- Fetches existing order items with their menu entries for due date validation
- Added server-side due date validation:
  - Compares item quantity and modifiers to detect modifications
  - Rejects modifications to items whose menu entry date is in the past
  - Rejects deletion of past-due items
- Changed update logic to:
  - UPDATE existing items (with `orderItemId`) instead of DELETE/INSERT - preserves `baggedAt` timestamps
  - INSERT new items (without `orderItemId`)
  - DELETE only items that are no longer in the list (and not past-due)

**Frontend changes** (`frontend/src/components/orders/add-manual-order-dialog.tsx`):
- Added `orderItemId?: string` field to `OrderItem` interface
- When loading edit data, populate `orderItemId` from `item.id` for each existing item
- Updated `handleSubmit` to include `orderItemId` in the update mutation payload

**Files modified**:
- `backend/src/trpc/router/order.ts` - Rewrote `updateManualOrder` mutation
- `frontend/src/components/orders/add-manual-order-dialog.tsx` - Added `orderItemId` tracking

**Next task**: Phase 2, Task 1 - Add sorting state and logic to manual-entry-table.tsx
