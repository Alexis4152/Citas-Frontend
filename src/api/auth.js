import api from './axios'

export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const me = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const forgotPassword = (data) => api.post('/auth/forgot-password', data)
export const resetPassword = (data) => api.post('/auth/reset-password', data)
export const changePassword = (data) => api.post('/auth/change-password', data)
