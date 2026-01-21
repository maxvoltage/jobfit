export interface JobApplication {
  id: string;
  dateAdded: string;
  companyName: string;
  jobTitle: string;
  matchScore: number;
  jobUrl?: string;
  jobDescription: string;
  tailoredResume?: string;
  coverLetter?: string;
  status: 'pending' | 'analyzed' | 'applied' | 'interview' | 'rejected';
}

export interface AnalyzeJobResponse {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  matchScore: number;
  tailoredResume: string;
  coverLetter: string;
}
