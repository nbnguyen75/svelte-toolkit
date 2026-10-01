---
name: vue-to-svelte-port
description: Use when porting analyzed VueUse composables or utility functions into Svelte 5 runes and modules. Converts Vue 3 reactivity (ref, computed, watch, lifecycle) to Svelte 5 ($state, $derived, $effect, class/closure reactive getters, proper cleanup), ensuring full SSR safety, strict TypeScript typing, and clean exports.
---

# Vue / VueUse → Svelte: Port to Code

Input: Bảng phân tích logic (từ skill `vue-to-svelte-analyze`) hoặc trực tiếp từ source VueUse (`$VUEUSE_SRC/packages/...`).
Output: Code Svelte 5 trong `src/lib/<category>/<functionName>/` theo ĐÚNG convention bên dưới.

## Convention Svelte 5 bắt buộc

1. **Reactivity & Runes**:
   - `ref(val)` / `reactive(obj)` → `$state(val)` hoặc `$state.raw(val)` (với data lớn hoặc object không cần deep reactivity).
   - `computed(() => ...)` → `$derived(...)` hoặc `$derived.by(() => ...)`.
   - `watch` / `watchEffect` → `$effect(() => { ... return () => cleanup(); })`.
   - Lưu ý khi trả về reactive state từ hàm:
     - Dùng **object getters** (`get value() { return state; }`) hoặc **classes** để khi consumer truy cập thuộc tính sẽ duy trì tính reactive của Svelte 5.
     - Hoặc trả về functions / accessor methods (`getValue()`, `setValue()`) khi cần tương tác trực tiếp.

2. **SSR & Browser Safety**:
   - Các utility tương tác với DOM/Window (`window`, `document`, `navigator`, `localStorage`, etc.) phải kiểm tra `typeof window !== 'undefined'` hoặc chỉ truy cập bên trong `$effect` / browser guards.
   - Thêm fallback an toàn cho môi trường Server-Side Rendering (SSR).

3. **Cleanup & Memory Leaks**:
   - Luôn dọn dẹp event listener, observer, timeout, interval khi effect bị hủy (`return () => { ... }` trong `$effect` hoặc hàm `stop()` / `cleanup()`).
   - Cung cấp hàm `stop()` hoặc `cleanup()` thủ công nếu utility hỗ trợ dừng chủ động.

4. **TypeScript & Typing**:
   - Export rõ ràng type Options và Return type cho từng utility (ví dụ `UseEventListenerOptions`, `UseStorageOptions<T>`).
   - Đảm bảo generic types chặt chẽ (`<T = unknown>`), zero `any`, không dùng `@ts-ignore`.
   - Hỗ trợ tham số linh hoạt (ví dụ: nhận cả giá trị tĩnh lẫn getter function `T | (() => T)`).

5. **Cấu trúc Thư mục & File**:
   ```
   src/lib/<category>/<fnName>/
     index.svelte.ts (chứa implementation chính có runes Svelte 5)
     index.ts        (export implementation và tất cả interfaces/types)
   ```
   Sau đó re-export tại `src/lib/index.ts`.

## Sau khi viết xong
- Chạy `bun run check` (typecheck với svelte-check).
- Chạy `bun run lint` và `bun run format`.
- Viết unit test trong file `*.svelte.test.ts` hoặc `*.test.ts` khi có test suite.
- Re-export trong `src/lib/index.ts`.
