import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'elite-rc-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      connected: false,
      message: 'Supabase environment variables are missing. Add SUPABASE_URL and SUPABASE_ANON_KEY.',
    });
  }

  try {
    const { data, error } = await supabase.from('courses').select('id').limit(1);

    if (error && error.code === '42P01') {
      return res.json({
        connected: true,
        message: 'Supabase is connected, but the courses table has not been created yet.',
      });
    }

    if (error) {
      throw error;
    }

    return res.json({
      connected: true,
      message: 'Supabase is connected and responding.',
      sample: data,
    });
  } catch (error) {
    return res.status(500).json({
      connected: false,
      message: error.message,
    });
  }
});

app.get('/api/courses', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Supabase is not configured yet.',
    });
  }

  try {
    const { data, error } = await supabase.from('courses').select('*');

    if (error && error.code === '42P01') {
      return res.json({
        message: 'No courses table yet. Create it in Supabase first.',
        courses: [],
      });
    }

    if (error) {
      throw error;
    }

    res.json({ courses: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
