const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock user data - replace with database in production
let users = [{
  id: '1',
  email: 'admin@example.com',
  password: bcrypt.hashSync('password', 8),
  role: 'admin'
}];

const register = async (req, res) => {
  const { email, password, role } = req.body;
  
  // Check if user already exists
  const userExists = users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create new user
  const newUser = {
    id: (users.length + 1).toString(),
    email,
    password: bcrypt.hashSync(password, 8),
    role: role || 'user'
  };

  users.push(newUser);
  res.status(201).json({ message: 'User created successfully' });
};


const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password);
  if (!passwordIsValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  const token = generateToken(user);
  res.json({ token });
};

const refreshToken = (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newToken = generateToken(user);
    res.json({ token: newToken });
  });
};

module.exports = {
  login,
  refreshToken,
  register
};
