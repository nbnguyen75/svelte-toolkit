---
name: vue-to-svelte-analyze
description: Use when analyzing a VueUse / Vue 3 composable or utility function before porting to Svelte 5. Reads Vue composition API source and produces a structured breakdown (state, computed, watch/effects, lifecycle, browser/DOM interactions, options) independent of Vue-specific runtime.
---

# Vue / VueUse → Svelte: Analyze Source

Khi được giao 1 file/thư mục VueUse composable (từ repo VueUse tại `$VUEUSE_SRC/packages/...`), nhiệm vụ là bóc tách LOGIC và HÀNH VI, không phụ thuộc vào cú pháp Vue runtime.

## Các bước phân tích

1. **Đọc source code Vue / TypeScript**, phân loại từng phần theo bảng:
   - **State**: mọi `ref`, `shallowRef`, `reactive` → tên biến, kiểu dữ liệu, giá trị khởi tạo, nơi được gán/mutate.
   - **Derived / Computed**: mọi `computed` → công thức tính, dependencies, có setter hay không.
   - **Watch / Effects**: mọi `watch`, `watchEffect`, `watchSyncEffect`, `watchPostEffect` → trigger khi nào, làm gì, cơ chế cleanup (onCleanup hoặc return).
   - **Lifecycle & Scope**: `onMounted`, `onUnmounted`, `onScopeDispose`, `tryOnScopeDispose`, `tryOnMounted` → thời điểm kích hoạt và dọn dẹp tài nguyên.
   - **Options & Arguments**: tham số đầu vào, default options, hỗ trợ `MaybeRefOrGetter` / `MaybeRef`.
   - **DOM & Browser APIs**: event listeners (`addEventListener`), observers (`ResizeObserver`, `IntersectionObserver`, `MutationObserver`), timers (`setInterval`, `setTimeout`), navigator/storage APIs.
   - **SSR & Browser Guards**: vị trí kiểm tra `isClient` / `window !== undefined`.
   - **Vue-only utilities**: `toValue`, `toRef`, `unrefElement`, `getCurrentScope` → ghi chú để thay thế bằng Svelte 5 pattern hoặc native JavaScript.

2. **Output ra dạng bảng/markdown mô tả logic thuần túy**, KHÔNG viết code Svelte ở bước này.

3. **Ghi chú các dependency bên ngoài** nếu có (ví dụ thư viện toán học, crypto, v.v.) và đánh giá giải pháp chuẩn native hoặc framework-agnostic.

## Không làm
- Không viết code `.svelte.ts` hoặc `.svelte` ở bước này.
- Không tự ý rút gọn hoặc bỏ qua các edge-case hay cơ chế cleanup tài nguyên của VueUse.
