/**
 * models/ProfileDetails.js
 *
 * Detailed, optional user bio/profile information.
 * Stored separately from User to keep auth/session documents lean.
 *
 * One document per user (owner is unique).
 */
const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 50, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

const datedItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 120, default: '' },
    org: { type: String, trim: true, maxlength: 120, default: '' },
    year: { type: Number, min: 1900, max: 2100 },
    url: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, maxlength: 160, default: '' },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    startDate: { type: String, trim: true, maxlength: 30, default: '' },
    endDate: { type: String, trim: true, maxlength: 30, default: '' },
    responsibilities: [{ type: String, trim: true, maxlength: 300 }],
    impactHighlights: [{ type: String, trim: true, maxlength: 300 }],
    techUsed: [{ type: String, trim: true, maxlength: 40 }],
  },
  { _id: false }
);

const profileDetailsSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    identity: {
      displayName: { type: String, trim: true, maxlength: 80, default: '' },
      headline: { type: String, trim: true, maxlength: 120, default: '' },
      location: { type: String, trim: true, maxlength: 120, default: '' },
      timezone: { type: String, trim: true, maxlength: 60, default: '' },
      pronouns: { type: String, trim: true, maxlength: 40, default: '' },
      languagesSpoken: [{ type: String, trim: true, maxlength: 40 }],
      contact: {
        publicEmail: { type: String, trim: true, maxlength: 255, default: '' },
        publicPhone: { type: String, trim: true, maxlength: 40, default: '' },
        preferredContactMethod: { type: String, trim: true, maxlength: 40, default: '' },
      },
    },

    about: {
      summaryShort: { type: String, trim: true, maxlength: 1000, default: '' },
      summaryLong: { type: String, trim: true, maxlength: 8000, default: '' },
      personalMission: { type: String, trim: true, maxlength: 1000, default: '' },
      values: [{ type: String, trim: true, maxlength: 40 }],
      strengths: [{ type: String, trim: true, maxlength: 40 }],
      growthAreas: [{ type: String, trim: true, maxlength: 40 }],
      workingStyle: {
        collaborationStyle: { type: String, trim: true, maxlength: 1200, default: '' },
        communicationStyle: { type: String, trim: true, maxlength: 1200, default: '' },
        feedbackStyle: { type: String, trim: true, maxlength: 1200, default: '' },
      },
      funFacts: [{ type: String, trim: true, maxlength: 120 }],
    },

    careerIntent: {
      targetRoles: [{ type: String, trim: true, maxlength: 60 }],
      targetRoleLevel: { type: String, trim: true, maxlength: 40, default: '' },
      industriesOfInterest: [{ type: String, trim: true, maxlength: 60 }],
      workPreferences: {
        workType: { type: String, trim: true, maxlength: 60, default: '' },
        remotePreference: { type: String, trim: true, maxlength: 60, default: '' },
        relocation: { type: String, trim: true, maxlength: 60, default: '' },
        travelWillingness: { type: String, trim: true, maxlength: 60, default: '' },
      },
      availability: {
        status: { type: String, trim: true, maxlength: 60, default: '' },
        startDate: { type: String, trim: true, maxlength: 40, default: '' },
      },
      compensation: {
        currency: { type: String, trim: true, maxlength: 8, default: '' },
        rangeMin: { type: Number, min: 0 },
        rangeMax: { type: Number, min: 0 },
        notes: { type: String, trim: true, maxlength: 400, default: '' },
      },
      visaWorkAuthorization: { type: String, trim: true, maxlength: 200, default: '' },
    },

    skills: {
      topSkills: [{ type: String, trim: true, maxlength: 40 }],
      secondarySkills: [{ type: String, trim: true, maxlength: 40 }],
      softSkills: [{ type: String, trim: true, maxlength: 40 }],
      toolsAndTech: {
        languages: [{ type: String, trim: true, maxlength: 40 }],
        frameworks: [{ type: String, trim: true, maxlength: 40 }],
        databases: [{ type: String, trim: true, maxlength: 40 }],
        cloudPlatforms: [{ type: String, trim: true, maxlength: 40 }],
        devopsTools: [{ type: String, trim: true, maxlength: 40 }],
        securityTools: [{ type: String, trim: true, maxlength: 40 }],
      },
    },

    experience: {
      work: [experienceSchema],
      volunteering: [experienceSchema],
      internships: [experienceSchema],
      freelance: [experienceSchema],
    },

    learning: {
      education: [datedItemSchema],
      certifications: [datedItemSchema],
      courses: [datedItemSchema],
      learningGoals: { type: String, trim: true, maxlength: 2000, default: '' },
    },

    links: {
      github: { type: String, trim: true, maxlength: 500, default: '' },
      linkedin: { type: String, trim: true, maxlength: 500, default: '' },
      website: { type: String, trim: true, maxlength: 500, default: '' },
      twitter: { type: String, trim: true, maxlength: 500, default: '' },
      youtube: { type: String, trim: true, maxlength: 500, default: '' },
      blog: { type: String, trim: true, maxlength: 500, default: '' },
      other: [linkSchema],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProfileDetails', profileDetailsSchema);
