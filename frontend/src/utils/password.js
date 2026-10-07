// Password rules shared by account settings, Registrar student creation and Admin resets.
// Laravel: the same rules live in a FormRequest (Password::min(8)->letters()->numbers()) and passwords are hashed.
export const MIN_PASSWORD_LENGTH = 8

export const passwordIssue = (password = '') => {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use both letters and numbers.'
  return null
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
const DIGITS = '23456789'
const pick = (chars) => chars[Math.floor(Math.random() * chars.length)]

// Readable one-time password, for example "Kd7mQa4x". Always contains letters and digits.
export const generateTemporaryPassword = () => {
  const chars = [pick(LETTERS), pick(DIGITS), ...Array.from({ length: 6 }, () => pick(LETTERS + DIGITS))]
  return chars.sort(() => Math.random() - 0.5).join('')
}


