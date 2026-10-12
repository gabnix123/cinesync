const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

async function readUsers() {
  const data = await fs.readFile(DB_PATH, 'utf8');
  return JSON.parse(data);
}

async function writeUsers(users) {
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2));
}

async function getUserByEmail(email) {
  const users = await readUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

async function getUserById(id) {
  const users = await readUsers();
  return users.find(u => u.id === id);
}

async function createUser(userData) {
  const users = await readUsers();
  const existing = await getUserByEmail(userData.email);
  if (existing) {
    throw new Error('User already exists');
  }
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = {
    id: Date.now() + Math.random(), // simple ID generation; consider using uuid later
    email: userData.email,
    password_hash: hashedPassword,
    email_verified_at: null,
    email_verification_token: null,
    password_reset_token: null,
    password_reset_expires: null,
    terms_accepted_at: null,
    terms_version: null,
    marketing_opt_in: false,
    age_confirmed: false,
    created_at: new Date(),
    updated_at: new Date(),
  };
  users.push(newUser);
  await writeUsers(users);
  // Return user without password hash
  const { password_hash, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

async function updateUser(id, updates) {
  const users = await readUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) throw new Error('User not found');
  const updated = { ...users[index], ...updates, updated_at: new Date() };
  users[index] = updated;
  await writeUsers(users);
  // Return without password hash
  const { password_hash, ...userWithoutPassword } = updated;
  return userWithoutPassword;
}

async function deleteUser(id) {
  let users = await readUsers();
  const initialLength = users.length;
  users = users.filter(u => u.id !== id);
  if (users.length === initialLength) throw new Error('User not found');
  await writeUsers(users);
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};