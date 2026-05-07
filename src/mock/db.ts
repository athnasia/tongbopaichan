import { createSeedState } from '@/mock/seed'
import type { ApsSeedState } from '@/types/demo'

const DB_KEY = 'aps_mock_db'

function loadOrSeed(): ApsSeedState {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as ApsSeedState
  } catch {
    // ignore parse errors
  }
  return createSeedState()
}

let _db: ApsSeedState = loadOrSeed()

export const db = {
  get(): ApsSeedState {
    return _db
  },
  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(_db))
    } catch {
      // ignore quota errors
    }
  },
  patch(partial: Partial<ApsSeedState>) {
    _db = { ..._db, ...partial }
    db.save()
  },
  reset() {
    _db = createSeedState()
    db.save()
  },
}
