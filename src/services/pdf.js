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
      const primaryColor = '#111111'; // Charcoal/black
      const secondaryColor = '#DAA520'; // Golden accent
      const textColor = '#333333';
      const lightBg = '#F8F9FA';
      const borderColor = '#EAEAEA';

      // --- COVER PAGE ---
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#111111');
      
      doc.fillColor('#FFFFFF')
         .fontSize(32)
         .font('Helvetica-Bold')
         .text('ZIN NUTRITION', 50, 200, { align: 'center', characterSpacing: 2 });
         
      doc.fillColor(secondaryColor)
         .fontSize(18)
         .text('PERSONALIZED TRAINING PROGRAM', 50, 250, { align: 'center', characterSpacing: 1 });

      doc.fillColor('#CCCCCC')
         .fontSize(12)
         .font('Helvetica')
         .text(`Prepared for: ${profile.first_name} ${profile.last_name}`, 50, 450, { align: 'center' })
         .text(`Goal: ${profile.goal}`, 50, 475, { align: 'center' })
         .text(`Date: ${new Date().toLocaleDateString()}`, 50, 500, { align: 'center' });

      // Add a page break for the actual program content
      doc.addPage({ margin: 50, size: 'A4' });

      // --- HEADER ON SUBSEQUENT PAGES ---
      const drawHeader = () => {
        doc.fillColor(primaryColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('ZIN NUTRITION', 50, 30);
        doc.strokeColor(secondaryColor)
           .lineWidth(1)
           .moveTo(50, 48)
           .lineTo(doc.page.width - 50, 48)
           .stroke();
      };
      
      drawHeader();

      // Program Content Starts at y=70
      let y = 70;

      // 1. Weekly Workout Split
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('1. Weekly Workout Split', 50, y);
      y += 25;

      const split = programData.weekly_split || {};
      Object.keys(split).forEach(day => {
        doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(`${day}: `, 50, y, { continued: true });
        doc.fillColor(textColor).font('Helvetica').text(split[day], 130, y);
        y += 18;
        if (y > 750) { doc.addPage(); drawHeader(); y = 70; }
      });

      y += 15;

      // 2. Exercises Detail
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('2. Daily Exercises & Routines', 50, y);
      y += 25;

      const routines = programData.routines || [];
      routines.forEach(routine => {
        // Routine Header Box
        doc.rect(50, y, doc.page.width - 100, 22).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(routine.day_name || 'Workout Day', 60, y + 5);
        y += 28;

        if (routine.exercises && Array.isArray(routine.exercises)) {
          routine.exercises.forEach(ex => {
            // Exercise Line
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(ex.name, 60, y);
            
            const stats = `${ex.sets} sets x ${ex.reps} reps | Rest: ${ex.rest || '60s'}`;
            doc.fillColor(textColor).font('Helvetica').text(stats, doc.page.width - 250, y, { width: 200, align: 'right' });
            
            y += 16;

            if (ex.notes) {
              doc.fillColor('#777777').fontSize(9).font('Helvetica-Oblique').text(`Note: ${ex.notes}`, 70, y);
              y += 14;
            }

            if (y > 740) { doc.addPage(); drawHeader(); y = 70; }
          });
        }
        y += 15;
        if (y > 720) { doc.addPage(); drawHeader(); y = 70; }
      });

      // 3. Warm-up & Cool-down
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('3. Warm-Up & Cool-Down Protocols', 50, y);
      y += 25;

      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Warm-Up Routine:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(programData.warm_up || '5-10 minutes dynamic stretching.', 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(programData.warm_up || '', { width: doc.page.width - 100 }) + 10;

      if (y > 720) { doc.addPage(); drawHeader(); y = 70; }

      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Cool-Down Routine:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(programData.cool_down || '5-10 minutes static stretching.', 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(programData.cool_down || '', { width: doc.page.width - 100 }) + 20;

      if (y > 700) { doc.addPage(); drawHeader(); y = 70; }

      // 4. Progressive Overload & Recovery
      doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold').text('4. Coaching Guidelines', 50, y);
      y += 25;

      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Progressive Overload Strategy:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(programData.progressive_overload || 'Increase weight or reps gradually each week.', 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(programData.progressive_overload || '', { width: doc.page.width - 100 }) + 10;

      if (y > 700) { doc.addPage(); drawHeader(); y = 70; }

      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Recovery Recommendations:', 50, y);
      y += 16;
      doc.fillColor(textColor).fontSize(10).font('Helvetica').text(programData.recovery || 'Ensure 7-9 hours of sleep and adequate protein intake.', 50, y, { width: doc.page.width - 100 });
      y += doc.heightOfString(programData.recovery || '', { width: doc.page.width - 100 }) + 20;

      if (y > 700) { doc.addPage(); drawHeader(); y = 70; }

      // 5. Safety Notes
      doc.rect(50, y, doc.page.width - 100, doc.heightOfString(programData.safety_notes || '', { width: doc.page.width - 120 }) + 20)
         .fill('#FFF3CD')
         .strokeColor('#FFEBAA')
         .stroke();
      doc.fillColor('#856404').fontSize(10).font('Helvetica-Bold').text('SAFETY & PRECAUTIONS', 60, y + 8);
      doc.font('Helvetica').text(programData.safety_notes || 'Consult your physician before beginning any exercise program.', 60, y + 22, { width: doc.page.width - 120 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateProgramPDF
};
