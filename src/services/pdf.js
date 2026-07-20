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

      // Brand Palette (Zin Nutrition - Sleek Dark Aesthetic)
      const primaryColor = '#121212'; // Charcoal/black
      const secondaryColor = '#DAA520'; // Golden accent
      const textColor = '#333333';
      const mutedColor = '#666666';
      const lightBg = '#F9F9F9';
      const borderColor = '#EAEAEA';

      // --- COVER PAGE ---
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(primaryColor);
      
      // Draw Gold Accent Border Frame on Cover
      doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50)
         .lineWidth(2)
         .strokeColor(secondaryColor)
         .stroke();

      doc.fillColor('#FFFFFF')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('ZIN NUTRITION', 50, 200, { align: 'center', characterSpacing: 2 });
         
      doc.strokeColor(secondaryColor)
         .lineWidth(1)
         .moveTo(150, 255)
         .lineTo(doc.page.width - 150, 255)
         .stroke();

      doc.fillColor(secondaryColor)
         .fontSize(16)
         .text('PERSONALIZED TRAINING PROGRAM', 50, 275, { align: 'center', characterSpacing: 1 });

      doc.fillColor('#EAEAEA')
         .fontSize(13)
         .font('Helvetica-Bold')
         .text(`Prepared for: ${profile.first_name || 'Valued Customer'} ${profile.last_name || ''}`, 50, 420, { align: 'center' });

      doc.fillColor('#CCCCCC')
         .fontSize(11)
         .font('Helvetica')
         .text(`Goal: ${profile.goal || 'General Fitness'}`, 50, 445, { align: 'center' })
         .text(`Generated: ${new Date().toLocaleDateString()}`, 50, 465, { align: 'center' });

      doc.fillColor(secondaryColor)
         .fontSize(10)
         .text('FUEL YOUR LIFE', 50, 680, { align: 'center', characterSpacing: 3 });

      // Add a page break for the actual program content
      doc.addPage({ margin: 50, size: 'A4' });

      // --- HEADER ON SUBSEQUENT PAGES ---
      const drawHeader = () => {
        doc.fillColor(primaryColor)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('ZIN NUTRITION', 50, 30);
        doc.fillColor(secondaryColor)
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('PERSONALIZED WORKOUT SPLIT', doc.page.width - 250, 30, { align: 'right' });
        doc.strokeColor(secondaryColor)
           .lineWidth(1)
           .moveTo(50, 44)
           .lineTo(doc.page.width - 50, 44)
           .stroke();
      };
      
      drawHeader();

      // Program Content Starts at y=60
      let y = 60;

      // Helper to check page overflow and insert page breaks
      const checkSpace = (neededHeight) => {
        if (y + neededHeight > 730) {
          doc.addPage();
          drawHeader();
          y = 60;
        }
      };

      // 1. Weekly Workout Split
      checkSpace(40);
      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold').text('1. Weekly Workout Split', 50, y);
      y += 22;

      const split = programData.weekly_split || {};
      Object.keys(split).forEach(day => {
        const textDay = `${day}: `;
        const textDesc = split[day];
        const dayDescHeight = doc.heightOfString(textDesc, { width: doc.page.width - 160 });
        
        checkSpace(dayDescHeight + 6);
        
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(textDay, 50, y, { width: 90, continued: true });
        doc.fillColor(textColor).font('Helvetica').text(textDesc, 140, y, { width: doc.page.width - 190 });
        y += dayDescHeight + 8;
      });

      y += 15;

      // 2. Exercises Detail
      checkSpace(40);
      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold').text('2. Daily Exercises & Routines', 50, y);
      y += 22;

      const routines = programData.routines || [];
      routines.forEach(routine => {
        checkSpace(60); // Ensure routine header box and first exercise fit on same page
        
        // Routine Header Box
        doc.rect(50, y, doc.page.width - 100, 24).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(routine.day_name || 'Workout Day', 60, y + 6);
        y += 32;

        if (routine.exercises && Array.isArray(routine.exercises)) {
          routine.exercises.forEach(ex => {
            const stats = `${ex.sets} sets x ${ex.reps} reps | Rest: ${ex.rest || '60s'}`;
            const exName = ex.name || 'Exercise';
            const exNameHeight = doc.heightOfString(exName, { width: 220 });
            const notesHeight = ex.notes ? doc.heightOfString(`Note: ${ex.notes}`, { width: doc.page.width - 120 }) : 0;
            const exTotalHeight = Math.max(exNameHeight, 16) + (ex.notes ? notesHeight + 6 : 0) + 8;

            checkSpace(exTotalHeight);

            // Print Exercise Name
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(exName, 60, y, { width: 220 });
            
            // Print Exercise Sets/Reps aligned to right
            doc.fillColor(textColor).fontSize(10).font('Helvetica').text(stats, doc.page.width - 250, y, { width: 200, align: 'right' });
            y += Math.max(exNameHeight, 14) + 2;

            if (ex.notes) {
              doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Oblique').text(`Note: ${ex.notes}`, 70, y, { width: doc.page.width - 130 });
              y += notesHeight + 4;
            }
            
            // Bottom small border line for separation
            doc.strokeColor(borderColor).lineWidth(0.5).moveTo(60, y).lineTo(doc.page.width - 60, y).stroke();
            y += 6;
          });
        }
        y += 12;
      });

      y += 10;

      // 3. Warm-up & Cool-down
      const warmUpVal = programData.warm_up || '5-10 minutes dynamic stretching.';
      const coolDownVal = programData.cool_down || '5-10 minutes static stretching.';
      const warmUpHeight = doc.heightOfString(warmUpVal, { width: doc.page.width - 100 });
      const coolDownHeight = doc.heightOfString(coolDownVal, { width: doc.page.width - 100 });
      const section3TotalHeight = 40 + warmUpHeight + coolDownHeight + 60;

      checkSpace(section3TotalHeight > 300 ? 150 : section3TotalHeight);

      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold').text('3. Warm-Up & Cool-Down Protocols', 50, y);
      y += 22;

      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Warm-Up Routine:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(warmUpVal, 50, y, { width: doc.page.width - 100, lineGap: 2 });
      y += warmUpHeight + 15;

      checkSpace(coolDownHeight + 40);

      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Cool-Down Routine:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(coolDownVal, 50, y, { width: doc.page.width - 100, lineGap: 2 });
      y += coolDownHeight + 25;

      // 4. Progressive Overload & Recovery
      const overloadVal = programData.progressive_overload || 'Increase weight or reps gradually each week.';
      const recoveryVal = programData.recovery || 'Ensure 7-9 hours of sleep and adequate protein intake.';
      const overloadHeight = doc.heightOfString(overloadVal, { width: doc.page.width - 100 });
      const recoveryHeight = doc.heightOfString(recoveryVal, { width: doc.page.width - 100 });
      const section4TotalHeight = 40 + overloadHeight + recoveryHeight + 60;

      checkSpace(section4TotalHeight > 300 ? 150 : section4TotalHeight);

      doc.fillColor(primaryColor).fontSize(15).font('Helvetica-Bold').text('4. Coaching Guidelines', 50, y);
      y += 22;

      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Progressive Overload Strategy:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(overloadVal, 50, y, { width: doc.page.width - 100, lineGap: 2 });
      y += overloadHeight + 15;

      checkSpace(recoveryHeight + 40);

      doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('Recovery Recommendations:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(recoveryVal, 50, y, { width: doc.page.width - 100, lineGap: 2 });
      y += recoveryHeight + 25;

      // 5. Safety Notes (Yellow Highlight Callout Box)
      const safetyVal = programData.safety_notes || 'Consult your physician before beginning any exercise program.';
      const safetyHeight = doc.heightOfString(safetyVal, { width: doc.page.width - 120 });
      
      checkSpace(safetyHeight + 50);

      doc.rect(50, y, doc.page.width - 100, safetyHeight + 35)
         .fill('#FFF9E6')
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
