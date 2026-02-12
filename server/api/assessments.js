const db = require('../api-util/db');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * Assessment criteria configuration
 * Rating scale: 1-5
 */
const ASSESSMENT_CRITERIA = {
  workQuality: {
    title: 'Work Quality',
    criteria: [
      { key: 'deliverableQuality', label: 'Deliverable Quality', description: 'Met specifications and success criteria' },
      { key: 'accuracy', label: 'Accuracy', description: 'Work was thorough and error-free' },
      { key: 'criticalThinking', label: 'Critical Thinking', description: 'Demonstrated analysis and judgment' },
      { key: 'creativityInitiative', label: 'Creativity/Initiative', description: 'Brought fresh ideas or went beyond basics' },
    ],
  },
  communication: {
    title: 'Communication',
    criteria: [
      { key: 'writtenCommunication', label: 'Written Communication', description: 'Clear, professional written correspondence' },
      { key: 'verbalCommunication', label: 'Verbal Communication', description: 'Articulate in meetings and discussions' },
      { key: 'responsiveness', label: 'Responsiveness', description: 'Timely replies and follow-ups' },
      { key: 'activeListening', label: 'Active Listening', description: 'Understood instructions and feedback' },
    ],
  },
  professionalism: {
    title: 'Professionalism',
    criteria: [
      { key: 'reliability', label: 'Reliability', description: 'Met deadlines and commitments' },
      { key: 'adaptability', label: 'Adaptability', description: 'Adjusted to changes and feedback' },
      { key: 'teamwork', label: 'Teamwork', description: 'Collaborated effectively with others' },
      { key: 'professionalConduct', label: 'Professional Conduct', description: 'Appropriate behavior and attitude' },
    ],
  },
  overallPerformance: {
    title: 'Overall Performance',
    criteria: [
      { key: 'overallRating', label: 'Overall Performance Rating', description: 'Holistic assessment of student contribution' },
    ],
  },
};

// Track ID counter in memory (seeded from DB on startup)
let assessmentIdCounter = (function () {
  const all = db.assessments.getAll();
  if (all.length === 0) return 1;
  // Parse highest numeric suffix from existing IDs like "assessment-5"
  let max = 0;
  for (const a of all) {
    const match = a.id?.match(/assessment-(\d+)/);
    if (match) {
      max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return max + 1;
})();

/**
 * GET /api/assessments/criteria
 */
async function getAssessmentCriteria(req, res) {
  res.status(200).json({
    criteria: ASSESSMENT_CRITERIA,
    ratingScale: {
      1: 'Below Expectations',
      2: 'Needs Improvement',
      3: 'Meets Expectations',
      4: 'Exceeds Expectations',
      5: 'Outstanding',
    },
  });
}

/**
 * POST /api/assessments
 */
async function submitAssessment(req, res) {
  const {
    transactionId,
    studentId,
    ratings,
    comments,
    overallComments,
    recommendForFuture,
    strengths,
    areasForImprovement,
  } = req.body;

  if (!transactionId || !studentId || !ratings) {
    return res.status(400).json({
      error: 'Transaction ID, student ID, and ratings are required.',
    });
  }

  try {
    const sdk = getSdk(req, res);
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Verify the current user is a corporate partner
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userType = currentUser.attributes.profile.publicData?.userType;

    if (userType !== 'corporate-partner') {
      return res.status(403).json({
        error: 'Only corporate partners can submit assessments.',
      });
    }

    // Verify the transaction exists and is completed
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['customer', 'provider', 'listing'],
    });

    const transaction = txResponse.data.data;
    const listing = txResponse.data.included?.find(i => i.type === 'listing');

    // Verify the corporate partner owns this listing
    if (transaction.relationships.provider.data.id !== currentUser.id.uuid) {
      return res.status(403).json({
        error: 'You can only assess students for your own projects.',
      });
    }

    // Verify the student is the customer of this transaction
    if (transaction.relationships.customer.data.id !== studentId) {
      return res.status(400).json({
        error: 'Student ID does not match the transaction customer.',
      });
    }

    // Calculate average scores per section and overall
    const calculateSectionAverage = sectionKey => {
      const sectionCriteria = ASSESSMENT_CRITERIA[sectionKey]?.criteria || [];
      const sectionRatings = sectionCriteria
        .map(c => ratings[c.key])
        .filter(r => typeof r === 'number');
      if (sectionRatings.length === 0) return null;
      return sectionRatings.reduce((a, b) => a + b, 0) / sectionRatings.length;
    };

    const sectionAverages = {
      workQuality: calculateSectionAverage('workQuality'),
      communication: calculateSectionAverage('communication'),
      professionalism: calculateSectionAverage('professionalism'),
      overallPerformance: calculateSectionAverage('overallPerformance'),
    };

    const allRatings = Object.values(ratings).filter(r => typeof r === 'number');
    const overallAverage =
      allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null;

    // Get student info
    const studentResponse = await integrationSdk.users.show({ id: studentId });
    const student = studentResponse.data.data;

    // Create the assessment record
    const assessment = {
      id: `assessment-${assessmentIdCounter++}`,
      transactionId,
      studentId,
      studentName: student.attributes.profile.displayName,
      assessorId: currentUser.id.uuid,
      assessorName: currentUser.attributes.profile.displayName,
      companyName: currentUser.attributes.profile.publicData?.companyName || '',
      projectTitle: listing?.attributes?.title || 'Unknown Project',
      ratings,
      comments: comments || {},
      sectionAverages,
      overallAverage,
      overallComments: overallComments || '',
      strengths: strengths || '',
      areasForImprovement: areasForImprovement || '',
      recommendForFuture: recommendForFuture || false,
      createdAt: new Date().toISOString(),
      sentToStudent: false,
    };

    // Store the assessment in SQLite
    db.assessments.create(assessment);

    // Update the student's profile with the assessment (add to their track record)
    try {
      const studentPublicData = student.attributes.profile.publicData || {};
      const existingAssessments = studentPublicData.assessmentsSummary || {
        count: 0,
        averageRating: 0,
        totalRatingSum: 0,
      };

      const newCount = existingAssessments.count + 1;
      const newTotalSum = existingAssessments.totalRatingSum + overallAverage;
      const newAverageRating = newTotalSum / newCount;

      await integrationSdk.users.updateProfile({
        id: studentId,
        publicData: {
          assessmentsSummary: {
            count: newCount,
            averageRating: Math.round(newAverageRating * 100) / 100,
            totalRatingSum: newTotalSum,
            lastAssessmentDate: new Date().toISOString(),
          },
        },
      });
    } catch (updateError) {
      console.error('Failed to update student profile with assessment summary:', updateError);
    }

    // Mark as sent to student
    assessment.sentToStudent = true;
    db.assessments.updateSentToStudent(assessment.id, true);

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully and sent to student.',
      data: assessment,
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/assessments/transaction/:transactionId
 */
async function getAssessmentByTransaction(req, res) {
  const { transactionId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    const assessment = db.assessments.getByTransactionId(transactionId);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    // Only the assessor or the student can view the assessment
    if (assessment.assessorId !== currentUser.id.uuid && assessment.studentId !== currentUser.id.uuid) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.status(200).json({ data: assessment });
  } catch (error) {
    console.error('Get assessment error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/assessments/student/:studentId
 */
async function getStudentAssessments(req, res) {
  const { studentId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    // Students can only view their own assessments
    // System admins can view any student's assessments
    const userType = currentUser.attributes.profile.publicData?.userType;
    if (currentUser.id.uuid !== studentId && userType !== 'system-admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const studentAssessments = db.assessments.getByStudentId(studentId);

    res.status(200).json({
      assessments: studentAssessments,
      summary: {
        count: studentAssessments.length,
        averageRating:
          studentAssessments.length > 0
            ? studentAssessments.reduce((sum, a) => sum + a.overallAverage, 0) /
              studentAssessments.length
            : null,
      },
    });
  } catch (error) {
    console.error('Get student assessments error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/assessments/pending
 */
async function getPendingAssessments(req, res) {
  try {
    const sdk = getSdk(req, res);
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userType = currentUser.attributes.profile.publicData?.userType;

    if (userType !== 'corporate-partner') {
      return res.status(403).json({
        error: 'Only corporate partners can view pending assessments.',
      });
    }

    // Get completed transactions for this provider
    const txResponse = await integrationSdk.transactions.query({
      providerId: currentUser.id.uuid,
      lastTransitions: ['transition/complete'],
      include: ['customer', 'listing'],
    });

    const completedTransactions = txResponse.data.data || [];

    // Filter out transactions that already have assessments
    const assessedTxIds = db.assessments.getAllTransactionIds();
    const pendingTransactions = completedTransactions.filter(
      tx => !assessedTxIds.includes(tx.id.uuid)
    );

    // Build response with transaction details
    const pending = pendingTransactions.map(tx => {
      const customer = txResponse.data.included?.find(
        i => i.type === 'user' && i.id.uuid === tx.relationships.customer.data.id
      );
      const listing = txResponse.data.included?.find(
        i => i.type === 'listing' && i.id.uuid === tx.relationships.listing.data.id
      );

      return {
        transactionId: tx.id.uuid,
        studentId: tx.relationships.customer.data.id,
        studentName: customer?.attributes?.profile?.displayName || 'Unknown Student',
        projectTitle: listing?.attributes?.title || 'Unknown Project',
        completedAt: tx.attributes.lastTransitionedAt,
      };
    });

    res.status(200).json({ pending });
  } catch (error) {
    console.error('Get pending assessments error:', error);
    handleError(res, error);
  }
}

module.exports = {
  getAssessmentCriteria,
  submitAssessment,
  getAssessmentByTransaction,
  getStudentAssessments,
  getPendingAssessments,
};
