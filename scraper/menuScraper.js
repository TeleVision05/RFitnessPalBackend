const puppeteer = require('puppeteer');

function parseServingSize(servingSizeText) {
  const match = servingSizeText?.match(/([\d.]+)\s*(.*)/);
  if (!match) return { size: null, unit: null };
  return {
    size: parseFloat(match[1]),
    unit: match[2].trim()
  };
}

const scrapeMenu = async (locationName, locationNum) => {
//   console.log(`Scraping menu for ${locationName} (${locationNum})...`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = 'https://foodpro.ucr.edu/foodpro/shortmenu.aspx';
  const params = new URLSearchParams({
    sName: 'University of California, Riverside Dining Services',
    locationNum,
    locationName,
    naFlag: '1',
  });

  const url = `${baseUrl}?${params.toString()}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h3'); // Wait for meal headers to load


  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i) {
    msg.args()[i].jsonValue().then(value => console.log(`PAGE LOG [${i}]:`, value));
    }
});

  // Get all meal sections and their menu items
  const meals = await page.evaluate(() => {
    const mealHeaders = Array.from(document.querySelectorAll('h3'))
      .filter(h3 => ['Breakfast', 'Lunch', 'Dinner'].includes(h3.textContent.trim()));
    
    return mealHeaders.map(h3 => {
      const mealName = h3.textContent.trim();
      const itemsTable = h3.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.nextElementSibling.firstElementChild.firstElementChild.firstElementChild;
      const items = [];
      
      Array.from(itemsTable.children).forEach(child => {
        if (child.classList.contains('shortmenuItemRow')) {
            const links = child.querySelectorAll('a');
            
            const allergens = []
            const allergies = child.querySelectorAll('img.menuIcon');
            allergies.forEach((el) => {
                // allergens.push(i);
                allergens.push(el.alt);
            });
            

            links.forEach(link => {
              items.push({ name: link.textContent.trim(), allergens: allergens, href: link.href });
            });
            
            // const allergies = child.firstElementChild.firstElementChild.lastElementChild.children;
            

            // Array.from(allergies).forEach((el) => {
            //     allergens.push(el.alt);
            // });
        }
      });

      return { mealName, items };
    });
  });

  // Loop through every menu item and get detailed nutrition info
  for (const meal of meals) {
    for (const item of meal.items) {
        try {
            const itemPage = await browser.newPage();
            await itemPage.goto(item.href, { waitUntil: 'networkidle2' });

            itemPage.on('console', msg => {
                for (let i = 0; i < msg.args().length; ++i) {
                msg.args()[i].jsonValue().then(value => console.log(`PAGE LOG [${i}]:`, value));
                }
            });
            
            const nutrition = await itemPage.evaluate(() => {
                
            //   const getVal = (label) => {
            //     const row = Array.from(document.querySelectorAll('table tr')).find(tr => {
            //       const td = tr.querySelector('td');
            //       return td && td.textContent.trim() === label;
            //     });
            //     return row ? row.children[1].textContent.trim() : null;
            //   };

            //   const getTextAfterBold = (label) => {
            //     const boldTags = Array.from(document.querySelectorAll('b'));
            //     for (const b of boldTags) {
            //       if (b.textContent.includes(label)) {
            //         return b.parentElement.textContent.replace(`${label}:`, '').trim();
            //       }
            //     }
            //     return '';
            // Use console.log to debug in the browser context
            

                const nutritionElements = document.querySelectorAll('span.nutfactstopnutrient');
                if (!nutritionElements || nutritionElements.length === 0) {
                    // console.log('No nutrition information found, skipping...');
                    return null; // Skip this iteration
                }

                const ingredientsString = document.querySelectorAll('span.labelingredientsvalue')[0].textContent.trim();
            //   console.log('Nutrition Elements:', Array.from(nutritionElements).map(el => el.textContent.trim()));

            //   return {
            //     calories: getVal('Calories'),
            //     servingSize: getVal('Serving Size'),
            //     fat: getVal('Total Fat'),
            //     cholesterol: getVal('Cholesterol'),
            //     sodium: getVal('Sodium'),
            //     carbohydrates: getVal('Total Carbohydrate'),
            //     protein: getVal('Protein'),
            //     ingredients: getTextAfterBold('INGREDIENTS'),
            //     allergens: getTextAfterBold('ALLERGENS').split(',').map(a => a.trim()).filter(Boolean),
            //   };

                return {
                    calories: parseFloat(document.querySelectorAll('td.nutfactscaloriesval')[0].textContent),
                    servingSize: parseFloat(eval(document.querySelectorAll('div.nutfactsservsize')[1].textContent.trim().split(' ')[0])),
                    servingUnit: document.querySelectorAll('div.nutfactsservsize')[1].textContent.trim().split(/ (.+)/)[1],
                    fat: parseFloat(Array.from(nutritionElements).find(element => element.textContent.includes('Total Fat')).textContent.split('\u00A0')[1].slice(0, -1)),
                    cholesterol: parseFloat(Array.from(nutritionElements).find(element => element.textContent.includes('Cholesterol')).textContent.split('\u00A0')[1].slice(0, -2)),
                    sodium: parseFloat(Array.from(nutritionElements).find(element => element.textContent.includes('Sodium')).textContent.split('\u00A0')[1].slice(0, -2)),
                    carbohydrates: parseFloat(Array.from(nutritionElements).find(element => element.textContent.includes('Total Carbohydrate')).textContent.split('\u00A0')[1].slice(0, -1)),
                    protein: parseFloat(Array.from(nutritionElements).find(element => element.textContent.includes('Protein')).textContent.split('\u00A0')[1].slice(0, -1)),
                    ingredients: ingredientsString,
                };
            });

            // const { size, unit } = parseServingSize(nutrition.servingSize);
            // Object.assign(item, {
            //   calories: parseInt(nutrition.calories) || null,
            //   servingSize: size,
            //   servingUnit: unit,
            //   fat: nutrition.fat,
            //   cholesterol: nutrition.cholesterol,
            //   sodium: nutrition.sodium,
            //   carbohydrates: nutrition.carbohydrates,
            //   protein: nutrition.protein,
            //   allergens: nutrition.allergens,
            //   ingredients: nutrition.ingredients
            // });
            if (!nutrition) {
                // console.log(`Skipping ${item.name} due to missing nutrition information.`);
                await itemPage.close();
                meal.items = meal.items.filter(i => i !== item);
                continue; // Skip this iteration
            }
            else {
                // Print nutrition
                console.log(`Serving sie: ${nutrition.servingSize} ${nutrition.servingUnit}`);
            }
            Object.assign(item, {
                calories: nutrition.calories,
                servingSize: nutrition.servingSize,
                servingUnit: nutrition.servingUnit,
                fat: nutrition.fat,
                cholesterol: nutrition.cholesterol,
                sodium: nutrition.sodium,
                carbohydrates: nutrition.carbohydrates,
                protein: nutrition.protein,
                ingredients: nutrition.ingredients
            });

            delete item.href; // Optional: remove the href
            await itemPage.close();
        } catch (err) {
            console.error(`Error scraping ${item.name}:`, err);
            // console.error(`Error scraping ${item.name}:`);
        }
    }
  }

  await browser.close();
  return meals;
};

module.exports = { scrapeMenu };
