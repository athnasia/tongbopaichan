import { ref, computed } from 'vue'

/**
 * Provides reactive pagination over a source array.
 * @param source - getter function returning the full array (keeps reactive dependency)
 * @param pageSize - rows per page, default 10
 */
export function usePagination<T>(source: () => T[], pageSize = 10) {
  const page = ref(1)
  const all = computed(source)
  const paged = computed(() => all.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  const total = computed(() => all.value.length)
  return { page, paged, total }
}
