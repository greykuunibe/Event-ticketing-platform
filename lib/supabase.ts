import { createClient } from '@supabase/supabase-js'
import { getServerEnv } from './env'

const supabaseUrl = getServerEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseKey = getServerEnv('SUPABASE_SERVICE_ROLE_KEY')

export const supabase = createClient(supabaseUrl, supabaseKey)

