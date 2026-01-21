import { JobApplication, AnalyzeJobResponse } from '@/types';

// Mock data for job applications
export const mockApplications: JobApplication[] = [
  {
    id: '1',
    dateAdded: '2024-01-15',
    companyName: 'Google',
    jobTitle: 'Senior Frontend Engineer',
    matchScore: 92,
    jobUrl: 'https://careers.google.com/jobs/1234',
    jobDescription: `About the job
We're looking for a Senior Frontend Engineer to join our team building the next generation of Google products. You'll work on complex web applications used by billions of users worldwide.

Responsibilities:
• Design and implement new features for Google's web applications
• Write high-quality, well-tested code
• Collaborate with UX designers, product managers, and backend engineers
• Mentor junior engineers and contribute to technical decisions
• Optimize application performance and user experience

Qualifications:
• 5+ years of experience with JavaScript/TypeScript
• Strong experience with React or similar frameworks
• Experience with modern CSS and responsive design
• Excellent problem-solving and communication skills
• BS/MS in Computer Science or equivalent experience`,
    tailoredResume: `# John Doe
**Senior Frontend Engineer**

## Summary
Experienced frontend engineer with 7+ years building scalable web applications. Specialized in React, TypeScript, and modern CSS frameworks.

## Experience

### Lead Frontend Developer | TechCorp Inc.
*2021 - Present*
- Led development of customer-facing dashboard serving 2M+ users
- Implemented performance optimizations reducing load time by 40%
- Mentored team of 5 junior developers

### Frontend Engineer | StartupXYZ
*2018 - 2021*
- Built React-based SPA from ground up
- Integrated with RESTful APIs and GraphQL endpoints
- Implemented responsive designs for mobile and desktop

## Skills
- **Languages:** TypeScript, JavaScript, HTML5, CSS3
- **Frameworks:** React, Next.js, Vue.js
- **Tools:** Git, Webpack, Vite, Jest, Cypress`,
    coverLetter: `Dear Hiring Manager,

I am excited to apply for the Senior Frontend Engineer position at Google. With over 7 years of experience building high-performance web applications, I am confident I would be a valuable addition to your team.

My experience at TechCorp Inc. directly aligns with this role's requirements. I've led frontend development for applications serving millions of users, optimized performance, and mentored junior engineers.

I am particularly drawn to Google's commitment to building products that impact billions of users. I would welcome the opportunity to discuss how my skills can contribute to your team.

Best regards,
John Doe`,
    status: 'analyzed',
  },
  {
    id: '2',
    dateAdded: '2024-01-14',
    companyName: 'Meta',
    jobTitle: 'React Developer',
    matchScore: 78,
    jobDescription: 'Looking for a React developer to join our Instagram team...',
    tailoredResume: '# Resume for Meta...',
    coverLetter: 'Dear Hiring Manager...',
    status: 'applied',
  },
  {
    id: '3',
    dateAdded: '2024-01-13',
    companyName: 'Stripe',
    jobTitle: 'Full Stack Engineer',
    matchScore: 85,
    jobDescription: 'Join Stripe to build the future of payments...',
    tailoredResume: '# Resume for Stripe...',
    coverLetter: 'Dear Hiring Manager...',
    status: 'interview',
  },
  {
    id: '4',
    dateAdded: '2024-01-12',
    companyName: 'Startup Inc',
    jobTitle: 'Junior Developer',
    matchScore: 45,
    jobDescription: 'Entry level position for web development...',
    status: 'pending',
  },
  {
    id: '5',
    dateAdded: '2024-01-11',
    companyName: 'Amazon',
    jobTitle: 'Software Development Engineer',
    matchScore: 88,
    jobDescription: 'AWS team looking for talented engineers...',
    tailoredResume: '# Resume for Amazon...',
    coverLetter: 'Dear Hiring Manager...',
    status: 'analyzed',
  },
];

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Functions
export async function getApplications(): Promise<JobApplication[]> {
  await delay(500);
  return mockApplications;
}

export async function getApplication(id: string): Promise<JobApplication | undefined> {
  await delay(300);
  return mockApplications.find(app => app.id === id);
}

export async function analyzeJobUrl(url: string): Promise<AnalyzeJobResponse> {
  await delay(2000); // Simulate AI processing
  return {
    companyName: 'TechCompany',
    jobTitle: 'Software Engineer',
    jobDescription: `About the Role
We are seeking a talented Software Engineer to join our growing team. You will be responsible for designing and implementing new features for our platform.

Requirements:
• 3+ years of software development experience
• Proficiency in JavaScript/TypeScript and React
• Experience with cloud services (AWS, GCP, or Azure)
• Strong communication and collaboration skills

Benefits:
• Competitive salary and equity
• Health, dental, and vision insurance
• Flexible work arrangements
• Professional development budget`,
    matchScore: Math.floor(Math.random() * 40) + 60,
    tailoredResume: `# Your Name
**Software Engineer**

## Summary
Experienced software engineer with expertise in modern web technologies...`,
    coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position...`,
  };
}

export async function analyzeJobDescription(description: string): Promise<AnalyzeJobResponse> {
  await delay(2000);
  // Extract company and title from description (mock logic)
  const lines = description.split('\n');
  return {
    companyName: 'Company Name',
    jobTitle: 'Position Title',
    jobDescription: description,
    matchScore: Math.floor(Math.random() * 40) + 60,
    tailoredResume: `# Your Name
**Position Title**

## Summary
Tailored resume based on the job description...`,
    coverLetter: `Dear Hiring Manager,

I am writing to express my interest...`,
  };
}

export async function saveApplication(application: Partial<JobApplication>): Promise<JobApplication> {
  await delay(500);
  const newApp: JobApplication = {
    id: Date.now().toString(),
    dateAdded: new Date().toISOString().split('T')[0],
    companyName: application.companyName || 'Unknown Company',
    jobTitle: application.jobTitle || 'Unknown Position',
    matchScore: application.matchScore || 0,
    jobDescription: application.jobDescription || '',
    tailoredResume: application.tailoredResume,
    coverLetter: application.coverLetter,
    jobUrl: application.jobUrl,
    status: 'analyzed',
  };
  mockApplications.unshift(newApp);
  return newApp;
}

export async function deleteApplication(id: string): Promise<void> {
  await delay(300);
  const index = mockApplications.findIndex(app => app.id === id);
  if (index > -1) {
    mockApplications.splice(index, 1);
  }
}

export async function regenerateContent(id: string): Promise<{ resume: string; coverLetter: string }> {
  await delay(1500);
  return {
    resume: `# Regenerated Resume
**Updated at ${new Date().toLocaleTimeString()}**

## Summary
This is a regenerated resume with fresh content...`,
    coverLetter: `Dear Hiring Manager,

This is a regenerated cover letter with updated content...`,
  };
}
