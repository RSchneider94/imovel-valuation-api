export function capitalize(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function cleanZipcode(zipcode: string) {
  return zipcode.replace(/\D/g, '');
}
