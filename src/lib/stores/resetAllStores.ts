import { useContactStore } from './contactStore'
import { useTaskStore } from './taskStore'
import { usePipelinesStore } from './pipelinesStore'
import { useCalendarStore } from './calendarStore'

export function resetAllStores() {
  useContactStore.getState().reset()
  useTaskStore.getState().reset()
  usePipelinesStore.getState().reset()
  useCalendarStore.getState().reset()
}
