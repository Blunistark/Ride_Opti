import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://myypzqhpbzoiwrpyxcrl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eXB6cWhwYnpvaXdycHl4Y3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzYyMTQsImV4cCI6MjA1NjgxMjIxNH0.7p26u_p7WATcZlpR4JfOaZCOBZBcKoC0pyBlvnlVvK4";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);