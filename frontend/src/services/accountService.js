// Account settings for the signed-in user (every role): change password, edit permitted profile fields
// and change the profile picture. The user always comes from the login token, never from the request.
import { api } from './api'

// PUT /api/account/password   { currentPassword, newPassword }
export const changePassword = ({ currentPassword, newPassword }) => api.put('/account/password', { currentPassword, newPassword })

// PATCH /api/account/profile
// Staff: name, email, contact number. Students: email, contact number, address and emergency contact.
export const updateProfile = (patch) => api.patch('/account/profile', patch)

// POST /api/account/photo   { photo }   (data URL, or null to remove it)
export const updateProfilePhoto = (photo) => api.post('/account/photo', { photo })
