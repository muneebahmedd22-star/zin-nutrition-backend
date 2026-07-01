const supabase = require('../config/db');
const { searchKnowledgeBase } = require('../services/rag');
const { generateTrainingProgram } = require('../services/gemini');
const { generateProgramPDF } = require('../services/pdf');
const { sendProgramEmail } = require('../services/email');

/**
 * Executes the core RAG generation pipeline
 * @param {object} profile - Customer assessment details
 * @param {string} orderId - Shopify Order ID
 * @returns {Promise<object>} - The generated program database record
 */
async function runRAGPipeline(profile, orderId) {
  const email = profile.email.toLowerCase();
  
  // 1. Build RAG Query from Assessment
  const searchQuery = `Workout routines, exercises, splits, sets, reps for goal: ${profile.goal}. Workout frequency: ${profile.workout_frequency}. Preferences: food: ${profile.food_preference}, carbs: ${profile.carbs_preference}.`;
  
  // 2. Fetch Relevant Context from Vector DB
  const contexts = await searchKnowledgeBase(searchQuery);
  const contextText = contexts.join('\n\n');

  // 3. Define Hallucination Protection and Prompt Instructions
  const systemInstruction = `
    You are an expert Personal Trainer AI. Your task is to generate a fully customized Training Program based ONLY on the retrieved textbook contexts provided by the user.
    
    CRITICAL SAFETY RULES (HALLUCINATION PROTECTION):
    1. Ground all recommendations, splits, and training principles strictly on the provided textbook context.
    2. If the textbook contexts contain insufficient information regarding the target goal ("${profile.goal}") or exercise patterns, output exactly this JSON structure:
       {"insufficient_knowledge": true, "message": "INSUFFICIENT_KNOWLEDGE_BASE: The uploaded textbook lacks specific training protocols for target goal: ${profile.goal}."}
       Do NOT invent guidelines or generate unsupported workouts.
    3. If the context is sufficient, you must return a valid JSON object matching the following structural schema:
    {
      "weekly_split": {
        "Day 1": "Description of split",
        "Day 2": "Description of split",
        ...
      },
      "routines": [
        {
          "day_name": "Day 1 - Push Focus",
          "exercises": [
            { "name": "Exercise Name", "sets": 3, "reps": "8-12", "rest": "60s", "notes": "Form cues" }
          ]
        }
      ],
      "warm_up": "Warm-up steps",
      "cool_down": "Cool-down steps",
      "progressive_overload": "Detailed progression instructions",
      "recovery": "Sleep, nutrition, hydration guidelines",
      "safety_notes": "Important precautions"
    }
    4. Do not output markdown backticks (e.g. \`\`\`json) in your final response. Return raw JSON string only.
  `;

  const userPrompt = `
    Client Assessment Profile:
    - Name: ${profile.first_name} ${profile.last_name}
    - Age: ${profile.age}
    - Height: ${profile.height}
    - Weight: ${profile.weight} kg
    - Fitness Goal: ${profile.goal}
    - Workout Frequency: ${profile.workout_frequency} times/week
    - Food Preference: ${profile.food_preference}
    - Allergies: ${profile.allergies || 'None'}
    - Comments: ${profile.comments || 'None'}

    Retrieved Textbook Context:
    ${contextText}
  `;

  // 4. Generate Program Details via Gemini 1.5 Flash
  const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
  const programJson = JSON.parse(rawResponse);

  // Check if Hallucination Protection Triggered
  if (programJson.insufficient_knowledge) {
    throw new Error(programJson.message || 'INSUFFICIENT_KNOWLEDGE_BASE');
  }

  // 5. Generate Branded PDF
  const pdfBuffer = await generateProgramPDF(programJson, profile);

  // 6. Upload PDF to Supabase Storage (Bucket name: programs)
  let pdfUrl = null;
  try {
    const bucketName = 'programs';
    const filePath = `${email}/${orderId}_training_program.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Supabase Storage PDF upload failed:', uploadError.message);
    } else {
      const { data: urlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      pdfUrl = urlData.publicUrl;
      console.log('PDF successfully uploaded to Supabase Storage. Public URL:', pdfUrl);
    }
  } catch (storageErr) {
    console.error('Error uploading PDF to storage:', storageErr);
  }

  // 7. Send Email with PDF Attachment via Hostinger SMTP
  await sendProgramEmail(email, profile.first_name, pdfBuffer);

  // 8. Upsert program result into DB
  const { data: program, error: upsertError } = await supabase
    .from('generated_programs')
    .upsert({
      email: email,
      order_id: orderId,
      pdf_url: pdfUrl,
      program_data: programJson,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;

  return program;
}

/**
 * Handle Shopify orders/paid Webhook
 */
async function handleOrderPaidWebhook(req, res) {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.email) {
      return res.status(400).json({ success: false, message: 'Invalid order payload.' });
    }

    const email = orderData.email.toLowerCase().trim();
    const orderId = String(orderData.id);

    // Retrieve customer assessment by email
    const { data: profile, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !profile) {
      console.warn(`Assessment profile not found for email: ${email}. Webhook deferred.`);
      // Return 200 to acknowledge webhook, but flag it
      return res.status(200).json({
        success: false,
        message: 'Order paid, but customer assessment details are missing.'
      });
    }

    // Run PDF generation and email RAG pipeline
    const program = await runRAGPipeline(profile, orderId);

    return res.status(200).json({
      success: true,
      message: 'Program generated and emailed successfully.',
      programId: program.id
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    // If it's a grounding/hallucination issue, fail gracefully
    if (error.message.includes('INSUFFICIENT_KNOWLEDGE_BASE')) {
      return res.status(200).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Manual/Admin trigger to regenerate a program (e.g. after updated ebook uploads)
 */
async function regenerateProgram(req, res) {
  const { id } = req.params; // Program UUID
  try {
    const { data: program, error: selectError } = await supabase
      .from('generated_programs')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError || !program) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('assessments')
      .select('*')
      .eq('email', program.email)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'Customer assessment profile not found.' });
    }

    // Rerun generator pipeline
    const updatedProgram = await runRAGPipeline(profile, program.order_id);

    return res.status(200).json({
      success: true,
      message: 'Program regenerated and emailed successfully.',
      program: updatedProgram
    });

  } catch (error) {
    console.error('Regeneration failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  handleOrderPaidWebhook,
  regenerateProgram
};
