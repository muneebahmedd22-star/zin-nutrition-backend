const PDFDocument = require('pdfkit');

/**
 * Generate a standard General Diet PDF guide based on Blood Type
 * @param {string} bloodType - Blood Type (O, A, B, AB)
 * @returns {Promise<Buffer>} - PDF Buffer
 */
function generateGeneralDietPDF(bloodType) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const type = (bloodType || 'O').toUpperCase().trim();

      // Brand colors
      const primaryColor = '#111111';
      const secondaryColor = '#DAA520';
      const textColor = '#333333';

      // Cover Page
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 180, { align: 'center' });
      doc.fillColor(secondaryColor).fontSize(16).text(`GENERAL DIET GUIDE - BLOOD TYPE ${type}`, 50, 220, { align: 'center' });
      doc.fillColor('#CCCCCC').fontSize(11).font('Helvetica').text('Individualized Food Profiles & Nutrition Principles', 50, 245, { align: 'center' });
      
      doc.fillColor('#888888').fontSize(9)
         .text('This is a complimentary general handbook provided by Zin Nutrition.', 50, 500, { align: 'center' })
         .text(`For fully customized calories & macro counts, purchase our Personalized 4-Week Meal Plan.`, 50, 520, { align: 'center' });

      // Page Break
      doc.addPage();
      const drawHeader = () => {
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(`ZIN NUTRITION - TYPE ${type} DIET GUIDELINES`, 50, 30);
        doc.strokeColor(secondaryColor).lineWidth(1).moveTo(50, 45).lineTo(doc.page.width - 50, 45).stroke();
      };
      drawHeader();

      let y = 65;
      
      // Guidelines mapping
      const dietGuidelines = {
        'O': {
          profile: 'Type O individuals digest animal proteins highly effectively due to high stomach acid. The diet focuses heavily on lean meats, seafood, healthy oils, and fresh vegetables while strictly avoiding wheat and dairy.',
          beneficial: [
            'Meats: Beef, Lamb, Venison, Buffalo, Mutton',
            'Seafood: Cod, Mackerel, Trout, Snapper, Bass, Halibut',
            'Veggies: Spinach, Broccoli, Kale, Collard greens',
            'Fruits: Bananas, Blueberries, Cherries, Figs, Plums'
          ],
          neutral: [
            'Meats: Chicken, Turkey, Duck, Goat',
            'Seafood: Salmon, Tuna, Shrimp, Lobster',
            'Dairy/Eggs: Butter, Ghee, Pecorino cheese, Eggs',
            'Grains: Rice, Oats, Amaranth, Quinoa'
          ],
          avoid: [
            'Avoid Meats: Pork, Ham, Bacon',
            'Avoid Dairy: Cow\'s Milk, Cheddar, Yogurt, Ice Cream',
            'Avoid Grains: Wheat products, Corn, Barley, Gluten',
            'Avoid Fruits/Veg: Cauliflower, Potatoes, Eggplant, Oranges, Avocado, Coconut'
          ]
        },
        'A': {
          profile: 'Type A individuals flourish on vegetarian or plant-based diets. They have low stomach acid levels and digest carbohydrates extremely well, requiring a diet high in fresh vegetables, grains, and legumes.',
          beneficial: [
            'Proteins: Soy products, Tofu, Lentils, Black beans',
            'Seafood: Salmon, Cod, Mackerel, Sardines',
            'Veggies: Broccoli, Carrots, Spinach, Garlic, Onions',
            'Grains & Oils: Amaranth, Buckwheat, Olive oil'
          ],
          neutral: [
            'Poultry: Chicken, Turkey (in moderation)',
            'Grains: Oats, Rice, Rye, Spelt',
            'Fruits: Apples, Bananas, Blueberries, Grapes, Peaches',
            'Nuts: Walnuts, Almonds, Pumpkin seeds'
          ],
          avoid: [
            'Avoid Meats: Beef, Pork, Lamb, Venison, Duck',
            'Avoid Dairy: Whole Milk, Ice Cream, Blue Cheese',
            'Avoid Grains: Wheat bran, White flour',
            'Avoid Fruits/Veg: Bananas, Tomatoes, Potatoes, Eggplant, Cabbage'
          ]
        },
        'B': {
          profile: 'Type B individuals have highly balanced digestive systems. They are the only blood type that can fully digest and metabolize a wide variety of dairy products, alongside meats, grains, and green vegetables.',
          beneficial: [
            'Meats: Lamb, Mutton, Goat, Rabbit, Venison',
            'Seafood: Cod, Flounder, Halibut, Salmon, Sardines',
            'Dairy: Goat cheese, Yogurt, Cottage cheese, Mozzarella',
            'Veggies: Broccoli, Cabbage, Carrots, Cauliflower'
          ],
          neutral: [
            'Meats: Beef, Veal, Turkey',
            'Grains: Rice, Oats, Spelt',
            'Fruits: Apples, Bananas, Blueberries, Cherries, Grapes',
            'Nuts: Walnuts, Almonds'
          ],
          avoid: [
            'Avoid Meats: Chicken, Pork, Ham, Bacon, Duck',
            'Avoid Seafood: Lobster, Shrimp, Crab, Octopus',
            'Avoid Grains: Wheat, Rye, Barley, Corn',
            'Avoid Nuts: Peanuts, Sesame seeds, Sunflower seeds'
          ]
        },
        'AB': {
          profile: 'Type AB is evolutionary and rare, combining attributes of both A and B. They have low stomach acid (like Type A) but can tolerate animal proteins (like Type B). Seafood, tofu, dairy, and leafy greens form the core.',
          beneficial: [
            'Proteins: Tofu, Lentils, Salmon, Sardines, Tuna',
            'Dairy: Yogurt, Goat milk, Feta cheese, Sour cream',
            'Veggies: Broccoli, Cauliflower, Cucumber, Leafy greens',
            'Fruits: Cherries, Cranberries, Figs, Grapes, Plums'
          ],
          neutral: [
            'Meats: Turkey, Lamb, Mutton',
            'Grains: Rice, Oats, Rye, Spelt',
            'Fruits: Apples, Peaches, Blueberries, Pears',
            'Oils: Olive oil, Walnut oil'
          ],
          avoid: [
            'Avoid Meats: Chicken, Beef, Pork, Ham, Bacon, Duck',
            'Avoid Seafood: Crab, Lobster, Shrimp, Octopus',
            'Avoid Grains: Corn, Buckwheat, Wheat bran',
            'Avoid Fruits: Bananas, Oranges, Coconut, Mango'
          ]
        }
      };

      const info = dietGuidelines[type] || dietGuidelines['O'];

      // Draw Profile
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Dietary Profile Summary', 50, y);
      y += 20;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(info.profile, 50, y, { width: doc.page.width - 100, lineGap: 3 });
      y += doc.heightOfString(info.profile, { width: doc.page.width - 100 }) + 20;

      // Draw Highly Beneficial List
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Highly Beneficial Foods (Act as Medicine)', 50, y);
      y += 18;
      info.beneficial.forEach(item => {
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`• ${item}`, 60, y);
        y += 15;
      });
      y += 10;

      // Draw Neutral Foods
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Neutral Foods (Standard Fuel)', 50, y);
      y += 18;
      info.neutral.forEach(item => {
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`• ${item}`, 60, y);
        y += 15;
      });
      y += 10;

      // Draw Avoid Foods (Warning Box)
      if (y > 600) { doc.addPage(); drawHeader(); y = 65; }
      doc.rect(50, y, doc.page.width - 100, 100).fill('#F8D7DA').strokeColor('#F5C6CB').stroke();
      doc.fillColor('#721C24').fontSize(11).font('Helvetica-Bold').text('FOODS TO STRICTLY AVOID (Act as Toxin)', 60, y + 8);
      
      let itemY = y + 24;
      info.avoid.forEach(item => {
        doc.fillColor('#721C24').fontSize(9).font('Helvetica').text(`• ${item}`, 70, itemY);
        itemY += 14;
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a standard General Workout PDF guide based on Goal
 * @param {string} goal - Goal (Fat Loss, Muscle Gain, etc.)
 * @returns {Promise<Buffer>} - PDF Buffer
 */
function generateGeneralWorkoutPDF(goal) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const targetGoal = goal || 'Maintenance';
      const primaryColor = '#111111';
      const secondaryColor = '#DAA520';
      const textColor = '#333333';

      // Cover Page
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 180, { align: 'center' });
      doc.fillColor(secondaryColor).fontSize(16).text(`GENERAL WORKOUT HANDBOOK - ${targetGoal.toUpperCase()}`, 50, 220, { align: 'center' });
      doc.fillColor('#CCCCCC').fontSize(11).font('Helvetica').text('Basic Splits, Warm-up Guidelines & Workout Methods', 50, 245, { align: 'center' });
      
      doc.fillColor('#888888').fontSize(9)
         .text('This is a complimentary general handbook provided by Zin Nutrition.', 50, 500, { align: 'center' })
         .text(`For a fully customized calendar split, sets & reps, purchase our Personalized Coaching Program.`, 50, 520, { align: 'center' });

      // Page Break
      doc.addPage();
      const drawHeader = () => {
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text(`ZIN NUTRITION - GENERAL WORKOUT STANDARDS`, 50, 30);
        doc.strokeColor(secondaryColor).lineWidth(1).moveTo(50, 45).lineTo(doc.page.width - 50, 45).stroke();
      };
      drawHeader();

      let y = 65;

      // Draw standard guidelines
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Standard Training Splits', 50, y);
      y += 20;

      const splits = [
        'Day 1: Upper Body Focus (Chest, Back, Shoulders, Arms) - 3 sets per exercise, 10-12 reps.',
        'Day 2: Rest & Hydration Recovery.',
        'Day 3: Lower Body Focus (Quads, Hamstrings, Glutes, Calves) - 3 sets per exercise, 8-12 reps.',
        'Day 4: Rest & Active Recovery (Light walking/stretching).',
        'Day 5: Full Body Functional Movement - Focus on core, strength, and stamina.',
        'Day 6 & 7: Weekend Rest & Recuperation.'
      ];

      splits.forEach(line => {
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`• ${line}`, 50, y, { width: doc.page.width - 100 });
        y += doc.heightOfString(line, { width: doc.page.width - 100 }) + 5;
      });
      y += 10;

      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Warm-up Protocol', 50, y);
      y += 18;
      const warmUpText = 'Spend 5-10 minutes preparing your body. Use dynamic stretches (e.g. arm circles, leg swings, hip openers) and light bodyweight movements. Do not perform static stretching before lifts, as it decreases muscle power output.';
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(warmUpText, 50, y, { width: doc.page.width - 100, lineGap: 3 });
      y += doc.heightOfString(warmUpText, { width: doc.page.width - 100 }) + 15;

      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Progressive Overload Principle', 50, y);
      y += 18;
      const progressText = 'To see changes in strength and body composition, you must gradually increase stress on the muscles. Try to add 1 more rep or slightly increase the load (1-2 kg) each week for your major exercises.';
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(progressText, 50, y, { width: doc.page.width - 100, lineGap: 3 });
      y += doc.heightOfString(progressText, { width: doc.page.width - 100 }) + 15;

      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Cool-down & Recovery', 50, y);
      y += 18;
      const coolDownText = 'Conclude with 5-10 minutes of slow walking and static stretches targeting the muscles trained. Prioritize 7-8 hours of sleep and keep protein intake at 1.6-2g per kg of bodyweight.';
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(coolDownText, 50, y, { width: doc.page.width - 100, lineGap: 3 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateGeneralDietPDF,
  generateGeneralWorkoutPDF
};
