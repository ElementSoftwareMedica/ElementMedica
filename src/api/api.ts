// Re-export delle funzioni API dal servizio centralizzato
// Questo file mantiene la compatibilità per i componenti che importano da '../../api/api'

export {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiDeleteWithPayload,
  apiUpload,
  apiService,
  invalidateCache,
  clearCache
} from '../services/api';

// Export default per compatibilità
import { apiService } from '../services/api';
export default apiService;