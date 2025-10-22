const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://usmemrjcjsexwterrble.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbWVtcmpjanNleHd0ZXJyYmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzU0MzMsImV4cCI6MjA3MzI1MTQzM30.UzFDDdmBrwD-FLqppNHQ15ICnDG9gUfWx-LSNqC_BtM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTableStructure() {
  try {
    console.log('Checking meal_plan_items table structure...')
    
    // Try to insert a minimal record to see what columns are expected
    const { data, error } = await supabase
      .from('meal_plan_items')
      .insert([{
        // Try with minimal data to see what columns exist
      }])
      .select()
    
    if (error) {
      console.log('❌ Insert error (this is expected):', error.message)
      
      // The error message usually tells us what columns are missing or expected
      if (error.message.includes('meal_plan_id')) {
        console.log('✅ meal_plan_id column exists')
      }
      if (error.message.includes('food_id')) {
        console.log('✅ food_id column exists')
      }
      if (error.message.includes('meal_type')) {
        console.log('✅ meal_type column exists')
      }
      if (error.message.includes('quantity')) {
        console.log('✅ quantity column exists')
      }
    } else {
      console.log('✅ Table structure:', data)
    }
    
    // Try to select from table to see what columns we can access
    const { data: selectData, error: selectError } = await supabase
      .from('meal_plan_items')
      .select('*')
      .limit(1)
    
    if (selectError) {
      console.log('❌ Select error:', selectError.message)
    } else {
      console.log('✅ Table accessible, columns:', Object.keys(selectData[0] || {}))
    }
    
  } catch (error) {
    console.log('❌ General error:', error.message)
  }
}

checkTableStructure()
