const PDFDocument = require('pdfkit');

/**
 * Helper to parse structured notes tag fields
 */
function parseNotes(notesStr) {
  const result = { eat: '', ingredients: '', cooking: '', swap: '', macros: '' };
  if (!notesStr) return result;
  
  const getTagVal = (tag, nextTags) => {
    const startIdx = notesStr.indexOf(tag);
    if (startIdx === -1) return '';
    let endIdx = notesStr.length;
    nextTags.forEach(nextTag => {
      const nextIdx = notesStr.indexOf(nextTag, startIdx);
      if (nextIdx !== -1 && nextIdx < endIdx) {
        endIdx = nextIdx;
      }
    });
    return notesStr.substring(startIdx + tag.length, endIdx).trim();
  };
  
  result.eat = getTagVal('[WHAT_TO_EAT]', ['[INGREDIENTS]', '[COOKING_WAY]', '[SWAP_OPTION]', '[MACROS]']);
  result.ingredients = getTagVal('[INGREDIENTS]', ['[COOKING_WAY]', '[SWAP_OPTION]', '[MACROS]']);
  result.cooking = getTagVal('[COOKING_WAY]', ['[SWAP_OPTION]', '[MACROS]']);
  result.swap = getTagVal('[SWAP_OPTION]', ['[MACROS]']);
  result.macros = getTagVal('[MACROS]', []);
  return result;
}

/**
 * Generate a beautifully styled, branded PDF from the training or diet program data
 * @param {object} programData - Structured program data from Gemini
 * @param {object} profile - Customer assessment answers (first_name, last_name, etc.)
 * @returns {Promise<Buffer>} - Resolved PDF buffer
 */
function generateProgramPDF(programData, profile) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `ZIN NUTRITION - Personalized Manual`,
          Author: 'Zin Nutrition AI'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Brand Palette (Zin Nutrition - Premium Gold & Charcoal)
      const primaryColor = '#121212'; // Charcoal black
      const secondaryColor = '#DAA520'; // Golden accent
      const textColor = '#333333';
      const mutedColor = '#666666';
      const lightCardBg = '#FAF9F6'; // Warm luxury cream
      const borderColor = '#EAEAEA';

      // Detect if this is a Diet/Meal Plan or Workout Program
      let isDietPlan = false;
      const routines = programData.routines || [];
      if (routines.length > 0 && routines[0].exercises && routines[0].exercises.length > 0) {
        const firstEx = routines[0].exercises[0];
        const nameLower = (firstEx.name || '').toLowerCase();
        const repsLower = (firstEx.reps || '').toLowerCase();
        const restLower = (firstEx.rest || '').toLowerCase();
        if (nameLower.includes('meal') || repsLower.includes('kcal') || restLower.includes('am') || restLower.includes('pm')) {
          isDietPlan = true;
        }
      }

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

      // Centered Border Frame
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
         .lineWidth(1.5)
         .strokeColor(secondaryColor)
         .stroke();

      // Brand Title
      doc.fillColor('#FFFFFF')
         .fontSize(38)
         .font('Helvetica-Bold')
         .text('ZIN NUTRITION', 50, 220, { align: 'center', characterSpacing: 2 });
         
      doc.fillColor(secondaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('FUEL YOUR BEST SELF', 50, 265, { align: 'center', characterSpacing: 4 });

      // Clean separator bar
      doc.rect(180, 290, doc.page.width - 360, 3).fill(secondaryColor);

      // Main Guide Type
      const docTypeTitle = isDietPlan ? 'PERSONALIZED DIET & MEAL BLUEPRINT' : 'PERSONALIZED PERFORMANCE MANUAL';
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(docTypeTitle, 50, 320, { align: 'center', characterSpacing: 1 });

      // Customer Info Card Box
      doc.rect(80, 410, doc.page.width - 160, 130).fill('rgba(255, 255, 255, 0.03)');
      doc.rect(80, 410, doc.page.width - 160, 130).lineWidth(0.5).strokeColor('rgba(218, 165, 32, 0.3)').stroke();

      doc.fillColor('#EAEAEA')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('CUSTOM PREPARED FOR', 100, 428, { align: 'center', characterSpacing: 1.5 });
      
      doc.fillColor('#FFFFFF')
         .fontSize(15)
         .text(`${profile.first_name || 'Valued Customer'} ${profile.last_name || ''}`, 100, 448, { align: 'center' });

      doc.fillColor('#CCCCCC')
         .fontSize(11)
         .font('Helvetica')
         .text(`Goal: ${profile.goal || 'General Fitness'}`, 100, 475, { align: 'center' })
         .text(`Blood Group: ${profile.blood_type || 'O'}  |  Date: ${new Date().toLocaleDateString()}`, 100, 495, { align: 'center' });

      // Brand Tagline Footer
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('SCIENCE  •  PERSONALIZATION  •  TRUST', 50, 715, { align: 'center', characterSpacing: 2.5 });

      // Add a page break for the actual program content
      doc.addPage({ margin: 50, size: 'A4' });

      // --- HEADER ON SUBSEQUENT PAGES ---
      const drawHeader = () => {
        doc.rect(0, 0, doc.page.width, 44).fill(primaryColor);
        doc.fillColor('#FFFFFF')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('ZIN NUTRITION', 50, 18, { characterSpacing: 1 });
        doc.fillColor(secondaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text(isDietPlan ? 'PERSONALIZED DIET & MEAL PLAN' : 'PERSONALIZED WORKOUT SPLIT', doc.page.width - 270, 18, { align: 'right', characterSpacing: 1 });
        doc.rect(0, 44, doc.page.width, 2).fill(secondaryColor);
      };
      
      drawHeader();

      // Program Content Starts at y=75
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

      // --- SCIENCE INTRODUCTION MODULE ---
      drawSectionTitle(isDietPlan ? 'The Science of Blood Antigen & Nutrition' : 'Biomechanical Performance Principles');
      
      const scienceText = isDietPlan 
        ? `According to the D'Adamo Blood Type theory, food lectins react biochemically with your specific Blood Antigen profile (${profile.blood_type || 'O'}). When you consume foods incompatible with your antigen markers, it can cause minor systemic inflammation, sluggish metabolism, and digestions challenges. By matching your daily meals with allowed food profiles, we optimize recovery, energy levels, and nutrient distribution needed to support your target of ${profile.goal || 'General Fitness'}.`
        : `Your customized workout program is grounded in progressive mechanical tension and optimal volume targets. For a ${profile.goal || 'General Fitness'} focus, we prioritize biomechanically safe compound movements, ensuring targeted muscle group stimulation without joint overload. Recovery windows, dynamic warming, and tracking variables are mathematically set to adapt to your active physical profile.`;

      const scienceHeight = doc.heightOfString(scienceText, { width: doc.page.width - 100, lineGap: 2 });
      checkSpace(scienceHeight + 20);

      doc.rect(50, y, doc.page.width - 100, scienceHeight + 16).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, scienceHeight + 16).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(scienceText, 60, y + 8, { width: doc.page.width - 120, lineGap: 2 });
      y += scienceHeight + 35;

      // --- 1. WEEKLY SPLIT OVERVIEW ---
      drawSectionTitle(isDietPlan ? '1. Weekly Meal Schedule Overview' : '1. Weekly Workout Split');

      const split = programData.weekly_split || {};
      Object.keys(split).forEach(day => {
        const textDay = `${day}:`;
        const textDesc = split[day];
        const dayDescHeight = doc.heightOfString(textDesc, { width: doc.page.width - 170 });
        
        checkSpace(dayDescHeight + 14);

        doc.rect(50, y, doc.page.width - 100, dayDescHeight + 10)
           .fill(lightCardBg)
           .strokeColor(borderColor)
           .lineWidth(0.5)
           .stroke();

        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(textDay, 60, y + 5, { width: 90 });
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(textDesc, 140, y + 5, { width: doc.page.width - 200 });
        
        y += dayDescHeight + 16;
      });

      y += 15;

      // --- 2. DAILY DETAIL GRID (MEALS OR EXERCISES) ---
      drawSectionTitle(isDietPlan ? '2. Daily Meal Planner & Recipes' : '2. Daily Exercises & Routines');

      routines.forEach(routine => {
        checkSpace(65);
        
        doc.rect(50, y, doc.page.width - 100, 24).fill('#EAEAEA');
        doc.rect(50, y, 4, 24).fill(secondaryColor);
        doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(routine.day_name || (isDietPlan ? 'Meal Schedule' : 'Workout Day'), 62, y + 6);
        y += 32;

        if (routine.exercises && Array.isArray(routine.exercises)) {
          routine.exercises.forEach(ex => {
            if (isDietPlan) {
              // --- DIET PLAN CARD IN PAKISTANI LOCAL STYLE ---
              const notesObj = parseNotes(ex.notes);
              const mealName = ex.name || 'Meal';
              const timingText = `Time: ${ex.rest || 'N/A'}  |  Cal: ${ex.reps || 'N/A'}`;

              // Measure sub-section heights
              const eatText = `What to Eat: ${notesObj.eat || 'Standard Portion'}`;
              const portionText = `Portion Size: ${ex.sets || '1 Serving'}`;
              
              const eatHeight = doc.heightOfString(eatText, { width: doc.page.width - 140 });
              const portionHeight = doc.heightOfString(portionText, { width: doc.page.width - 140 });
              const ingredientsHeight = notesObj.ingredients ? doc.heightOfString(`Ingredients: ${notesObj.ingredients}`, { width: doc.page.width - 140 }) : 0;
              const cookingHeight = notesObj.cooking ? doc.heightOfString(`Preparation & Cooking: ${notesObj.cooking}`, { width: doc.page.width - 140 }) : 0;
              const swapHeight = notesObj.swap ? doc.heightOfString(`Alternative Swap Option: ${notesObj.swap}`, { width: doc.page.width - 140 }) : 0;
              const macrosHeight = notesObj.macros ? doc.heightOfString(`Macros Breakdown: ${notesObj.macros}`, { width: doc.page.width - 140 }) : 0;

              const totalCardHeight = 24 + eatHeight + portionHeight + (ingredientsHeight ? ingredientsHeight + 4 : 0) + (cookingHeight ? cookingHeight + 4 : 0) + (swapHeight ? swapHeight + 4 : 0) + (macrosHeight ? macrosHeight + 4 : 0) + 32;

              checkSpace(totalCardHeight);

              // Gold-accented card wrapper
              doc.rect(50, y, doc.page.width - 100, totalCardHeight - 4).fill(lightCardBg);
              doc.rect(50, y, doc.page.width - 100, totalCardHeight - 4).lineWidth(0.5).strokeColor(borderColor).stroke();
              doc.rect(50, y, 4, totalCardHeight - 4).fill(secondaryColor); // Thick Gold Border strip

              // Header: Meal Name & Timing
              doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(mealName, 65, y + 8, { width: 200 });
              doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(timingText, 275, y + 8, { width: doc.page.width - 325, align: 'right' });
              
              let cardY = y + 26;

              // 1. What to Eat
              doc.fillColor(primaryColor).fontSize(9.5).font('Helvetica-Bold').text('What to Eat: ', 65, cardY, { continued: true });
              doc.font('Helvetica').text(notesObj.eat || 'Standard Portion');
              cardY += eatHeight;

              // 2. Portion Size
              doc.font('Helvetica-Bold').text('Portion Size: ', 65, cardY, { continued: true });
              doc.font('Helvetica').text(ex.sets || '1 Serving');
              cardY += portionHeight;

              // 3. Ingredients
              if (notesObj.ingredients) {
                doc.font('Helvetica-Bold').fillColor('#b8860b').text('Ingredients: ', 65, cardY + 2, { continued: true });
                doc.font('Helvetica').fillColor(textColor).text(notesObj.ingredients);
                cardY += ingredientsHeight + 4;
              }

              // 4. Cooking Method
              if (notesObj.cooking) {
                doc.font('Helvetica-Bold').text('Preparation & Cooking: ', 65, cardY + 2, { continued: true });
                doc.font('Helvetica-Oblique').fillColor(mutedColor).text(notesObj.cooking);
                cardY += cookingHeight + 4;
              }


              // 5. Swap Option
              if (notesObj.swap) {
                doc.font('Helvetica-Bold').fillColor(primaryColor).text('Alternative Swap Option: ', 65, cardY + 2, { continued: true });
                doc.font('Helvetica').fillColor(textColor).text(notesObj.swap);
                cardY += swapHeight + 4;
              }

              // 6. Macros
              if (notesObj.macros) {
                doc.font('Helvetica-Bold').fillColor(secondaryColor).text('Macros Breakdown: ', 65, cardY + 2, { continued: true });
                doc.font('Helvetica-Bold').text(notesObj.macros);
                cardY += macrosHeight + 4;
              }

              y += totalCardHeight + 12; // Extra spacing between meal cards

            } else {
              // --- WORKOUT PROGRAM CARD (STANDARD STYLE) ---
              const stats = `${ex.sets} sets x ${ex.reps} reps  |  Rest: ${ex.rest || '60s'}`;
              const exName = ex.name || 'Exercise';
              
              const exNameHeight = doc.heightOfString(exName, { width: 220 });
              const statsHeight = doc.heightOfString(stats, { width: doc.page.width - 325 });
              const headerHeight = Math.max(exNameHeight, statsHeight);
              
              const notesContent = `Note: ${ex.notes || ''}`;
              const notesHeight = ex.notes ? doc.heightOfString(notesContent, { width: doc.page.width - 140 }) : 0;
              const exTotalHeight = headerHeight + (ex.notes ? notesHeight + 8 : 0) + 16;

              checkSpace(exTotalHeight);

              doc.rect(50, y, doc.page.width - 100, exTotalHeight - 4).fill(lightCardBg);
              doc.rect(50, y, doc.page.width - 100, exTotalHeight - 4).lineWidth(0.5).strokeColor(borderColor).stroke();

              doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(exName, 65, y + 6, { width: 220 });
              doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(stats, 295, y + 6, { width: doc.page.width - 345, align: 'right' });
              
              y += headerHeight + 6;

              if (ex.notes) {
                doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Oblique').text(notesContent, 75, y, { width: doc.page.width - 140 });
                y += notesHeight + 6;
              }
              y += 8;
            }
          });
        }
        y += 15;
      });

      // --- 3. TARGET CALORIES OR WARM-UP ---
      drawSectionTitle(isDietPlan ? '3. Daily Calorie Targets & Fluid Protocols' : '3. Warm-Up & Cool-Down Protocols');

      const warmUpVal = programData.warm_up || '5-10 minutes dynamic stretching.';
      const coolDownVal = programData.cool_down || '5-10 minutes static stretching.';
      const warmUpHeight = doc.heightOfString(warmUpVal, { width: doc.page.width - 120 });
      const coolDownHeight = doc.heightOfString(coolDownVal, { width: doc.page.width - 120 });

      checkSpace(warmUpHeight + coolDownHeight + 110);

      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(isDietPlan ? 'Daily Calories & Macro Targets:' : 'Warm-Up Routine:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(warmUpVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += warmUpHeight + 50;

      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(isDietPlan ? 'Hydration & Grocery List:' : 'Cool-Down Routine:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(coolDownVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += coolDownHeight + 30;

      // --- 4. DIET ADAPTATIONS / COACHING PRINCIPLES ---
      drawSectionTitle(isDietPlan ? '4. Nutrition Coaching Guidelines' : '4. Coaching Guidelines');

      const overloadVal = programData.progressive_overload || 'Increase weight or reps gradually each week.';
      const recoveryVal = programData.recovery || 'Ensure 7-9 hours of sleep and adequate protein intake.';
      const overloadHeight = doc.heightOfString(overloadVal, { width: doc.page.width - 120 });
      const recoveryHeight = doc.heightOfString(recoveryVal, { width: doc.page.width - 120 });

      checkSpace(overloadHeight + recoveryHeight + 110);

      doc.rect(50, y, doc.page.width - 100, overloadHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, overloadHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(isDietPlan ? 'Weekly Diet Adaptation & Portion Control:' : 'Progressive Overload Strategy:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(overloadVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += overloadHeight + 50;

      doc.rect(50, y, doc.page.width - 100, recoveryHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, recoveryHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text(isDietPlan ? 'Blood Type Specific Supplement Protocols:' : 'Recovery Recommendations:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(recoveryVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += recoveryHeight + 30;

      // --- 5. EXPECTED TRANSFORMATION MILESTONE ROADMAP ---
      drawSectionTitle('5. Your 30-Day Transformation Roadmap');
      
      const timelineData = [
        { phase: 'Days 1 - 7: Metabolic Shift', effect: isDietPlan ? 'Water retention reduction, digestive adjustment to target food sources, stabilized blood sugar, and initial clean energy surge.' : 'Central nervous system activation, target movement learning, and initial pump response.' },
        { phase: 'Days 8 - 15: Cellular Reset', effect: isDietPlan ? 'Improved nutrient absorption, reduction in sugar cravings, deeper REM sleep cycles, and clean bowel movement patterns.' : 'Tendon adaptation, strength recovery optimization, and improved cardiovascular stamina.' },
        { phase: 'Days 16 - 21: Visible Adaptation', effect: isDietPlan ? 'Clothing fits better around waist/hips, muscular glycogen storage fullness, and visual scale changes.' : 'Muscular fullness, progressive load capacity increases (lifting heavier), and form automation.' },
        { phase: 'Days 22 - 30: Setpoint Reset', effect: isDietPlan ? 'Metabolism recalibration, sustained fat reduction/muscle growth pattern, and complete habit stabilization.' : 'Visible muscle density increases, physical conditioning base built, ready for cycle progression.' }
      ];

      timelineData.forEach(item => {
        const itemText = `• ${item.phase}\n  ${item.effect}`;
        const itemHeight = doc.heightOfString(itemText, { width: doc.page.width - 120, lineGap: 2.5 });
        checkSpace(itemHeight + 10);

        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, itemHeight + 6).lineWidth(0.5).strokeColor(borderColor).stroke();

        doc.fillColor(secondaryColor).fontSize(9.5).font('Helvetica-Bold').text(item.phase, 65, y + 4);
        doc.fillColor(textColor).fontSize(9.5).font('Helvetica').text(item.effect, 65, y + 16, { width: doc.page.width - 130, lineGap: 2 });
        
        y += itemHeight + 12;
      });
      y += 10;

      // --- 6. PRINTABLE TRACKING SHEET MODULE / GROCERY LIST ---
      if (isDietPlan) {
        drawSectionTitle('6. Weekly Grocery & Market Shopping List');
        const groceryText = `• Proteins: Egg whites, Fresh Cod/Salmon, Skinless Chicken Breast, Greek Yogurt, Tofu, Lentils.\n• Carbohydrates: Oats, Brown Rice, Sweet Potatoes, Quinoa, Gluten-Free grains.\n• Healthy Fats: Virgin Olive Oil, Raw Almonds, Walnuts, Avocados.\n• Allowed Veggies: Broccoli, Spinach, Cucumber, Cauliflower, Leafy Greens.\n• Herbs & Spices: Ginger, Garlic, Olive oil, Green tea.`;
        const groceryHeight = doc.heightOfString(groceryText, { width: doc.page.width - 120, lineGap: 3 });
        
        checkSpace(groceryHeight + 40);
        doc.rect(50, y, doc.page.width - 100, groceryHeight + 25).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, groceryHeight + 25).lineWidth(0.5).strokeColor(borderColor).stroke();
        doc.fillColor(textColor).fontSize(10).font('Helvetica').text(groceryText, 65, y + 12, { width: doc.page.width - 120, lineGap: 3 });
        y += groceryHeight + 40;
      } else {
        drawSectionTitle('6. Printable Progress Tracking Log');
        const trackingHeight = 150;
        checkSpace(trackingHeight + 20);

        doc.rect(50, y, doc.page.width - 100, trackingHeight).fill(lightCardBg);
        doc.rect(50, y, doc.page.width - 100, trackingHeight).lineWidth(0.5).strokeColor(borderColor).stroke();

        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('PRINT & USE AT GYM: PROGRESS LOGGER', 65, y + 10);
        
        let logY = y + 30;
        doc.fillColor(secondaryColor).fontSize(9).text('Exercise Name', 65, logY);
        doc.text('Set 1 (Wt/Reps)', 220, logY);
        doc.text('Set 2 (Wt/Reps)', 320, logY);
        doc.text('Set 3 (Wt/Reps)', 420, logY);
        
        for(let i=0; i<4; i++) {
          logY += 24;
          doc.strokeColor(borderColor).lineWidth(0.5).moveTo(55, logY).lineTo(doc.page.width - 55, logY).stroke();
        }
        y += trackingHeight + 20;
      }

      // --- 7. FAQs MODULE ---
      drawSectionTitle('7. Coaching & Nutrition FAQs');
      const faqText = isDietPlan
        ? `Q: Can I consume coffee or black tea?\nA: Yes, but keep it without sugar or dairy. Black coffee and green tea are highly neutral.\n\nQ: What if I miss a scheduled meal timing?\nA: Do not panic. Simply consume the meal as soon as possible, or distribute the portion sizes into your next meal.\n\nQ: How do I handle dining out / cheat meals?\nA: Focus on ordering allowed proteins like grilled fish or grilled chicken with steamed greens. Avoid wheat and heavy dairy dressings.`
        : `Q: What should I do if I cannot lift the target weight?\nA: Reduce the load slightly to ensure 100% proper form. The quality of contraction always outperforms the weight loaded.\n\nQ: How quickly should I progress weight?\nA: Focus on completing the top rep range (e.g. 12 reps) with full control before increasing the weight in the next week.\n\nQ: How do I manage extreme muscle soreness?\nA: Ensure sleep is above 7.5 hours, dynamic warm-ups are completed, and consume your recommended protein targets.`;
      
      const faqHeight = doc.heightOfString(faqText, { width: doc.page.width - 120, lineGap: 2.5 });
      checkSpace(faqHeight + 35);
      
      doc.rect(50, y, doc.page.width - 100, faqHeight + 20).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, faqHeight + 20).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(textColor).fontSize(9).font('Helvetica').text(faqText, 65, y + 10, { width: doc.page.width - 120, lineGap: 2.5 });
      y += faqHeight + 35;

      // --- 8. SAFETY CALLOUT ---
      const safetyVal = programData.safety_notes || 'Consult your physician before beginning any program.';
      const safetyHeight = doc.heightOfString(safetyVal, { width: doc.page.width - 130 });
      
      checkSpace(safetyHeight + 55);

      doc.rect(50, y, doc.page.width - 100, safetyHeight + 35)
         .fill('#FFFDF2')
         .strokeColor(secondaryColor)
         .lineWidth(1)
         .stroke();

      doc.fillColor('#856404').fontSize(10).font('Helvetica-Bold').text(isDietPlan ? 'FOODS & COMBINATIONS TO STRICTLY AVOID' : 'SAFETY & PRECAUTIONS', 65, y + 8);
      doc.fillColor(textColor).font('Helvetica').text(safetyVal, 65, y + 22, { width: doc.page.width - 130, lineGap: 2 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateProgramPDF
};
