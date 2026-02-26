import axios from 'axios';

const PROCESSOR_API = import.meta.env.VITE_PROCESSOR_API || 'http://localhost:3002';

export async function fetchSupportedSubtitleFonts() {
  const response = await axios.get(`${PROCESSOR_API}/v1/supported_fonts`);
  return response.data?.fontsByLanguage || {};
}
