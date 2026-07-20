const PDFDocument = require('pdfkit');

/**
 * Generate a beautifully styled, branded PDF from the training program data
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
          Title: `ZIN NUTRITION - Personalized Training Program`,
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
         .text('ZIN NUTRITION', 50, 240, { align: 'center', characterSpacing: 2 });
         
      doc.fillColor(secondaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('FUEL YOUR BEST SELF', 50, 285, { align: 'center', characterSpacing: 4 });

      // Clean separator bar
      doc.rect(180, 310, doc.page.width - 360, 3).fill(secondaryColor);

      // Main Guide Type
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('PERSONALIZED TRAINING PROGRAM', 50, 340, { align: 'center', characterSpacing: 1 });

      // Customer Info Card Box
      doc.rect(80, 430, doc.page.width - 160, 120).fill('rgba(255, 255, 255, 0.03)');
      doc.rect(80, 430, doc.page.width - 160, 120).lineWidth(0.5).strokeColor('rgba(218, 165, 32, 0.3)').stroke();

      doc.fillColor('#EAEAEA')
         .fontSize(13)
         .font('Helvetica-Bold')
         .text('PREPARED FOR', 100, 448, { align: 'center', characterSpacing: 1.5 });
      
      doc.fillColor('#FFFFFF')
         .fontSize(15)
         .text(`${profile.first_name || 'Valued Customer'} ${profile.last_name || ''}`, 100, 468, { align: 'center' });

      doc.fillColor('#CCCCCC')
         .fontSize(11)
         .font('Helvetica')
         .text(`Goal: ${profile.goal || 'General Fitness'}  |  Date: ${new Date().toLocaleDateString()}`, 100, 500, { align: 'center' });

      // Brand Tagline Footer
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('SCIENCE  •  PERSONALIZATION  •  TRUST', 50, 715, { align: 'center', characterSpacing: 2.5 });

      // Add a page break for the actual program content
      doc.addPage({ margin: 50, size: 'A4' });

      // --- HEADER ON SUBSEQUENT PAGES ---
      const drawHeader = () => {
        // Draw elegant top bar band
        doc.rect(0, 0, doc.page.width, 44).fill(primaryColor);
        doc.fillColor('#FFFFFF')
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('ZIN NUTRITION', 50, 18, { characterSpacing: 1 });
        doc.fillColor(secondaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('PERSONALIZED WORKOUT split', doc.page.width - 250, 18, { align: 'right', characterSpacing: 1 });
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

      // Helper to draw section heading with gold left border strip
      const drawSectionTitle = (titleText) => {
        checkSpace(35);
        doc.rect(50, y, 4, 18).fill(secondaryColor);
        doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(titleText, 62, y);
        y += 28;
      };

      // 1. Weekly Workout Split
      drawSectionTitle('1. Weekly Workout Split');

      const split = programData.weekly_split || {};
      Object.keys(split).forEach(day => {
        const textDay = `${day}:`;
        const textDesc = split[day];
        const dayDescHeight = doc.heightOfString(textDesc, { width: doc.page.width - 170 });
        
        checkSpace(dayDescHeight + 14);

        // Subtle block background
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

      // 2. Exercises Detail
      drawSectionTitle('2. Daily Exercises & Routines');

      const routines = programData.routines || [];
      routines.forEach(routine => {
        checkSpace(65); // Header box + first item
        
        // Routine Header Box (Gold accents + dark text banner)
        doc.rect(50, y, doc.page.width - 100, 24).fill('#EAEAEA');
        doc.rect(50, y, 4, 24).fill(secondaryColor);
        doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(routine.day_name || 'Workout Day', 62, y + 6);
        y += 32;

        if (routine.exercises && Array.isArray(routine.exercises)) {
          routine.exercises.forEach(ex => {
            const stats = `${ex.sets} sets x ${ex.reps} reps  |  Rest: ${ex.rest || '60s'}`;
            const exName = ex.name || 'Exercise';
            
            const exNameHeight = doc.heightOfString(exName, { width: 220 });
            const notesHeight = ex.notes ? doc.heightOfString(`Note: ${ex.notes}`, { width: doc.page.width - 130 }) : 0;
            const exTotalHeight = Math.max(exNameHeight, 14) + (ex.notes ? notesHeight + 6 : 0) + 12;

            checkSpace(exTotalHeight);

            // Exercise Row background for luxury grid feel
            doc.rect(50, y, doc.page.width - 100, exTotalHeight - 4).fill(lightCardBg);
            doc.rect(50, y, doc.page.width - 100, exTotalHeight - 4).lineWidth(0.5).strokeColor(borderColor).stroke();

            // Print Exercise Name
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(exName, 65, y + 5, { width: 220 });
            
            // Print Exercise Sets/Reps aligned to right
            doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(stats, doc.page.width - 260, y + 5, { width: 200, align: 'right' });
            y += Math.max(exNameHeight, 14) + 4;

            if (ex.notes) {
              doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Oblique').text(`Note: ${ex.notes}`, 75, y + 2, { width: doc.page.width - 140 });
              y += notesHeight + 6;
            }
            y += 8;
          });
        }
        y += 15;
      });

      // 3. Warm-up & Cool-down
      drawSectionTitle('3. Warm-Up & Cool-Down Protocols');

      const warmUpVal = programData.warm_up || '5-10 minutes dynamic stretching.';
      const coolDownVal = programData.cool_down || '5-10 minutes static stretching.';
      const warmUpHeight = doc.heightOfString(warmUpVal, { width: doc.page.width - 120 });
      const coolDownHeight = doc.heightOfString(coolDownVal, { width: doc.page.width - 120 });

      checkSpace(warmUpHeight + coolDownHeight + 110);

      // Warm Up Box
      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, warmUpHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Warm-Up Routine:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(warmUpVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += warmUpHeight + 50;

      // Cool Down Box
      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, coolDownHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Cool-Down Routine:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(coolDownVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += coolDownHeight + 30;

      // 4. Progressive Overload & Recovery
      drawSectionTitle('4. Coaching Guidelines');

      const overloadVal = programData.progressive_overload || 'Increase weight or reps gradually each week.';
      const recoveryVal = programData.recovery || 'Ensure 7-9 hours of sleep and adequate protein intake.';
      const overloadHeight = doc.heightOfString(overloadVal, { width: doc.page.width - 120 });
      const recoveryHeight = doc.heightOfString(recoveryVal, { width: doc.page.width - 120 });

      checkSpace(overloadHeight + recoveryHeight + 110);

      // Overload Box
      doc.rect(50, y, doc.page.width - 100, overloadHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, overloadHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Progressive Overload Strategy:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(overloadVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += overloadHeight + 50;

      // Recovery Box
      doc.rect(50, y, doc.page.width - 100, recoveryHeight + 35).fill(lightCardBg);
      doc.rect(50, y, doc.page.width - 100, recoveryHeight + 35).lineWidth(0.5).strokeColor(borderColor).stroke();
      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Recovery Recommendations:', 65, y + 8);
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(recoveryVal, 65, y + 24, { width: doc.page.width - 130, lineGap: 2 });
      y += recoveryHeight + 30;

      // 5. Safety Notes (Yellow Highlight Callout Box)
      const safetyVal = programData.safety_notes || 'Consult your physician before beginning any exercise program.';
      const safetyHeight = doc.heightOfString(safetyVal, { width: doc.page.width - 130 });
      
      checkSpace(safetyHeight + 55);

      doc.rect(50, y, doc.page.width - 100, safetyHeight + 35)
         .fill('#FFFDF2')
         .strokeColor(secondaryColor)
         .lineWidth(1)
         .stroke();

      doc.fillColor('#856404').fontSize(10).font('Helvetica-Bold').text('SAFETY & PRECAUTIONS', 65, y + 8);
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
