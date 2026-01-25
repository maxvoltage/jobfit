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
  applied: boolean;
}

export interface AnalyzeJobResponse {
  id?: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  matchScore: number;
  tailoredResume: string;
  coverLetter: string;
}
export interface Resume {
  id: number;
  name: string;
  content: string;
  is_selected: boolean;
}
export type FilterType = 'all' | 'high' | 'medium' | 'applied' | 'tbd';
