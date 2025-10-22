const https = require('https');
const fs = require('fs');

// USDA FoodData Central API configuration
const API_KEY = 'DEMO_KEY'; // You can get a free API key from https://fdc.nal.usda.gov/api-guide.html
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Food categories and their corresponding FDC food group IDs
const FOOD_CATEGORIES = {
  'Protein': [1500, 1501, 1502, 1503, 1504, 1505], // Meat, poultry, fish, eggs, dairy
  'Grains': [2000, 2001, 2002, 2003], // Cereal grains, pasta, bread
  'Vegetables': [1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1108, 1109, 1110], // All vegetable groups
  'Fruits': [9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009], // All fruit groups
  'Dairy': [1300, 1301, 1302, 1303, 1304, 1305, 1306], // Milk, cheese, yogurt
  'Nuts': [1200, 1201, 1202, 1203, 1204], // Nuts and seeds
  'Legumes': [1600, 1601, 1602, 1603], // Beans, peas, lentils
  'Oils': [4000, 4001, 4002, 4003], // Fats and oils
  'Beverages': [1400, 1401, 1402, 1403, 1404], // Beverages
  'Condiments': [1800, 1801, 1802, 1803, 1804, 1805] // Spices, herbs, condiments
};

// Common food search terms for each category
const SEARCH_TERMS = {
  'Protein': [
    'chicken breast', 'ground beef', 'salmon', 'tuna', 'eggs', 'turkey breast',
    'pork tenderloin', 'beef sirloin', 'cod', 'shrimp', 'lobster', 'crab',
    'lamb', 'veal', 'duck', 'quail', 'bison', 'venison', 'rabbit',
    'greek yogurt', 'cottage cheese', 'mozzarella', 'cheddar', 'swiss',
    'feta', 'ricotta', 'cream cheese', 'sour cream', 'buttermilk'
  ],
  'Grains': [
    'brown rice', 'white rice', 'quinoa', 'oats', 'barley', 'buckwheat',
    'millet', 'amaranth', 'teff', 'spelt', 'kamut', 'farro',
    'whole wheat bread', 'sourdough', 'rye bread', 'pita bread',
    'pasta', 'noodles', 'couscous', 'bulgur', 'wheat berries',
    'cornmeal', 'polenta', 'grits', 'rice noodles', 'soba noodles'
  ],
  'Vegetables': [
    'broccoli', 'spinach', 'kale', 'lettuce', 'carrots', 'celery',
    'onions', 'garlic', 'tomatoes', 'cucumbers', 'bell peppers',
    'mushrooms', 'asparagus', 'green beans', 'peas', 'corn',
    'potatoes', 'sweet potatoes', 'beets', 'radishes', 'turnips',
    'cabbage', 'cauliflower', 'brussels sprouts', 'artichokes',
    'eggplant', 'zucchini', 'squash', 'pumpkin', 'avocado'
  ],
  'Fruits': [
    'apples', 'bananas', 'oranges', 'grapes', 'strawberries', 'blueberries',
    'raspberries', 'blackberries', 'cherries', 'peaches', 'pears',
    'plums', 'apricots', 'pineapple', 'mango', 'papaya', 'kiwi',
    'pomegranate', 'figs', 'dates', 'coconut', 'lemon', 'lime',
    'grapefruit', 'cantaloupe', 'watermelon', 'honeydew', 'cranberries'
  ],
  'Dairy': [
    'whole milk', '2% milk', '1% milk', 'skim milk', 'almond milk',
    'soy milk', 'oat milk', 'coconut milk', 'rice milk', 'hemp milk',
    'greek yogurt', 'regular yogurt', 'kefir', 'cottage cheese',
    'ricotta cheese', 'mozzarella', 'cheddar', 'swiss', 'feta',
    'parmesan', 'cream cheese', 'sour cream', 'butter', 'ghee'
  ],
  'Nuts': [
    'almonds', 'walnuts', 'pecans', 'cashews', 'pistachios', 'hazelnuts',
    'macadamia nuts', 'brazil nuts', 'pine nuts', 'peanuts',
    'sunflower seeds', 'pumpkin seeds', 'sesame seeds', 'chia seeds',
    'flax seeds', 'hemp seeds', 'poppy seeds', 'peanut butter',
    'almond butter', 'cashew butter', 'sunflower butter'
  ],
  'Legumes': [
    'black beans', 'kidney beans', 'navy beans', 'pinto beans', 'lima beans',
    'chickpeas', 'lentils', 'split peas', 'black-eyed peas', 'edamame',
    'soybeans', 'tofu', 'tempeh', 'miso', 'hummus', 'falafel'
  ],
  'Oils': [
    'olive oil', 'coconut oil', 'avocado oil', 'canola oil', 'sunflower oil',
    'safflower oil', 'grapeseed oil', 'walnut oil', 'sesame oil',
    'flaxseed oil', 'hemp oil', 'butter', 'ghee', 'lard', 'tallow'
  ],
  'Beverages': [
    'coffee', 'tea', 'green tea', 'black tea', 'herbal tea',
    'orange juice', 'apple juice', 'grape juice', 'cranberry juice',
    'coconut water', 'sports drinks', 'energy drinks', 'soda',
    'beer', 'wine', 'spirits', 'water', 'sparkling water'
  ],
  'Condiments': [
    'salt', 'pepper', 'garlic powder', 'onion powder', 'paprika',
    'cumin', 'oregano', 'basil', 'thyme', 'rosemary', 'sage',
    'cinnamon', 'nutmeg', 'ginger', 'turmeric', 'cayenne',
    'mustard', 'ketchup', 'mayonnaise', 'hot sauce', 'soy sauce',
    'vinegar', 'balsamic vinegar', 'honey', 'maple syrup', 'agave'
  ]
};

async function fetchFoodData(searchTerm, category) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(searchTerm)}&pageSize=10&sortBy=dataType&sortOrder=asc`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function extractNutritionData(food) {
  const nutrients = food.foodNutrients || [];
  
  // Find specific nutrients
  const calories = nutrients.find(n => n.nutrient?.name === 'Energy')?.amount || 0;
  const protein = nutrients.find(n => n.nutrient?.name === 'Protein')?.amount || 0;
  const carbs = nutrients.find(n => n.nutrient?.name === 'Carbohydrate, by difference')?.amount || 0;
  const fat = nutrients.find(n => n.nutrient?.name === 'Total lipid (fat)')?.amount || 0;
  const fiber = nutrients.find(n => n.nutrient?.name === 'Fiber, total dietary')?.amount || 0;
  
  return {
    calories: Math.round(calories * 100) / 100,
    protein: Math.round(protein * 100) / 100,
    carbs: Math.round(carbs * 100) / 100,
    fat: Math.round(fat * 100) / 100,
    fiber: Math.round(fiber * 100) / 100
  };
}

function generateSQLInsert(foods, category) {
  let sql = `-- ${category} Foods\n`;
  sql += `INSERT INTO public.foods (name, brand, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, fiber, category) \n`;
  sql += `SELECT * FROM (VALUES\n`;
  
  const values = foods.map(food => {
    const nutrition = extractNutritionData(food);
    const name = food.description.replace(/'/g, "''"); // Escape single quotes
    const brand = food.brandOwner ? food.brandOwner.replace(/'/g, "''") : 'USDA';
    
    return `('${name}', '${brand}', 100, 'g', ${nutrition.calories}, ${nutrition.protein}, ${nutrition.carbs}, ${nutrition.fat}, ${nutrition.fiber}, '${category}')`;
  }).join(',\n');
  
  sql += values;
  sql += `\n) AS new_foods(name, brand, serving_size, serving_unit, calories_per_serving, protein, carbs, fat, fiber, category)\n`;
  sql += `WHERE NOT EXISTS (\n`;
  sql += `    SELECT 1 FROM public.foods \n`;
  sql += `    WHERE foods.name = new_foods.name\n`;
  sql += `);\n\n`;
  
  return sql;
}

async function generateExtensiveFoodDatabase() {
  console.log('🚀 Starting extensive USDA food database generation...');
  
  let allSQL = `-- Extensive USDA Food Database Import\n`;
  allSQL += `-- Generated on ${new Date().toISOString()}\n\n`;
  
  let totalFoods = 0;
  
  for (const [category, searchTerms] of Object.entries(SEARCH_TERMS)) {
    console.log(`\n📦 Processing ${category}...`);
    
    let categoryFoods = [];
    
    for (const searchTerm of searchTerms) {
      try {
        console.log(`  🔍 Searching for: ${searchTerm}`);
        const data = await fetchFoodData(searchTerm, category);
        
        if (data.foods && data.foods.length > 0) {
          // Filter for foods with complete nutrition data
          const validFoods = data.foods.filter(food => {
            const nutrition = extractNutritionData(food);
            return nutrition.calories > 0 && nutrition.protein >= 0 && nutrition.carbs >= 0 && nutrition.fat >= 0;
          });
          
          categoryFoods.push(...validFoods.slice(0, 3)); // Take top 3 results per search term
          console.log(`    ✅ Found ${validFoods.length} valid foods`);
        }
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`    ❌ Error searching for ${searchTerm}:`, error.message);
      }
    }
    
    // Remove duplicates based on name
    const uniqueFoods = categoryFoods.filter((food, index, self) => 
      index === self.findIndex(f => f.description === food.description)
    );
    
    if (uniqueFoods.length > 0) {
      allSQL += generateSQLInsert(uniqueFoods, category);
      totalFoods += uniqueFoods.length;
      console.log(`  📊 Added ${uniqueFoods.length} unique ${category} foods`);
    }
  }
  
  // Add summary
  allSQL += `-- Summary\n`;
  allSQL += `SELECT \n`;
  allSQL += `    'Extensive food database import completed!' as status,\n`;
  allSQL += `    COUNT(*) as total_foods,\n`;
  allSQL += `    COUNT(CASE WHEN fiber > 0 THEN 1 END) as foods_with_fiber,\n`;
  allSQL += `    COUNT(DISTINCT category) as categories\n`;
  allSQL += `FROM public.foods;\n\n`;
  
  allSQL += `-- Category breakdown\n`;
  allSQL += `SELECT category, COUNT(*) as count \n`;
  allSQL += `FROM public.foods \n`;
  allSQL += `GROUP BY category \n`;
  allSQL += `ORDER BY count DESC;\n`;
  
  // Write to file
  fs.writeFileSync('database-extensive-usda-foods.sql', allSQL);
  
  console.log(`\n🎉 Generated extensive food database!`);
  console.log(`📁 File: database-extensive-usda-foods.sql`);
  console.log(`📊 Estimated total foods: ${totalFoods}`);
  console.log(`\n💡 Run this SQL file in your Supabase database to import hundreds of foods!`);
}

// Run the generator
generateExtensiveFoodDatabase().catch(console.error);
