// Re-exported from the mocked backend (src/lib/mockApi.js) so every page
// that already imports from '../lib/api' keeps working unchanged.
export {
  listMyGrievances,
  listDepartmentGrievances,
  getGrievance,
  getStatusEvents,
  createGrievance,
  transitionGrievance,
  simulateSlaTimeout,
  aiClassify,
  aiSummarize,
  aiDraftEscalation,
} from './mockApi'
