---
name: refactor
description: Component refactoring, code-splitting, API function isolation, and co-location principles for React & TypeScript. Use when auditing, refactoring, or splitting bloated components, untangling mixed concerns, organizing component directories, eliminating monolithic client objects, and eliminating JSX/TS smells.
---

# Frontend Component & Feature Refactoring Guide

A practical, actionable playbook for identifying JSX and TypeScript code smells, refactoring React components into clean single-responsibility units, and establishing clean, functional API layers.

---

## Part 1: Code Smells — When to Split & Refactor

Split a component or module when one or more of the following triggers occur. Do not abstract prematurely, but split decisively once boundaries and concerns diverge.

### 1. Monolithic API Client Objects vs. Standalone Functions (Crucial Smell)
- **Smell**: Creating artificial wrapper objects or classes to group HTTP methods (e.g. `export const httpChatClient: ChatApiClient = { ... }` or `export const chatApi = { ... }`).
- **Rule**:
  - **TUYỆT ĐỐI BỎ ĐI CÁC OBJECT CLIENT NÀY**: Do not bundle HTTP calls into client objects/classes.
  - **CHỈ EXPOSE STANDALONE FUNCTIONS**: Export independent, atomic fetch functions (e.g., `export async function getChatConversationsClient(...)`, `export async function createConversationClient(...)`).
  - **Single Responsibility & Tree-shaking**: Standalone functions are easier to test, mock with MSW/spies, tree-shake, and compose cleanly with TanStack Query `queryOptions`. Object wrappers are only permitted in ultra-rare, strictly justified factory patterns.

### 2. Redundant DTOs & Return Types in API Layer
- **Smell**: Manually writing verbose DTO response interfaces for every endpoint.
- **Rule**:
  - Infer request and response types directly from `$fetch` using `InferRequestType` and `InferResponseType`:
    ```ts
    export type CreateNoteRequest = InferRequestType<typeof $fetch.api.v1.notes.$post>;
    export type CreateNoteResponse = InferResponseType<typeof $fetch.api.v1.notes.$post>;

    export async function createNoteClient(args: CreateNoteRequest) {
      return await $fetch.api.v1.notes.$post(args);
    }
    ```

### 3. JSX Length & Depth
- **File Length**: Render component / JSX file exceeds **150–200 lines**.
- **JSX Nesting Depth**: Elements nested more than **4–5 levels deep** (`div > div > div > div...`), obscuring component hierarchy.
- **Action**: Extract nested sub-trees into focused sub-components.

### 4. Repeated or Nameable UI Chunks
- **Nameable Sections**: If you can point to a JSX block and give it a clear, distinct domain name (*"this is the Card"*, *"this is the FilterBar"*, *"this is the ActionToolbar"*), extract it into its own component—even if currently used only once.
- **Benefit**: Naming makes the parent component self-documenting and easy to scan at a glance.

### 5. Multiple Concerns Mixed in One File
- **Mixed Responsibilities**: A single component simultaneously fetches server state, validates forms, handles list filtering, and controls modal dialog state.
- **Action**: Separate each concern into a dedicated unit:
  - Data fetching & server mutations $\rightarrow$ dedicated custom hook (`use*Query`, `use*Mutation`).
  - Dialog / modal visibility & actions $\rightarrow$ isolated dialog store and container (`use*DialogStore`).
  - Form validation & layout $\rightarrow$ pure form component (`*Form`).
  - List & presentation $\rightarrow$ clean presentation component consuming the hook.

### 6. Complex Conditional Rendering
- **Nested Branching**: Heavy nested ternaries (`a ? b ? <X/> : <Y/> : <Z/>`) or multiple `{condition && (...)}` blocks rendering disparate sub-trees.
- **Action**: Extract each branch into a dedicated sub-component. The parent component should only contain simple routing/selection logic to decide which sub-component renders.

### 7. Explicit Minimal Exports in `index.ts` & Dead Code Elimination
- **Rule**:
  - `index.ts` (feature facade or component folder facade) MUST only export what is **actively consumed** by external callers.
  - **TUYỆT ĐỐI KHÔNG dùng wildcard export (`export * from ...`)**: Always use explicit named exports.
  - **Xóa bỏ các exports không dùng**: If a type, helper, or component is not consumed externally, delete its export from `index.ts` and keep it private to the feature.
  - **Delete Dead Code**: Never comment out obsolete code. Delete it completely.

---

## Part 2: Component Architecture & Co-location Rules

Follow these standard structural rules for all component and API extractions.

### 1. Flat by Default, Folder by Exception (Co-location Tiers)
Do not create folders for trivial components. Choose the right co-location tier:

- **Tier 1 — Single File (< 150 lines)**:
  - Keep main component, simple sub-JSX functions, and local types together in one file (`user-card.tsx`).
- **Tier 2 — Component Folder (150–300+ lines or multiple sub-units)**:
  - Extract into a component folder (`components/user-card/`).
- **Tier 3 — Vertical Domain Submodules (Large feature with distinct domains)**:
  - When a feature has distinct domain concerns (e.g. `session/`, `message-tree/`, `attachments/`), group them into vertical slices rather than monolithic horizontal layers.

### 2. No Prefix Stuttering Inside Component Folders
When files live inside a component folder, the folder provides the context. **Never repeat the component name as a prefix** on internal files:

```text
❌ WRONG (Stuttering prefix):        ✅ CORRECT (Clean, context-aware):
components/user-card/                components/user-card/
  ├── user-card.tsx                    ├── user-card.tsx
  ├── user-card-avatar.tsx             ├── avatar.tsx
  ├── user-card-actions.tsx            ├── actions.tsx
  ├── user-card.types.ts               ├── types.ts
  ├── use-user-card.ts                 ├── use-actions.ts
  └── index.ts                         └── index.ts
```

### 3. API Layer Standard Pattern (Functions Only, No Client Objects)

```ts
// src/features/<feature>/api/<feature>.http.ts
import type { InferRequestType, InferResponseType } from '@/lib/fetch';
import { $fetch } from '@/lib/fetch';

export type GetItemsRequest = InferRequestType<typeof $fetch.api.v1.items.$get>;
export type GetItemsResponse = InferResponseType<typeof $fetch.api.v1.items.$get>;

// Standalone function — NO export const itemClient = { ... }
export async function getItemsClient(args: GetItemsRequest) {
  return await $fetch.api.v1.items.$get(args);
}

export type CreateItemRequest = InferRequestType<typeof $fetch.api.v1.items.$post>;
export type CreateItemResponse = InferResponseType<typeof $fetch.api.v1.items.$post>;

export async function createItemClient(args: CreateItemRequest) {
  return await $fetch.api.v1.items.$post(args);
}
```

```ts
// src/features/<feature>/api/<feature>.api.ts (TanStack Query options)
import { queryOptions } from '@tanstack/react-query';
import { getItemsClient } from '@/features/<feature>/api/<feature>.http';

export const featureQueryKeys = {
  all: ['<feature>'] as const,
  list: (filter: unknown) => [...featureQueryKeys.all, 'list', filter] as const,
};

export function featureListQueryOptions(filter: unknown) {
  return queryOptions({
    queryKey: featureQueryKeys.list(filter),
    queryFn: () => getItemsClient({ query: filter }),
  });
}
```

### 4. Public API via `index.ts`
- Use `index.ts` as the folder's public boundary:
  ```ts
  // components/user-card/index.ts
  export { UserCard, default } from './user-card';
  export type { UserCardProps } from './types';
  ```
- External code imports cleanly from `@/components/user-card` without needing to reach into internal file paths.
- **NEVER** use wildcard exports (`export * from ...`). Export symbols explicitly.

### 5. Semantic Function & Hook Naming
- Tên hàm và tên hook phải phản ánh chính xác công việc mà nó xử lý:
  - Custom Hook: `use<Feature><Action>` (e.g. `useNoteMutations`, `useChatScroll`, `useConversationDialog`).
  - API HTTP Function: `<action><Entity>Client` (e.g. `getNotesClient`, `createTaskClient`, `deleteConversationClient`).
  - Query Option Factory: `<feature><Entity>QueryOptions` (e.g. `noteListQueryOptions`, `chatMessagesQueryOptions`).

---

## Part 3: Refactoring Checklist

- [ ] **NO Monolithic Client Objects**: Are all HTTP functions exported as standalone functions (`export async function get...Client`) instead of object wrappers (`httpChatClient: ChatApiClient = {...}`)?
- [ ] **Inferred DTO Types**: Are request/response types inferred via `InferRequestType` / `InferResponseType` without repetitive manual DTOs?
- [ ] **Minimal `index.ts` Facade**: Does each `index.ts` expose **ONLY** what is actively used by other features/components (explicit exports, zero `export *`)?
- [ ] **Dead Code Deleted**: Is all unused code and dead exports deleted completely (never commented out)?
- [ ] **Semantic Naming**: Do component, hook, and function names accurately reflect their single responsibility?
- [ ] **JSX Length & Depth**: Are component files under 150–200 lines with nesting depth $\le 4$ levels?
- [ ] **Clean Co-location**: Are internal component files free of prefix stuttering (`avatar.tsx` instead of `user-card-avatar.tsx`)?
- [ ] **Strict Non-Relative Imports**: Are external feature imports using `@/...` path aliases?
