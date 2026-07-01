const supabase = require('../config/db');

/**
 * Handle submission of the multi-step assessment form
 */
async function saveAssessment(req, res) {
  try {
    const {
      email,
      firstName,
      lastName,
      age,
      height,
      weight,
      goal,
      food,
      carbs,
      meat,
      allergies,
      workout,
      comments
    } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'Email, First Name, and Last Name are required.' });
    }

    const assessmentPayload = {
      email: email.trim().toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      age: parseInt(age, 10),
      height: height,
      weight: parseFloat(weight),
      goal: goal,
      food_preference: food,
      carbs_preference: carbs,
      meat_preference: meat,
      allergies: allergies || '',
      workout_frequency: workout || '',
      comments: comments || '',
      created_at: new Date().toISOString()
    };

    // Upsert by email
    const { data, error } = await supabase
      .from('assessments')
      .upsert(assessmentPayload, { onConflict: 'email' })
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment saved successfully.',
      assessment: data[0]
    });

  } catch (error) {
    console.error('Error saving assessment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  saveAssessment
};
