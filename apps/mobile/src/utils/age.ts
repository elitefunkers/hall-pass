export function ageFromDateOfBirth(isoDate: string, now: Date = new Date()): number {
  const dob = new Date(`${isoDate}T00:00:00`);
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
