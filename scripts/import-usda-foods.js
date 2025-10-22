// USDA Food Database Import Script
// This script fetches food data from USDA FoodData Central API
// Run with: node scripts/import-usda-foods.js

const fs = require('fs');
const path = require('path');

// USDA FoodData Central API endpoint
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

// Common food FDC IDs from USDA database
const COMMON_FOODS = [
  // Proteins
  { fdcId: 171077, name: 'Chicken breast, skinless, boneless' },
  { fdcId: 174034, name: 'Ground beef, 80% lean' },
  { fdcId: 175167, name: 'Salmon, Atlantic, farmed' },
  { fdcId: 174270, name: 'Eggs, whole, raw' },
  { fdcId: 170903, name: 'Greek yogurt, plain, nonfat' },
  
  // Grains
  { fdcId: 169320, name: 'Brown rice, long-grain, cooked' },
  { fdcId: 169319, name: 'White rice, long-grain, cooked' },
  { fdcId: 169705, name: 'Oatmeal, old-fashioned, dry' },
  { fdcId: 168917, name: 'Quinoa, cooked' },
  { fdcId: 169664, name: 'Sweet potato, baked' },
  
  // Vegetables
  { fdcId: 170379, name: 'Broccoli, raw' },
  { fdcId: 168462, name: 'Spinach, raw' },
  { fdcId: 170393, name: 'Carrots, raw' },
  { fdcId: 169228, name: 'Bell peppers, red, raw' },
  { fdcId: 170457, name: 'Tomatoes, raw' },
  
  // Fruits
  { fdcId: 173944, name: 'Banana, raw' },
  { fdcId: 171688, name: 'Apple, raw, with skin' },
  { fdcId: 169097, name: 'Orange, raw' },
  { fdcId: 173944, name: 'Strawberries, raw' },
  { fdcId: 173946, name: 'Blueberries, raw' },
  
  // Dairy
  { fdcId: 171265, name: 'Milk, whole, 3.25% fat' },
  { fdcId: 171266, name: 'Milk, 2% reduced fat' },
  { fdcId: 171267, name: 'Milk, nonfat (skim)' },
  { fdcId: 170079, name: 'Cheese, cheddar' },
  
  // Nuts
  { fdcId: 170567, name: 'Almonds, raw' },
  { fdcId: 173757, name: 'Walnuts, raw' },
  { fdcId: 172430, name: 'Peanuts, raw' },
];

async function fetchFoodData(fdcId) {
  try {
    const response = await fetch(`${USDA_API_BASE}/food/${fdcId}?api_key=DEMO_KEY`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching food ${fdcId}:`, error);
    return null;
  }
}

function extractNutritionData(foodData) {
  if (!foodData || !foodData.foodNutrients) return null;
  
  const nutrients = {};
  foodData.foodNutrients.forEach(nutrient => {
    if (nutrient.nutrient) {
      const name = nutrient.nutrient.name.toLowerCase();
      const amount = nutrient.amount || 0;
      
      if (name.includes('energy')) {
        nutrients.calories = amount;
      } else if (name.includes('protein')) {
        nutrients.protein = amount;
      } else if (name.includes('carbohydrate')) {
        nutrients.carbs = amount;
      } else if (name.includes('total lipid') || name.includes('fat')) {
        nutrients.fat = amount;
      }
    }
  });
  
  return {
    name: foodData.description || 'Unknown',
    calories: nutrients.calories || 0,
    protein: nutrients.protein || 0,
    carbs: nutrients.carbs || 0,
    fat: nutrients.fat || 0,
    servingSize: 100,
    servingUnit: 'g'
  };
}

function generateSQL(foods) {
  let sql = `-- USDA Food Database Import
INSERT INTO public.foods (name, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, category) VALUES
`;

  foods.forEach((food, index) => {
    if (food) {
      const category = getCategory(food.name);
      sql += `('${food.name.replace(/'/g, "''")}', ${food.servingSize}, '${food.servingUnit}', ${food.calories}, ${food.protein}, ${food.carbs}, ${food.fat}, '${category}')`;
      if (index < foods.length - 1) sql += ',\n';
    }
  });
  
  sql += `
ON CONFLICT DO NOTHING;

SELECT 'USDA Food Database imported successfully! 🍎' as message;
`;
  
  return sql;
}

function getCategory(foodName) {
  const name = foodName.toLowerCase();
  if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('egg') || name.includes('yogurt') || name.includes('cheese')) {
    return 'Protein';
  } else if (name.includes('rice') || name.includes('oatmeal') || name.includes('quinoa') || name.includes('potato') || name.includes('bread')) {
    return 'Grains';
  } else if (name.includes('broccoli') || name.includes('spinach') || name.includes('carrot') || name.includes('pepper') || name.includes('tomato')) {
    return 'Vegetables';
  } else if (name.includes('banana') || name.includes('apple') || name.includes('orange') || name.includes('strawberry') || name.includes('blueberry')) {
    return 'Fruits';
  } else if (name.includes('milk')) {
    return 'Dairy';
  } else if (name.includes('almond') || name.includes('walnut') || name.includes('peanut')) {
    return 'Nuts';
  }
  return 'General';
}

async function main() {
  console.log('🍎 Fetching USDA Food Database...');
  
  const foods = [];
  
  for (const foodRef of COMMON_FOODS) {
    console.log(`Fetching ${foodRef.name}...`);
    const foodData = await fetchFoodData(foodRef.fdcId);
    const nutritionData = extractNutritionData(foodData);
    
    if (nutritionData) {
      foods.push(nutritionData);
      console.log(`✅ ${nutritionData.name}: ${nutritionData.calories} cal`);
    }
    
    // Add delay to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const sql = generateSQL(foods);
  
  // Write SQL file
  const outputPath = path.join(__dirname, '..', 'database-usda-api-import.sql');
  fs.writeFileSync(outputPath, sql);
  
  console.log(`\n✅ Generated SQL file: ${outputPath}`);
  console.log(`📊 Imported ${foods.length} foods from USDA database`);
  console.log('\n🚀 Run the generated SQL file in Supabase to import the foods!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchFoodData, extractNutritionData };
