const supabase = require('../config/db');
const { searchKnowledgeBase } = require('../services/rag');
const { generateTrainingProgram } = require('../services/gemini');
const { generateProgramPDF } = require('../services/pdf');
const { sendProgramEmail } = require('../services/email');
const { generateGeneralDietPDF, generateGeneralWorkoutPDF } = require('../services/generalPdfs');

/**
 * Executes the core Workout RAG generation pipeline
 */
async function runRAGPipeline(profile, orderId) {
  const email = profile.email.toLowerCase();
  const searchQuery = `Workout routines, exercises, splits, sets, reps for goal: ${profile.goal}. Workout frequency: ${profile.workout_frequency}. Preferences: food: ${profile.food_preference}, carbs: ${profile.carbs_preference || 'Regular Carbs'}.`;
  
  const contexts = await searchKnowledgeBase(searchQuery);
  const contextText = contexts.join('\n\n');

  const systemInstruction = `
    You are an expert Personal Trainer AI. Your task is to generate a fully customized Training Program based on the retrieved textbook contexts provided by the user.
    
    CRITICAL SAFETY RULES (HALLUCINATION PROTECTION):
    1. Ground your recommendations on the provided textbook context as much as possible.
    2. If the contexts do not contain enough details, you may use your standard professional personal training knowledge base to complete the plan, ensuring it remains fully professional.
    3. Return a valid JSON object matching the following structural schema:
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
    - Name: ${profile.first_name} ${profile.last_name || ''}
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

  const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
  const programJson = JSON.parse(rawResponse);

  if (programJson.insufficient_knowledge) {
    throw new Error(programJson.message || 'INSUFFICIENT_KNOWLEDGE_BASE');
  }

  const pdfBuffer = await generateProgramPDF(programJson, profile);

  // Generate complimentary General Diet PDF
  let generalDietPdf = null;
  try {
    // Workout buyer gets standard Type O/A/B/AB Diet Guide
    const bloodType = profile.blood_type || 'O';
    generalDietPdf = await generateGeneralDietPDF(bloodType);
    console.log(`Generated complimentary General Diet PDF for Blood Type ${bloodType}`);
  } catch (pdfErr) {
    console.error('Failed to compile General Diet PDF:', pdfErr.message);
  }

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

  // Send email with both customized Workout PDF and complimentary General Diet PDF + 50% discount coupon code
  await sendProgramEmail(email, profile.first_name, pdfBuffer, generalDietPdf, false, 'ZIN50DIET');

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
 * Executes the core Diet/Nutrition RAG generation pipeline
 */
async function runDietRAGPipeline(profile, orderId) {
  const email = profile.email.toLowerCase();
  
  // 1. Build Diet RAG Search Query targeting the specific Blood Type & medical context
  const searchQuery = `Blood Type ${profile.blood_type} diet guidelines, food choices, meats, poultry, seafood, grains, dairy, vegetables, fruits, condiments, supplements. Medical restrictions: ${profile.medical_history || 'None'}, carbs: ${profile.carbs_preference || 'Regular Carbs'}`;
  
  const contexts = await searchKnowledgeBase(searchQuery);
  const contextText = contexts.join('\n\n');

  // 2. Define prompt guidelines matching PDF schema
  const systemInstruction = `
    You are an expert Dietitian and Nutritionist AI. Your task is to generate a fully customized 4-Week Diet & Meal Program based on the retrieved book contexts provided by the user.
    
    CRITICAL SAFETY & BRAND RULES:
    1. Ground your recommendations on the provided blood type book context as much as possible.
    2. Customize the meals specifically matching the client's Blood Type: "${profile.blood_type}".
    3. If the client has a medical history of "Diabetes / High Sugar", strictly avoid simple sugars, white flour, high glycemic fruits, and processed sweeteners. Focus on high fiber, complex carbs, and clean proteins to stabilize blood glucose levels.
    4. If the contexts do not contain enough details, you may use your standard professional nutrition knowledge base to complete the plan, ensuring it remains fully professional.
    5. Return a valid JSON object matching the following structural schema (Reused from training layout):
    {
      "weekly_split": {
        "Monday": "Overview of meals for Monday",
        "Tuesday": "Overview of meals for Tuesday",
        "Wednesday": "Overview of meals for Wednesday",
        "Thursday": "Overview of meals for Thursday",
        "Friday": "Overview of meals for Friday",
        "Saturday": "Overview of meals for Saturday",
        "Sunday": "Overview of meals for Sunday"
      },
      "routines": [
        {
          "day_name": "Monday Meal Schedule",
          "exercises": [
            { "name": "Meal 1: Breakfast", "sets": "1 Portion", "reps": "Approx. 400 kcal", "rest": "08:00 AM", "notes": "Oatmeal, banana, green tea" },
            { "name": "Meal 2: Lunch", "sets": "1 Serving", "reps": "Approx. 600 kcal", "rest": "01:00 PM", "notes": "Grilled chicken breast, brown rice, broccoli" },
            { "name": "Meal 3: Dinner", "sets": "1 Serving", "reps": "Approx. 500 kcal", "rest": "07:00 PM", "notes": "Wild cod fillet, roasted sweet potato" }
          ]
        }
      ],
      "warm_up": "General daily calorie targets and macro split guidance",
      "cool_down": "Hydration requirements & shopping list",
      "progressive_overload": "Weekly diet adaptation & portion adjustment tips",
      "recovery": "Highly beneficial supplements based on Blood Type",
      "safety_notes": "Food items to strictly AVOID (based on Blood Type O/A/B/AB guidelines)"
    }
    6. Do not output markdown backticks (e.g. \`\`\`json) in your final response. Return raw JSON string only.
  `;

  const userPrompt = `
    Client Diet Profile:
    - Name: ${profile.first_name}
    - Age: ${profile.age}
    - Height: ${profile.height}
    - Weight: ${profile.weight} kg
    - Goal: ${profile.goal}
    - Blood Type: ${profile.blood_type}
    - Medical History: ${profile.medical_history || 'None'}
    - Carbs Preference: ${profile.carbs_preference || 'Regular Carbs'}
    - Preference: ${profile.food_preference}
    - Allergies: ${profile.allergies || 'None'}

    Retrieved Book Context:
    ${contextText}
  `;

  const rawResponse = await generateTrainingProgram(userPrompt, systemInstruction);
  const planJson = JSON.parse(rawResponse);

  const pdfBuffer = await generateProgramPDF(planJson, profile);

  // Generate complimentary General Workout PDF based on Goal
  let generalWorkoutPdf = null;
  try {
    generalWorkoutPdf = await generateGeneralWorkoutPDF(profile.goal || 'Weight Loss');
    console.log(`Generated complimentary General Workout PDF for Goal ${profile.goal}`);
  } catch (pdfErr) {
    console.error('Failed to compile General Workout PDF:', pdfErr.message);
  }

  let pdfUrl = null;
  try {
    const bucketName = 'programs';
    const filePath = `${email}/${orderId}_diet_plan.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Supabase Storage Diet PDF upload failed:', uploadError.message);
    } else {
      const { data: urlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      pdfUrl = urlData.publicUrl;
      console.log('Diet PDF successfully uploaded to Supabase Storage. Public URL:', pdfUrl);
    }
  } catch (storageErr) {
    console.error('Error uploading Diet PDF to storage:', storageErr);
  }

  // Send email with both customized Diet PDF and complimentary General Workout PDF + 50% discount coupon code
  await sendProgramEmail(email, profile.first_name, pdfBuffer, generalWorkoutPdf, true, 'ZIN50FIT');

  const { data: dietPlan, error: upsertError } = await supabase
    .from('generated_diet_plans')
    .upsert({
      email: email,
      order_id: orderId,
      pdf_url: pdfUrl,
      plan_data: planJson,
      updated_at: new Date().toISOString()
    }, { onConflict: 'order_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;
  return dietPlan;
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

    // Detect if order contains a diet plan or a fitness program
    let isDietOrder = false;
    if (orderData.line_items && Array.isArray(orderData.line_items)) {
      isDietOrder = orderData.line_items.some(item => {
        const title = (item.title || '').toLowerCase();
        return title.includes('diet') || title.includes('nutrition') || title.includes('meal');
      });
    }

    if (isDietOrder) {
      // 1. Process Diet Assessment
      const { data: profile, error } = await supabase
        .from('diet_assessments')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        console.warn(`Diet assessment profile not found for email: ${email}. Webhook deferred.`);
        return res.status(200).json({
          success: false,
          message: 'Order paid, but customer diet assessment details are missing.'
        });
      }

      const plan = await runDietRAGPipeline(profile, orderId);
      return res.status(200).json({
        success: true,
        message: 'Diet plan generated and emailed successfully.',
        planId: plan.id
      });

    } else {
      // 2. Process Workout Assessment (Default)
      const { data: profile, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !profile) {
        console.warn(`Workout assessment profile not found for email: ${email}. Webhook deferred.`);
        return res.status(200).json({
          success: false,
          message: 'Order paid, but customer workout assessment details are missing.'
        });
      }

      const program = await runRAGPipeline(profile, orderId);
      return res.status(200).json({
        success: true,
        message: 'Workout program generated and emailed successfully.',
        programId: program.id
      });
    }

  } catch (error) {
    console.error('Webhook processing failed:', error);
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
  const { id } = req.params;
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
