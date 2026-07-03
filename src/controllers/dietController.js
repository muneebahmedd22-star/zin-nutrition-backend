const supabase = require('../config/db');
const { generateProgramPDF } = require('../services/pdf'); // We can reuse the same PDFKit compiler by passing the diet plan data!

/**
 * Handle submission of the diet assessment form
 */
async function saveDietAssessment(req, res) {
  try {
    const {
      email,
      firstName,
      age,
      height,
      weight,
      goal,
      bloodType,
      medicalHistory,
      carbsPreference,
      food,
      allergies
    } = req.body;

    if (!email || !firstName || !bloodType) {
      return res.status(400).json({ success: false, message: 'Email, First Name, and Blood Type are required.' });
    }

    const assessmentPayload = {
      email: email.trim().toLowerCase(),
      first_name: firstName,
      age: parseInt(age, 10),
      height: height,
      weight: parseFloat(weight),
      goal: goal,
      blood_type: bloodType,
      medical_history: medicalHistory || 'None',
      carbs_preference: carbsPreference || 'Regular Carbs',
      food_preference: food,
      allergies: allergies || '',
      created_at: new Date().toISOString()
    };

    // Upsert by email
    const { data, error } = await supabase
      .from('diet_assessments')
      .upsert(assessmentPayload, { onConflict: 'email' })
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Diet assessment saved successfully.',
      assessment: data[0]
    });

  } catch (error) {
    console.error('Error saving diet assessment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Serves the generated diet plan as PDF or JSON based on the secure token (UUID)
 */
async function getDietPlan(req, res) {
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Secure token is missing.' });
    }

    // Retrieve diet plan
    const { data: plan, error } = await supabase
      .from('generated_diet_plans')
      .select('*')
      .eq('id', token)
      .single();

    if (error || !plan) {
      return res.status(404).json({ success: false, message: 'Diet plan not found or invalid token.' });
    }

    const format = req.query.format || 'json';
    if (format === 'pdf') {
      if (plan.pdf_url) {
        return res.redirect(plan.pdf_url);
      }
      
      // Fallback dynamic compile if not in storage
      const { data: profile } = await supabase
        .from('diet_assessments')
        .select('*')
        .eq('email', plan.email)
        .single();

      if (!profile) {
        return res.status(404).json({ success: false, message: 'Customer profile assessment not found.' });
      }

      // Generate PDF
      const pdfBuffer = await generateProgramPDF(plan.plan_data, profile);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ZinNutrition_Diet_Plan.pdf`);
      return res.send(pdfBuffer);
    }

    return res.status(200).json({
      success: true,
      plan: {
        id: plan.id,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        data: plan.plan_data
      }
    });

  } catch (error) {
    console.error('Error fetching diet plan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  saveDietAssessment,
  getDietPlan
};
