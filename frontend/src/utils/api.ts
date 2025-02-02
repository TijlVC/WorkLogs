import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'http://localhost:5001/your-project/region/api'
});

export default api; 