import type { Request, Response } from 'express';
import Admin from '../models/admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const ADMIN_TOKEN_NAME = 'codenvibe_admin_token';
const JWT_SECRET = process.env.JWT_SECRET || 'adminsecret';

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ username, email, password: hashedPassword });
    res.status(201).json({ message: 'Admin registered successfully', admin });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed.' });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required.' });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie(ADMIN_TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
};

export const logoutAdmin = async (req: Request, res: Response) => {
  res.clearCookie(ADMIN_TOKEN_NAME);
  res.json({ message: 'Logout successful' });
};
