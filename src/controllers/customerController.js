const { generateProgramPDF } = require('../services/pdf');
const supabase = require('../config/db');

/**
 * Serves the generated training program as PDF or JSON based on the secure token (UUID)
 */
async function getTrainingProgram(req, res) {
  try {
    // req.program is attached by customerAuth middleware
    const program = req.program;

    // Fetch matching assessment profile to fill PDF metadata correctly
    const { data: profile, error: profileError } = await supabase
      .from('assessments')
      .select('*')
      .eq('email', program.email)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'Customer profile assessment not found.' });
    }

    // Check if the user is requesting PDF file directly
    const format = req.query.format || 'json';
    if (format === 'pdf') {
      if (program.pdf_url) {
        return res.redirect(program.pdf_url);
      }
      
      const pdfBuffer = await generateProgramPDF(program.program_data, profile);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ZinNutrition_Training_Program.pdf`);
      return res.send(pdfBuffer);
    }

    // Otherwise return program metadata and JSON data
    return res.status(200).json({
      success: true,
      program: {
        id: program.id,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
        data: program.program_data
      }
    });

  } catch (error) {
    console.error('Error fetching customer training program:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getTrainingProgram
};
