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
      const primaryColor = '#121212';
      const secondaryColor = '#DAA520';
      const textColor = '#333333';
      const lightCardBg = '#FAF9F6';
      const borderColor = '#EAEAEA';

      // --- COVER PAGE ---
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      
      // Draw Gold Accent Geometric Shapes in Background
      doc.moveTo(doc.page.width - 120, 0)
         .lineTo(doc.page.width, 0)
         .lineTo(doc.page.width, 220)
         .closePath()
         .fill(secondaryColor);

      doc.moveTo(0, doc.page.height)
         .lineTo(0, doc.page.height - 180)
         .lineTo(180, doc.page.height)
         .closePath()
         .fill(secondaryColor);

      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(1.5)
         .strokeColor(secondaryColor)
         .stroke();

      doc.fillColor('#FFFFFF').fontSize(38).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 240, { align: 'center', characterSpacing: 2 });
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('FUEL YOUR BEST SELF', 50, 285, { align: 'center', characterSpacing: 4 });
      
      doc.rect(180, 310, doc.page.width - 360, 3).fill(secondaryColor);

      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text(`GENERAL DIET GUIDE - TYPE ${type}`, 50, 340, { align: 'center', characterSpacing: 1 });
      doc.fillColor('#CCCCCC').fontSize(11).font('Helvetica').text('Individualized Food Profiles & Nutrition Principles', 50, 380, { align: 'center' });
      
      doc.fillColor('#888888').fontSize(9)
         .text('This is a complimentary general handbook provided by Zin Nutrition.', 50, 480, { align: 'center' })
         .text('For fully customized calories & macro counts, purchase our Personalized 4-Week Meal Plan.', 50, 500, { align: 'center' });

      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('SCIENCE  •  PERSONALIZATION  •  TRUST', 50, 715, { align: 'center', characterSpacing: 2.5 });

      // Page Break
      doc.addPage();
      const drawHeader = () => {
        doc.rect(0, 0, doc.page.width, 44).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 18, { characterSpacing: 1 });
        doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold').text(`GENERAL DIET - BLOOD TYPE ${type}`, doc.page.width - 250, 18, { align: 'right', characterSpacing: 1 });
        doc.rect(0, 44, doc.page.width, 2).fill(secondaryColor);
      };
      drawHeader();

      let y = 75;
      const checkSpace = (neededHeight) => {
        if (y + neededHeight > 730) {
          doc.addPage();
          drawHeader();
          y = 75;
        }
      };

      const drawSectionTitle = (titleText) => {
        checkSpace(35);
        doc.rect(50, y, 4, 18).fill(secondaryColor);
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(titleText, 62, y);
        y += 28;
      };
      
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
            'Fruits: Apples, Bananas, Blueberries, Grapes, Cherries',
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

      // Draw Profile Summary Box
      drawSectionTitle('Dietary Profile Summary');
      const profileHeight = doc.heightOfString(info.profile, { width: doc.page.width - 120, lineGap: 2 });
      checkSpace(profileHeight + 25);
      
      doc.rect(50, y, doc.page.width - 100, profileHeight + 15).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, profileHeight + 15).lineWidth(0.5).strokeColor(borderColor).stroke();
      
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(info.profile, 60, y + 8, { width: doc.page.width - 120, lineGap: 2 });
      y += profileHeight + 35;

      // Draw Highly Beneficial List
      drawSectionTitle('Highly Beneficial Foods (Act as Medicine)');
      info.beneficial.forEach(item => {
        const itemHeight = doc.heightOfString(`• ${item}`, { width: doc.page.width - 130 });
        checkSpace(itemHeight + 10);
        
        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).lineWidth(0.5).strokeColor(borderColor).stroke();
        
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`• ${item}`, 65, y + 4, { width: doc.page.width - 130 });
        y += itemHeight + 12;
      });
      y += 10;

      // Draw Neutral Foods
      drawSectionTitle('Neutral Foods (Standard Fuel)');
      info.neutral.forEach(item => {
        const itemHeight = doc.heightOfString(`• ${item}`, { width: doc.page.width - 130 });
        checkSpace(itemHeight + 10);

        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).lineWidth(0.5).strokeColor(borderColor).stroke();

        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(`• ${item}`, 65, y + 4, { width: doc.page.width - 130 });
        y += itemHeight + 12;
      });
      y += 15;

      // Draw Avoid Foods (Warning Red Box)
      checkSpace(135);
      doc.rect(50, y, doc.page.width - 100, 115).fill('#FFF0F2').strokeColor('#F5C6CB').stroke();
      doc.fillColor('#721C24').fontSize(11).font('Helvetica-Bold').text('FOODS TO STRICTLY AVOID (Act as Toxin)', 65, y + 10);
      
      let itemY = y + 28;
      info.avoid.forEach(item => {
        doc.fillColor('#721C24').fontSize(9.5).font('Helvetica').text(`• ${item}`, 70, itemY, { width: doc.page.width - 140 });
        itemY += 16;
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
      const primaryColor = '#121212';
      const secondaryColor = '#DAA520';
      const textColor = '#333333';
      const lightCardBg = '#FAF9F6';
      const borderColor = '#EAEAEA';

      // Cover Page
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      
      // Draw Gold Accent Geometric Shapes in Background
      doc.moveTo(doc.page.width - 120, 0)
         .lineTo(doc.page.width, 0)
         .lineTo(doc.page.width, 220)
         .closePath()
         .fill(secondaryColor);

      doc.moveTo(0, doc.page.height)
         .lineTo(0, doc.page.height - 180)
         .lineTo(180, doc.page.height)
         .closePath()
         .fill(secondaryColor);

      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(1.5)
         .strokeColor(secondaryColor)
         .stroke();

      doc.fillColor('#FFFFFF').fontSize(38).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 240, { align: 'center', characterSpacing: 2 });
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('FUEL YOUR BEST SELF', 50, 285, { align: 'center', characterSpacing: 4 });
      
      doc.rect(180, 310, doc.page.width - 360, 3).fill(secondaryColor);

      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text(`GENERAL WORKOUT HANDBOOK - ${targetGoal.toUpperCase()}`, 50, 340, { align: 'center', characterSpacing: 1 });
      doc.fillColor('#CCCCCC').fontSize(11).font('Helvetica').text('Basic Splits, Warm-up Guidelines & Workout Methods', 50, 380, { align: 'center' });
      
      doc.fillColor('#888888').fontSize(9)
         .text('This is a complimentary general handbook provided by Zin Nutrition.', 50, 480, { align: 'center' })
         .text('For a fully customized calendar split, purchase our Personalized Coaching Program.', 50, 500, { align: 'center' });

      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('SCIENCE  •  PERSONALIZATION  •  TRUST', 50, 715, { align: 'center', characterSpacing: 2.5 });

      // Page Break
      doc.addPage();
      const drawHeader = () => {
        doc.rect(0, 0, doc.page.width, 44).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('ZIN NUTRITION', 50, 18, { characterSpacing: 1 });
        doc.fillColor(secondaryColor).fontSize(9).font('Helvetica-Bold').text(`GENERAL WORKOUT - ${targetGoal.toUpperCase()}`, doc.page.width - 250, 18, { align: 'right', characterSpacing: 1 });
        doc.rect(0, 44, doc.page.width, 2).fill(secondaryColor);
      };
      drawHeader();

      let y = 75;
      const checkSpace = (neededHeight) => {
        if (y + neededHeight > 730) {
          doc.addPage();
          drawHeader();
          y = 75;
        }
      };

      const drawSectionTitle = (titleText) => {
        checkSpace(35);
        doc.rect(50, y, 4, 18).fill(secondaryColor);
        doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(titleText, 62, y);
        y += 28;
      };

      // Draw standard guidelines
      drawSectionTitle('Standard Training Splits');

      const splits = [
        'Day 1: Upper Body Focus (Chest, Back, Shoulders, Arms) - 3 sets per exercise, 10-12 reps.',
        'Day 2: Rest & Hydration Recovery.',
        'Day 3: Lower Body Focus (Quads, Hamstrings, Glutes, Calves) - 3 sets per exercise, 8-12 reps.',
        'Day 4: Rest & Active Recovery (Light walking/stretching).',
        'Day 5: Full Body Functional Movement - Focus on core, strength, and stamina.',
        'Day 6 & 7: Weekend Rest & Recuperation.'
      ];

      splits.forEach(line => {
        const lineVal = `• ${line}`;
        const lineLengthHeight = doc.heightOfString(lineVal, { width: doc.page.width - 120 });
        checkSpace(lineLengthHeight + 10);
        
        doc.rect(50, y, doc.page.width - 100, lineLengthHeight + 6).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, lineLengthHeight + 6).lineWidth(0.5).strokeColor(borderColor).stroke();
        
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(lineVal, 60, y + 4, { width: doc.page.width - 120, lineGap: 2 });
        y += lineLengthHeight + 12;
      });
      y += 10;

      // Warm-up
      drawSectionTitle('Warm-up Protocol');
      const warmUpText = 'Spend 5-10 minutes preparing your body. Use dynamic stretches (e.g. arm circles, leg swings, hip openers) and light bodyweight movements. Do not perform static stretching before lifts, as it decreases muscle power output.';
      const warmUpHeight = doc.heightOfString(warmUpText, { width: doc.page.width - 120, lineGap: 2 });
      checkSpace(warmUpHeight + 25);
      
      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 15).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 15).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(warmUpText, 60, y + 8, { width: doc.page.width - 120, lineGap: 2 });
      y += warmUpHeight + 35;

      // Progressive Overload
      drawSectionTitle('Progressive Overload Principle');
      const progressText = 'To see changes in strength and body composition, you must gradually increase stress on the muscles. Try to add 1 more rep or slightly increase the load (1-2 kg) each week for your major exercises.';
      const progressHeight = doc.heightOfString(progressText, { width: doc.page.width - 120, lineGap: 2 });
      checkSpace(progressHeight + 25);

      doc.rect(50, y, doc.page.width - 100, progressHeight + 15).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, progressHeight + 15).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(progressText, 60, y + 8, { width: doc.page.width - 120, lineGap: 2 });
      y += progressHeight + 35;

      // Cool-down
      drawSectionTitle('Cool-down & Recovery');
      const coolDownText = 'Conclude with 5-10 minutes of slow walking and static stretches targeting the muscles trained. Prioritize 7-8 hours of sleep and keep protein intake at 1.6-2g per kg of bodyweight.';
      const coolDownHeight = doc.heightOfString(coolDownText, { width: doc.page.width - 120, lineGap: 2 });
      checkSpace(coolDownHeight + 25);

      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 15).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 15).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(coolDownText, 60, y + 8, { width: doc.page.width - 120, lineGap: 2 });

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
