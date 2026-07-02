# Table View Refactoring Template

**Purpose**: Standardized approach for refactoring table-based views to use BaseDataTable component with proper search, pagination, sorting, and actions.

**Views to Refactor Using This Template**:
- UserManagementView
- PaymentMethodsView  
- PromoManagementView

---

## Section 1: Imports & Setup

### Copy-Paste Imports
```typescript
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { ActionIconKey } from '@/utils/tableActionIcons'
```

### Component State Pattern
```typescript
// List state
const items = ref<YourType[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)

// Sorting state
const sortBy = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

// Modal/Action state (if needed)
const isModalOpen = ref(false)
const selectedItem = ref<YourType | null>(null)
```

---

## Section 2: Search Input

### HTML Template
```vue
<div class="search-section">
  <input
    v-model="searchQuery"
    type="text"
    placeholder="Search..."
    class="search-input"
    @input="handleSearch"
  />
</div>
```

### Handler Function
```typescript
const handleSearch = async () => {
  currentPage.value = 1
  await loadItems()
}
```

### Load Function with Search
```typescript
const loadItems = async () => {
  try {
    isLoading.value = true
    const response = await yourApi.getItems({
      page: currentPage.value,
      per_page: itemsPerPage.value,
      search: searchQuery.value,
      sort_by: sortBy.value,
      sort_dir: sortDir.value,
    })
    items.value = response.data || []
    totalItems.value = response.pagination?.total || 0
  } catch (error) {
    // Handle error
  } finally {
    isLoading.value = false
  }
}
```

---

## Section 3: BaseDataTable Setup

### Column Definition
```typescript
const tableColumns: Column[] = [
  {
    key: 'id',
    label: 'ID',
    width: '100px',
    sortable: true,
  },
  {
    key: 'name',
    label: 'Name',
    width: '200px',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    align: 'center',
  },
  {
    key: 'createdAt',
    label: 'Created',
    width: '150px',
    sortable: true,
  },
  {
    key: 'actions',
    label: 'Actions',
    width: '100px',
    sortable: false,
    align: 'center',
  },
]
```

### Table in Template
```vue
<BaseDataTable
  :columns="tableColumns"
  :data="items"
  :current-page="currentPage"
  :items-per-page="itemsPerPage"
  :sort-by="sortBy"
  :sort-dir="sortDir"
  :fill-height="true"
  @update:current-page="handlePageChange"
  @update:sortBy="handleSortBy"
  @update:sortDir="handleSortDir"
  @row-click="handleRowClick"
>
  <!-- Status Badge Slot -->
  <template #cell-status="{ row, value }">
    <span :class="['badge', `badge-${row.status}`]">
      {{ value }}
    </span>
  </template>

  <!-- Actions Slot -->
  <template #actions="{ row }">
    <TableActionButtons
      :actions="getRowActions(row)"
      :dropdown-breakpoint="1024"
    />
  </template>
</BaseDataTable>
```

---

## Section 4: Pagination

### Computed Properties
```typescript
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / itemsPerPage.value) || 1
})
```

### Handler Functions
```typescript
const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadItems()
  }
}

const handleLimitChange = async (newLimit: number) => {
  itemsPerPage.value = newLimit
  currentPage.value = 1
  await loadItems()
}
```

### Limit Selector in Template
```vue
<div class="pagination-controls">
  <div class="pagination-top">
    <label>Items per page:</label>
    <select 
      :value="itemsPerPage" 
      @change="e => handleLimitChange(Number(e.target.value))"
      class="limit-select"
    >
      <option value="10">10</option>
      <option value="20">20</option>
      <option value="50">50</option>
    </select>
  </div>
  
  <div class="pagination-info">
    {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ 
      Math.min(currentPage * itemsPerPage, totalItems) 
    }} of {{ totalItems }} items
  </div>
</div>
```

---

## Section 5: Badges & Status Display

### Badge Styling in CSS
```css
.badge {
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge-active {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.badge-inactive {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.badge-pending {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
}
```

---

## Section 6: Action Buttons

### Define Actions
```typescript
const getRowActions = (row: YourType): TableActionButtons.Action[] => {
  return [
    {
      id: 'edit',
      icon: 'pencil',
      label: 'Edit',
      onClick: () => handleEditItem(row.id),
    },
    {
      id: 'delete',
      icon: 'trash',
      label: 'Delete',
      variant: 'danger',
      onClick: () => handleDeleteItem(row.id),
    },
  ]
}
```

### Handler Functions
```typescript
const handleEditItem = (id: string) => {
  selectedItem.value = items.value.find(i => i.id === id) || null
  isModalOpen.value = true
}

const handleDeleteItem = async (id: string) => {
  if (confirm('Are you sure?')) {
    try {
      await yourApi.deleteItem(id)
      await loadItems()
    } catch (error) {
      // Handle error
    }
  }
}
```

---

## Section 7: Sorting

### Sort Handlers
```typescript
const handleSortBy = (column: string) => {
  sortBy.value = column
  currentPage.value = 1
  loadItems()
}

const handleSortDir = (direction: 'asc' | 'desc') => {
  sortDir.value = direction
  currentPage.value = 1
  loadItems()
}
```

---

## Section 8: Component Lifecycle

### On Mount
```typescript
onMounted(async () => {
  await loadItems()
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
})
```

---

## Section 9: CSS Structure

### Standard Styling Template
```css
.view-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
}

.header {
  margin-bottom: 1rem;
}

.search-section {
  margin-bottom: 1rem;
  display: flex;
  gap: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.table-wrapper {
  flex: 1;
  min-height: 0;
}

.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding: 0.5rem;
}

.pagination-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.limit-select {
  padding: 0.35rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}

/* Responsive */
@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
```

---

## Testing Checklist

### Functionality Tests
- [ ] Search filters items correctly
- [ ] Pagination loads correct page
- [ ] Items per page limit changes work
- [ ] Sorting by column works (asc/desc)
- [ ] Edit action opens modal
- [ ] Delete action shows confirmation
- [ ] Action buttons show on desktop (inline)
- [ ] Action buttons show as dropdown on mobile

### UI/UX Tests
- [ ] Table responsive on mobile
- [ ] Pagination controls fit on mobile
- [ ] Badges display correctly
- [ ] Loading state shows
- [ ] Empty state displays message
- [ ] Column widths balanced
- [ ] No text overflow issues
- [ ] Hover effects work

### Performance Tests
- [ ] No console errors
- [ ] API calls optimized
- [ ] Sorting doesn't lag
- [ ] Pagination smooth
- [ ] Search responsive (< 500ms)
- [ ] Modal opens/closes smoothly

---

## Common Issues & Solutions

### Issue 1: "Table shows only 1 item"
**Solution**: Check that BaseDataTable receives `data` prop correctly and that pagination logic doesn't override it.

### Issue 2: "Dropdown actions hidden behind table"
**Solution**: Ensure `TableActionButtons` uses `Teleport` to body and has `z-index: 1000`.

### Issue 3: "Pagination buttons not aligned properly"
**Solution**: Use flexbox with `justify-content: space-between` in pagination-controls, not grid.

### Issue 4: "Search doesn't work on first input"
**Solution**: Ensure `handleSearch` resets `currentPage` to 1 before calling `loadItems()`.

### Issue 5: "Sorting resets pagination"
**Solution**: Already implemented - sorting handlers reset `currentPage.value = 1`.

### Issue 6: "Mobile responsive issues"
**Solution**: Set `fillHeight: true` on BaseDataTable and use viewport height calculations for items per page.

### Issue 7: "Console errors after removing console.log()"
**Solution**: Verify all try-catch blocks are complete and error handlers don't reference removed logs.

---

## API Response Format Expected

```typescript
{
  data: YourType[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Important**: If API uses different field names:
- Backend returns `limit` → Frontend expects `per_page`
- Convert in api service or store before storing

---

## File Structure for Refactored View

```
views/YourSection/YourListView.vue
├── Script Setup (imports, state, computed, handlers, lifecycle)
├── Template
│   ├── Header with search input
│   ├── BaseDataTable with slots
│   ├── Pagination controls
│   └── Modal (if applicable)
└── Scoped Styles
```

---

## Quick Checklist Before Submission

- [ ] Removed all console.log statements
- [ ] BaseDataTable properly wired
- [ ] Search works with API
- [ ] Pagination respects per_page param
- [ ] Sorting sends sort_by and sort_dir to API
- [ ] Action buttons functional
- [ ] Mobile responsive tested
- [ ] No syntax errors
- [ ] API calls optimized (no duplicate requests)
- [ ] Error handling in place
