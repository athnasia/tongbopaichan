import axios from 'axios'

const http = axios.create({
  baseURL: '',
  timeout: 1500,
})

// Unwrap mockjs response envelope: { code, data, message }
http.interceptors.response.use(
  (response) => {
    const { code, data, message } = response.data as { code: number; data: unknown; message?: string }
    if (code !== 200) return Promise.reject(new Error(message ?? 'API error'))
    return { ...response, data }
  },
  (error) => Promise.reject(error),
)

export default http
