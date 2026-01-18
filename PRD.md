# Manual Order Entry Modifications - Implementation Plan

## Overview
Enhancements to the existing manual order entry feature including: date picker replacement, item selection UI reorganization, duplicate prevention, pagination, sorting, and improved editing experience.

---

## 1. React Date Picker

**Current**: Native `<input type="date">` in add item form
**New**: DayPicker from react-day-picker (already installed)

**Approach**: Display DayPicker inline in the dialog (no Popover component exists)

**File**: `frontend/src/components/orders/add-manual-order-dialog.tsx`
- Add import: `import { DayPicker } from "react-day-picker"` and CSS
- Replace native date input with inline DayPicker
- Convert between Date object and string format using `toLocalDateString` utility

---

## 2. Item Selection UI Reorganization

**Current**: Two flat sections - "Menu items for date" and "Any menu item (custom)"

**New Structure**:
```
┌─────────────────────────────────────┐
│ [DayPicker Calendar]                │
├─────────────────────────────────────┤
│ Menu Items (7 days)                 │
│ ├─ Monday, Jan 20                   │
│ │   • Item A                        │
│ │   • Item B                        │
│ ├─ Tuesday, Jan 21                  │
│ │   • Item C                        │
│ └─ ...                              │
├─────────────────────────────────────┤
│ All Items            [Create Item]  │
│   • Item X                          │
│   • Item Y                          │
│   • ...                             │
└─────────────────────────────────────┘
```

**File**: `frontend/src/components/orders/add-manual-order-dialog.tsx`
- Group menu entries by date (next 7 days) using `useMemo`
- Show collapsible sections per day
- "All Items" section with "Create Item" button
- "Create Item" opens `AddItemDialog`
- After item created → auto-create custom entry → auto-select for modifier configuration

**New state needed**:
```tsx
const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
```

---

## 3. Custom Entry Duplicate Prevention

**Problem**: `createCustomMenuEntry` always creates new entry, causing duplicates

**Solution**: Check for existing custom entry first, reuse silently if found

**File**: `backend/src/trpc/router/menu.ts`

Modify `createCustomMenuEntry`:
```typescript
// Check if custom entry already exists
const existingEntry = await db.query.menuEntries.findFirst({
  where: and(
    eq(menuEntries.date, input.date),
    eq(menuEntries.menuItemId, input.menuItemId),
    eq(menuEntries.isCustom, true),
  ),
  with: { menuItem: { with: { modifierGroups: ... } } },
});

if (existingEntry) {
  return existingEntry; // Reuse existing
}
// Otherwise create new...
```

**Convert Custom to Normal** (when added to Menu Editor):
- Add new mutation `convertCustomToNormal` that sets `isCustom: false`
- Call from Menu Editor when adding an item that has existing custom entry

---

## 4. Table Pagination

**File**: `frontend/src/components/orders/manual-entry-table.tsx`

**Add state**:
```tsx
const ITEMS_PER_PAGE = 10;
const [currentPage, setCurrentPage] = useState(1);
```

**Pagination logic**:
```tsx
const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
const paginatedOrders = filteredOrders.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);
```

**UI**: Use existing `Pagination` component from `ui/pagination.tsx`
- Previous/Next buttons
- Page number links
- Ellipsis for large page counts
- Reset to page 1 when search changes

---

## 5. Table Sorting

**File**: `frontend/src/components/orders/manual-entry-table.tsx`

**Add state**:
```tsx
type SortField = "user" | "date" | "total";
type SortDirection = "asc" | "desc";

const [sortField, setSortField] = useState<SortField>("date");
const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
```

**Sort logic**:
```tsx
const sortedOrders = useMemo(() => {
  return [...filteredOrders].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "user": cmp = a.user.name.localeCompare(b.user.name); break;
      case "date": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      case "total": cmp = (a.total ?? 0) - (b.total ?? 0); break;
    }
    return sortDirection === "asc" ? cmp : -cmp;
  });
}, [filteredOrders, sortField, sortDirection]);
```

**Clickable headers** with sort indicators (ArrowUp/ArrowDown/ArrowUpDown icons)

---

## 6. Editing Orders

### 6a. QuantityStepper for Item Quantities

**File**: `frontend/src/components/orders/add-manual-order-dialog.tsx`

Replace trash button with `QuantityStepper`:
```tsx
<QuantityStepper
  value={item.quantity}
  onReduce={() => {
    if (item.quantity <= 1) removeItem(index);
    else updateItemQuantity(index, item.quantity - 1);
  }}
  onIncrease={() => updateItemQuantity(index, item.quantity + 1)}
  reduceIcon={item.quantity <= 1 ? <Trash2 /> : undefined}
  reduceDisabled={isItemPastDue(item)}
  increaseDisabled={isItemPastDue(item)}
/>
```

Add `updateItemQuantity` function to update item in state.

### 6b. View-Only Mode for Customer Orders

**File**: `frontend/src/components/orders/manual-entry-table.tsx`

Show Eye icon for customer orders (isManual=false):
```tsx
<Button onClick={() => order.isManual ? setEditOrder(order) : setViewOrder(order)}>
  {order.isManual ? <Edit /> : <Eye />}
</Button>
```

**File**: `frontend/src/components/orders/add-manual-order-dialog.tsx`

Add `viewOnly?: boolean` prop:
- Change title to "View Order"
- Hide "Add Item" button
- Show quantities without stepper (just text)
- Hide submit button, show only "Close"

### 6c. Per-Item Due Date Validation (Client-Side)

```tsx
const isItemPastDue = (item: OrderItem) => {
  // Look up menu entry to get date
  const menuEntry = menuEntriesQuery.data?.find(e => e.id === item.menuEntryId);
  if (!menuEntry) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDate = new Date(menuEntry.date + "T00:00:00");

  return entryDate < today;
};
```

- Disable QuantityStepper for past-due items
- Show visual indicator (opacity, "Past due - locked" text)

### 6d. Per-Item Due Date Validation (Server-Side)

**File**: `backend/src/trpc/router/order.ts`

In `updateManualOrder`:
```typescript
// For each item being modified
const entryDate = normalizeDate(entry.date);
const today = normalizeDate(new Date());

if (entryDate < today) {
  // Check if this is an actual modification
  // Compare with existing item's quantity and modifiers
  // If changed, throw error
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Cannot modify item - due date has passed`,
  });
}
```

### 6e. Fix: Preserve Existing Items on Update

**Problem**: Current `updateManualOrder` deletes all items and recreates, losing `baggedAt` timestamps.

**Solution**: Track `orderItemId` and update existing items instead of delete/recreate.

**Frontend**: Add `orderItemId?: string` to `OrderItem` interface, populate from `editData.items`.

**Backend** (`updateManualOrder`):
1. Accept `orderItemId` in input schema
2. For items with `orderItemId`: UPDATE instead of DELETE/INSERT
3. For new items (no `orderItemId`): INSERT
4. Delete items that are no longer in the list
5. Preserve `baggedAt` and other fields

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/orders/add-manual-order-dialog.tsx` | DayPicker, UI reorganization, QuantityStepper, viewOnly mode, due date checks |
| `frontend/src/components/orders/manual-entry-table.tsx` | Pagination, sorting, Eye/Edit button logic |
| `backend/src/trpc/router/menu.ts` | Duplicate prevention, convertCustomToNormal |
| `backend/src/trpc/router/order.ts` | Proper item update logic, due date validation |

---

## Implementation Order

### Phase 1: Backend Changes
1. ~~Modify `createCustomMenuEntry` for duplicate prevention~~ ✅ (already implemented)
2. ~~Add `convertCustomToNormal` mutation~~ ✅
3. ~~Fix `updateManualOrder` to preserve items and validate due dates~~ ✅

### Phase 2: Table Enhancements
1. ~~Add sorting state and logic~~ ✅
2. Add pagination state and logic
3. Add view-only button for customer orders

### Phase 3: Dialog Enhancements
1. Replace date input with DayPicker
2. Reorganize item selection UI (grouped by day + All Items)
3. Add "Create Item" button with callback
4. Replace trash with QuantityStepper
5. Add `viewOnly` prop support
6. Add per-item due date validation
7. Track `orderItemId` for proper updates

---

## Verification

1. **Date Picker**: DayPicker displays and selects dates correctly
2. **Item Selection**: Items grouped by day, "All Items" shows all menu items, "Create Item" works
3. **Custom Entry**: Creating same custom entry twice reuses existing
4. **Pagination**: 10 items per page, navigation works
5. **Sorting**: Click column headers to sort asc/desc
6. **Customer Orders**: Eye icon shown, opens view-only dialog
7. **Manual Orders**: Edit icon, QuantityStepper works, past-due items locked
8. **Server Validation**: Reject modifications to past-due items
9. **Item Preservation**: Editing order preserves `baggedAt` timestamps
