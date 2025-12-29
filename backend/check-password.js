import bcrypt from 'bcryptjs';

// Hash dal database
const hash = '$2a$12$Rh1y7yfM2LZxg.9.3urTH.WVhl.mYjjUOAZT9TOHwCxodBLe0vgNe';
const password = 'Admin123!';

bcrypt.compare(password, hash).then(result => {
  console.log('Password "Admin123!" matches hash:', result);
  process.exit(0);
});
