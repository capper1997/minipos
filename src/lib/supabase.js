import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rlpfgnyuqcgxaqjyrsxg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscGZnbnl1cWNneGFxanlyc3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTQxNDAsImV4cCI6MjA4ODEzMDE0MH0.jCRzlFbjJLUKOCo5kaNwwtU3WFhgIVD2yTGWB7BWBbk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
