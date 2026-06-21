const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const indianPhoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const otpRegex = /^\d{6}$/;

export function isValidName(value) {
  return typeof value === 'string' && value.trim().length >= 2;
}

export function isValidEmail(value) {
  return typeof value === 'string' && emailRegex.test(value.trim());
}

export function isValidPhone(value) {
  if (!value) return false;
  return typeof value === 'string' && indianPhoneRegex.test(value.trim());
}

export function isValidPincode(value) {
  return typeof value === 'string' && pincodeRegex.test(value.trim());
}

export function isValidPassword(value) {
  return typeof value === 'string' && passwordRegex.test(value);
}

export function isValidOtp(value) {
  return typeof value === 'string' && otpRegex.test(value.trim());
}

export function isValidAddress(value) {
  return typeof value === 'string' && value.trim().length >= 10;
}

export function isValidSubject(value) {
  return typeof value === 'string' && value.trim().length >= 3;
}

export function isValidMessage(value) {
  return typeof value === 'string' && value.trim().length >= 10;
}

export function authLoginErrors(email, password) {
  const errs = {};
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  if (!password) errs.password = 'Password is required';
  return errs;
}

export function authRegisterErrors({ name, email, password, phone }) {
  const errs = {};
  if (!name?.trim()) errs.name = 'Name is required';
  else if (!isValidName(name)) errs.name = 'Name must be at least 2 characters';
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  if (!password) errs.password = 'Password is required';
  else if (!isValidPassword(password)) errs.password = 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  if (phone?.trim() && !isValidPhone(phone)) errs.phone = 'Provide a valid 10-digit Indian phone number';
  return errs;
}

export function authOtpErrors(otp) {
  const errs = {};
  if (!otp?.trim()) errs.otp = 'OTP code is required';
  else if (!isValidOtp(otp)) errs.otp = 'OTP must be a 6-digit number';
  return errs;
}

export function forgotPasswordErrors(email) {
  const errs = {};
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  return errs;
}

export function resetPasswordErrors({ email, token, password }) {
  const errs = {};
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  if (!token?.trim()) errs.token = 'Reset token is required';
  if (!password) errs.password = 'Password is required';
  else if (!isValidPassword(password)) errs.password = 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  return errs;
}

export function contactFormErrors({ name, email, phone, subject, message }) {
  const errs = {};
  if (!name?.trim()) errs.name = 'Name is required';
  else if (!isValidName(name)) errs.name = 'Name must be at least 2 characters';
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  if (phone?.trim() && !isValidPhone(phone)) errs.phone = 'Provide a valid 10-digit Indian phone number';
  if (!subject?.trim()) errs.subject = 'Subject is required';
  else if (!isValidSubject(subject)) errs.subject = 'Subject must be at least 3 characters';
  if (!message?.trim()) errs.message = 'Message is required';
  else if (!isValidMessage(message)) errs.message = 'Message must be at least 10 characters';
  return errs;
}

export function checkoutShippingErrors(shipping, shippingCharge, shippingChargeError) {
  const errs = {};
  if (!shipping.name?.trim()) errs.name = 'Name is required';
  else if (!isValidName(shipping.name)) errs.name = 'Name must be at least 2 characters';
  if (!shipping.email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(shipping.email)) errs.email = 'Enter a valid email address';
  if (!shipping.phone?.trim()) errs.phone = 'Phone is required';
  else if (!isValidPhone(shipping.phone)) errs.phone = 'Valid 10-digit phone required';
  if (!shipping.address?.trim()) errs.address = 'Address is required';
  else if (!isValidAddress(shipping.address)) errs.address = 'Address must be at least 10 characters';
  if (!shipping.city?.trim()) errs.city = 'City is required';
  if (!shipping.state?.trim()) errs.state = 'State is required';
  if (!shipping.pincode?.trim()) errs.pincode = 'Pincode is required';
  else if (!isValidPincode(shipping.pincode)) errs.pincode = 'Valid 6-digit pincode required';
  if (shippingChargeError) errs.pincode = shippingChargeError;
  else if (shippingCharge == null && !errs.pincode) errs.pincode = 'Delivery charge must be calculated before placing order';
  return errs;
}

export function profileUpdateErrors({ name, email, phone, currentPassword, newPassword }) {
  const errs = {};
  if (!name?.trim()) errs.name = 'Name is required';
  else if (!isValidName(name)) errs.name = 'Name must be at least 2 characters';
  if (!email?.trim()) errs.email = 'Email is required';
  else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
  if (phone?.trim() && !isValidPhone(phone)) errs.phone = 'Valid 10-digit phone required';
  if (newPassword) {
    if (!currentPassword) errs.currentPassword = 'Current password is required to change your password';
    if (!isValidPassword(newPassword)) errs.newPassword = 'Password must be at least 8 characters and include uppercase, lowercase, and a number';
  }
  return errs;
}

export function addressFormErrors({ name, phone, address, city, state, pincode }) {
  const errs = {};
  if (!name?.trim()) errs.name = 'Recipient name is required';
  else if (!isValidName(name)) errs.name = 'Name must be at least 2 characters';
  if (!phone?.trim()) errs.phone = 'Phone is required';
  else if (!isValidPhone(phone)) errs.phone = 'Valid 10-digit phone required';
  if (!address?.trim()) errs.address = 'Address is required';
  else if (!isValidAddress(address)) errs.address = 'Address must be at least 10 characters';
  if (!city?.trim()) errs.city = 'City is required';
  if (!state?.trim()) errs.state = 'State is required';
  if (!pincode?.trim()) errs.pincode = 'Pincode is required';
  else if (!isValidPincode(pincode)) errs.pincode = 'Valid 6-digit pincode required';
  return errs;
}
